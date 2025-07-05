const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * PAYMENT SERVICE MODULE
 * Handles ONLY payment-related operations
 * Works with debt service to mark debts as paid
 */
class PaymentService {

    // Record a payment with overpayment and credit balance handling
    static async recordPayment(data) {
        try {
            const { customerId, amount, paymentMethod, description, reference, userId } = data;

            // Verify customer exists and get current credit balance
            const customer = await prisma.customer.findFirst({
                where: {
                    id: customerId,
                    userId
                }
            });

            if (!customer) {
                throw new Error('Customer not found');
            }

            // Get unpaid debts for this customer (oldest first)
            const unpaidDebts = await prisma.debt.findMany({
                where: {
                    customerId,
                    isPaid: false
                },
                orderBy: { createdAt: 'asc' } // Pay oldest debts first
            });

            // Calculate total debt
            const totalDebt = unpaidDebts.reduce((sum, debt) => sum + debt.amount, 0);

            // Apply existing credit balance first
            const availableCredit = customer.creditBalance;
            let effectivePayment = amount + availableCredit;
            let appliedToDebt = Math.min(effectivePayment, totalDebt);
            let newCreditAmount = Math.max(0, effectivePayment - totalDebt);

            // Apply payment to debts (FIFO - First In, First Out)
            let remainingPaymentForDebt = appliedToDebt;

            for (const debt of unpaidDebts) {
                if (remainingPaymentForDebt <= 0) break;

                if (remainingPaymentForDebt >= debt.amount) {
                    // Payment covers this debt completely
                    await prisma.debt.update({
                        where: { id: debt.id },
                        data: {
                            isPaid: true,
                            updatedAt: new Date()
                        }
                    });
                    remainingPaymentForDebt -= debt.amount;
                } else {
                    // Payment partially covers this debt
                    await prisma.debt.update({
                        where: { id: debt.id },
                        data: {
                            amount: debt.amount - remainingPaymentForDebt,
                            updatedAt: new Date()
                        }
                    });
                    remainingPaymentForDebt = 0;
                }
            }

            // Update customer's credit balance
            await prisma.customer.update({
                where: { id: customerId },
                data: {
                    creditBalance: newCreditAmount,
                    updatedAt: new Date()
                }
            });

            // Create payment record (only actual money received)
            const payment = await prisma.payment.create({
                data: {
                    customerId,
                    userId,
                    amount, // Only the actual payment amount
                    paymentMethod: paymentMethod || 'CASH',
                    description: description || 'Payment received',
                    reference
                }
            });

            // If credit was used, create credit transaction
            if (availableCredit > 0 && appliedToDebt > amount) {
                await prisma.creditTransaction.create({
                    data: {
                        customerId,
                        userId,
                        amount: -Math.min(availableCredit, totalDebt), // Credit used
                        type: 'APPLIED_TO_DEBT',
                        description: 'Credit applied with payment',
                        relatedPaymentId: payment.id
                    }
                });
            }

            // If overpayment created new credit, create credit transaction
            if (newCreditAmount > availableCredit) {
                await prisma.creditTransaction.create({
                    data: {
                        customerId,
                        userId,
                        amount: newCreditAmount - availableCredit, // New credit added
                        type: 'OVERPAYMENT_ADDED',
                        description: 'Credit from overpayment',
                        relatedPaymentId: payment.id
                    }
                });
            }

            // Calculate remaining debts after payment
            const remainingDebts = await prisma.debt.findMany({
                where: {
                    customerId,
                    isPaid: false
                }
            });

            const remainingDebtAmount = remainingDebts.reduce((sum, debt) => sum + debt.amount, 0);

            return {
                success: true,
                message: 'Payment recorded successfully',
                payment,
                summary: {
                    totalPaid: amount,
                    appliedToDebt: Math.min(amount + availableCredit, totalDebt) - availableCredit,
                    creditAdded: Math.max(0, amount + availableCredit - totalDebt - availableCredit),
                    previousCredit: availableCredit,
                    newCreditBalance: newCreditAmount,
                    remainingDebt: remainingDebtAmount
                }
            };
        } catch (e) {
            throw e;
        }
    }

    // Get all payments for a customer
    static async getCustomerPayments(customerId, userId) {
        try {
            return await prisma.payment.findMany({
                where: {
                    customerId,
                    userId
                },
                orderBy: { createdAt: 'desc' }
            });
        } catch (e) {
            throw e;
        }
    }

    // Get total payments for a customer
    static async getTotalCustomerPayments(customerId) {
        try {
            const result = await prisma.payment.aggregate({
                where: { customerId },
                _sum: { amount: true }
            });

            return result._sum.amount || 0;
        } catch (e) {
            throw e;
        }
    }

    // Get payment by ID
    static async getPaymentById(paymentId, userId) {
        try {
            return await prisma.payment.findFirst({
                where: {
                    id: paymentId,
                    userId
                }
            });
        } catch (e) {
            throw e;
        }
    }

    // Update payment details
    static async updatePayment(paymentId, data, userId) {
        try {
            const { amount, paymentMethod, description, reference } = data;

            return await prisma.payment.update({
                where: {
                    id: paymentId,
                    userId
                },
                data: {
                    amount,
                    paymentMethod,
                    description,
                    reference
                }
            });
        } catch (e) {
            throw e;
        }
    }

    // Delete payment
    static async deletePayment(paymentId, userId) {
        try {
            return await prisma.payment.delete({
                where: {
                    id: paymentId,
                    userId
                }
            });
        } catch (e) {
            throw e;
        }
    }

    // Get payment analytics for user
    static async getPaymentAnalytics(userId) {
        try {
            const totalPayments = await prisma.payment.count({
                where: { userId }
            });

            const totalAmount = await prisma.payment.aggregate({
                where: { userId },
                _sum: { amount: true }
            });

            // Payments by method
            const paymentsByMethod = await prisma.payment.groupBy({
                by: ['paymentMethod'],
                where: { userId },
                _sum: { amount: true },
                _count: true
            });

            return {
                totalPayments,
                totalAmount: totalAmount._sum.amount || 0,
                paymentsByMethod
            };
        } catch (e) {
            throw e;
        }
    }

    // Apply credit balance to pay debts (without new payment)
    static async applyCreditToDebts(customerId, userId, creditAmount = null) {
        try {
            // Get customer with current credit balance
            const customer = await prisma.customer.findFirst({
                where: {
                    id: customerId,
                    userId
                }
            });

            if (!customer) {
                throw new Error('Customer not found');
            }

            if (customer.creditBalance <= 0) {
                throw new Error('Customer has no credit balance');
            }

            // Get unpaid debts (oldest first)
            const unpaidDebts = await prisma.debt.findMany({
                where: {
                    customerId,
                    isPaid: false
                },
                orderBy: { createdAt: 'asc' }
            });

            if (unpaidDebts.length === 0) {
                throw new Error('Customer has no unpaid debts');
            }

            // Calculate total debt
            const totalDebt = unpaidDebts.reduce((sum, debt) => sum + debt.amount, 0);

            // Determine how much credit to apply
            const creditToApply = creditAmount ?
                Math.min(creditAmount, customer.creditBalance, totalDebt) :
                Math.min(customer.creditBalance, totalDebt);

            // Apply credit to debts (FIFO)
            let remainingCredit = creditToApply;
            const paidDebts = [];

            for (const debt of unpaidDebts) {
                if (remainingCredit <= 0) break;

                if (remainingCredit >= debt.amount) {
                    // Credit covers this debt completely
                    await prisma.debt.update({
                        where: { id: debt.id },
                        data: {
                            isPaid: true,
                            updatedAt: new Date()
                        }
                    });
                    paidDebts.push({
                        debtId: debt.id,
                        amount: debt.amount,
                        description: debt.description
                    });
                    remainingCredit -= debt.amount;
                } else {
                    // Credit partially covers this debt
                    await prisma.debt.update({
                        where: { id: debt.id },
                        data: {
                            amount: debt.amount - remainingCredit,
                            updatedAt: new Date()
                        }
                    });
                    paidDebts.push({
                        debtId: debt.id,
                        amount: remainingCredit,
                        description: debt.description,
                        partial: true
                    });
                    remainingCredit = 0;
                }
            }

            // Update customer's credit balance
            const newCreditBalance = customer.creditBalance - creditToApply;
            await prisma.customer.update({
                where: { id: customerId },
                data: {
                    creditBalance: newCreditBalance,
                    updatedAt: new Date()
                }
            });

            // Create a payment record for tracking (credit application)
            const payment = await prisma.payment.create({
                data: {
                    customerId,
                    userId,
                    amount: 0, // No new money received
                    appliedToDebt: creditToApply,
                    creditAmount: -creditToApply, // Negative because credit was used
                    paymentMethod: 'OTHER',
                    description: 'Credit balance applied to debts',
                    reference: 'CREDIT_APPLICATION'
                }
            });

            // Get remaining debt after credit application
            const remainingDebts = await prisma.debt.findMany({
                where: {
                    customerId,
                    isPaid: false
                }
            });
            const remainingDebtAmount = remainingDebts.reduce((sum, debt) => sum + debt.amount, 0);

            return {
                success: true,
                message: 'Credit applied to debts successfully',
                payment,
                summary: {
                    creditApplied: creditToApply,
                    previousCreditBalance: customer.creditBalance,
                    newCreditBalance,
                    debtsPaid: paidDebts,
                    remainingDebt: remainingDebtAmount
                }
            };
        } catch (e) {
            throw e;
        }
    }
}

module.exports = PaymentService;
