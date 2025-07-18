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

            // Start transaction to ensure consistency
            return await prisma.$transaction(async (tx) => {
                // Verify customer exists and get current credit balance
                const customer = await tx.customer.findFirst({
                    where: {
                        id: customerId,
                        userId
                    }
                });

                if (!customer) {
                    throw new Error('Customer not found');
                }

                // Get unpaid debts for this customer (oldest first)
                const unpaidDebts = await tx.debt.findMany({
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

                // Create payment record first
                const payment = await tx.payment.create({
                    data: {
                        customerId,
                        userId,
                        amount, // Only the actual payment amount
                        appliedToDebt: appliedToDebt - availableCredit, // Amount from this payment applied to debt
                        creditAmount: newCreditAmount - availableCredit, // New credit added
                        paymentMethod: paymentMethod || 'CASH',
                        description: description || 'Payment received',
                        reference
                    }
                });

                // Apply payment to debts (FIFO - First In, First Out) and track allocations
                let remainingPaymentForDebt = appliedToDebt;
                const paymentAllocations = [];
                const paidDebts = [];

                for (const debt of unpaidDebts) {
                    if (remainingPaymentForDebt <= 0) break;

                    let amountToAllocate = Math.min(remainingPaymentForDebt, debt.amount);

                    // Create payment allocation record
                    const allocation = await tx.paymentAllocation.create({
                        data: {
                            paymentId: payment.id,
                            debtId: debt.id,
                            amount: amountToAllocate
                        }
                    });
                    paymentAllocations.push(allocation);

                    if (amountToAllocate >= debt.amount) {
                        // Payment covers this debt completely
                        await tx.debt.update({
                            where: { id: debt.id },
                            data: {
                                isPaid: true,
                                updatedAt: new Date()
                            }
                        });
                        paidDebts.push({
                            debtId: debt.id,
                            description: debt.description,
                            originalAmount: debt.originalAmount,
                            amountPaid: debt.amount,
                            fullyPaid: true
                        });
                        remainingPaymentForDebt -= debt.amount;
                    } else {
                        // Payment partially covers this debt
                        await tx.debt.update({
                            where: { id: debt.id },
                            data: {
                                amount: debt.amount - amountToAllocate,
                                updatedAt: new Date()
                            }
                        });
                        paidDebts.push({
                            debtId: debt.id,
                            description: debt.description,
                            originalAmount: debt.originalAmount,
                            amountPaid: amountToAllocate,
                            fullyPaid: false
                        });
                        remainingPaymentForDebt = 0;
                    }
                }

                // Update customer's credit balance
                await tx.customer.update({
                    where: { id: customerId },
                    data: {
                        creditBalance: newCreditAmount,
                        updatedAt: new Date()
                    }
                });

                // If credit was used, create credit transaction
                if (availableCredit > 0 && appliedToDebt > amount) {
                    await tx.creditTransaction.create({
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
                    await tx.creditTransaction.create({
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
                const remainingDebts = await tx.debt.findMany({
                    where: {
                        customerId,
                        isPaid: false
                    }
                });

                const remainingDebtAmount = remainingDebts.reduce((sum, debt) => sum + debt.amount, 0);

                return {
                    success: true,
                    message: 'Payment recorded successfully',
                    payment: {
                        ...payment,
                        allocations: paymentAllocations
                    },
                    summary: {
                        totalPaid: amount,
                        appliedToDebt: appliedToDebt - availableCredit,
                        creditUsed: availableCredit > 0 ? Math.min(availableCredit, totalDebt) : 0,
                        creditAdded: Math.max(0, newCreditAmount - availableCredit),
                        previousCredit: availableCredit,
                        newCreditBalance: newCreditAmount,
                        remainingDebt: remainingDebtAmount,
                        debtsPaid: paidDebts
                    }
                };
            });
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
            return await prisma.$transaction(async (tx) => {
                // Get customer with current credit balance
                const customer = await tx.customer.findFirst({
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
                const unpaidDebts = await tx.debt.findMany({
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

                // Create a payment record for tracking (credit application)
                const payment = await tx.payment.create({
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

                // Apply credit to debts (FIFO) and track allocations
                let remainingCredit = creditToApply;
                const paidDebts = [];
                const paymentAllocations = [];

                for (const debt of unpaidDebts) {
                    if (remainingCredit <= 0) {
                        break;
                    }

                    let amountToAllocate = Math.min(remainingCredit, debt.amount);

                    // Create payment allocation record
                    const allocation = await tx.paymentAllocation.create({
                        data: {
                            paymentId: payment.id,
                            debtId: debt.id,
                            amount: amountToAllocate
                        }
                    });
                    paymentAllocations.push(allocation);

                    if (remainingCredit >= debt.amount) {
                        // Credit covers this debt completely
                        await tx.debt.update({
                            where: { id: debt.id },
                            data: {
                                isPaid: true,
                                updatedAt: new Date()
                            }
                        });
                        paidDebts.push({
                            debtId: debt.id,
                            amount: debt.amount,
                            originalAmount: debt.originalAmount,
                            description: debt.description,
                            fullyPaid: true
                        });
                        remainingCredit -= debt.amount;
                    } else {
                        // Credit partially covers this debt
                        await tx.debt.update({
                            where: { id: debt.id },
                            data: {
                                amount: debt.amount - remainingCredit,
                                updatedAt: new Date()
                            }
                        });
                        paidDebts.push({
                            debtId: debt.id,
                            amount: remainingCredit,
                            originalAmount: debt.originalAmount,
                            description: debt.description,
                            partial: true,
                            fullyPaid: false
                        });
                        remainingCredit = 0;
                    }
                }

                // Update customer's credit balance
                const newCreditBalance = customer.creditBalance - creditToApply;
                await tx.customer.update({
                    where: { id: customerId },
                    data: {
                        creditBalance: newCreditBalance,
                        updatedAt: new Date()
                    }
                });

                // Create credit transaction
                await tx.creditTransaction.create({
                    data: {
                        customerId,
                        userId,
                        amount: -creditToApply, // Negative because credit was used
                        type: 'APPLIED_TO_DEBT',
                        description: 'Credit balance applied to debts',
                        relatedPaymentId: payment.id
                    }
                });

                // Get remaining debt after credit application
                const remainingDebts = await tx.debt.findMany({
                    where: {
                        customerId,
                        isPaid: false
                    }
                });
                const remainingDebtAmount = remainingDebts.reduce((sum, debt) => sum + debt.amount, 0);

                return {
                    success: true,
                    message: 'Credit applied to debts successfully',
                    payment: {
                        ...payment,
                        allocations: paymentAllocations
                    },
                    summary: {
                        creditApplied: creditToApply,
                        previousCreditBalance: customer.creditBalance,
                        newCreditBalance,
                        debtsPaid: paidDebts,
                        remainingDebt: remainingDebtAmount
                    }
                };
            });
        } catch (e) {
            throw e;
        }
    }

    // Get payment with detailed debt allocations
    static async getPaymentWithDebts(paymentId, userId) {
        try {
            return await prisma.payment.findFirst({
                where: {
                    id: paymentId,
                    userId
                },
                include: {
                    allocations: {
                        include: {
                            debt: {
                                select: {
                                    id: true,
                                    description: true,
                                    amount: true,
                                    originalAmount: true,
                                    createdAt: true,
                                    isPaid: true
                                }
                            }
                        },
                        orderBy: { allocatedAt: 'asc' }
                    },
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true
                        }
                    },
                    creditTransactions: true
                }
            });
        } catch (e) {
            throw e;
        }
    }

    // Get debt with payment history and percentage paid
    static async getDebtPaymentHistory(debtId, userId) {
        try {
            const debt = await prisma.debt.findFirst({
                where: {
                    id: debtId,
                    userId
                },
                include: {
                    paymentAllocations: {
                        include: {
                            payment: {
                                select: {
                                    id: true,
                                    amount: true,
                                    paymentMethod: true,
                                    description: true,
                                    reference: true,
                                    createdAt: true
                                }
                            }
                        },
                        orderBy: { allocatedAt: 'desc' }
                    },
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true
                        }
                    }
                }
            });

            if (!debt) {
                throw new Error('Debt not found');
            }

            // Calculate payment statistics
            const totalPaid = debt.paymentAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
            const percentagePaid = debt.originalAmount > 0 ? (totalPaid / debt.originalAmount * 100) : 0;
            const remainingAmount = debt.amount;

            return {
                success: true,
                debt: {
                    ...debt,
                    paymentSummary: {
                        originalAmount: debt.originalAmount,
                        totalPaid,
                        remainingAmount,
                        percentagePaid: Math.round(percentagePaid * 100) / 100,
                        isFullyPaid: debt.isPaid,
                        numberOfPayments: debt.paymentAllocations.length
                    }
                }
            };
        } catch (e) {
            throw e;
        }
    }

    // Get customer's debt and payment summary
    static async getCustomerDebtSummary(customerId, userId) {
        try {
            const customer = await prisma.customer.findFirst({
                where: {
                    id: customerId,
                    userId
                },
                include: {
                    debts: {
                        include: {
                            paymentAllocations: {
                                select: {
                                    amount: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    },
                    payments: {
                        orderBy: { createdAt: 'desc' },
                        take: 10 // Latest 10 payments
                    }
                }
            });

            if (!customer) {
                throw new Error('Customer not found');
            }

            // Calculate debt statistics
            const allDebts = customer.debts;
            const unpaidDebts = allDebts.filter(debt => !debt.isPaid);
            const paidDebts = allDebts.filter(debt => debt.isPaid);

            const totalOriginalDebt = allDebts.reduce((sum, debt) => sum + debt.originalAmount, 0);
            const totalRemainingDebt = unpaidDebts.reduce((sum, debt) => sum + debt.amount, 0);
            const totalPaidAmount = allDebts.reduce((sum, debt) => {
                const paidOnThisDebt = debt.paymentAllocations.reduce((paidSum, allocation) => paidSum + allocation.amount, 0);
                return sum + paidOnThisDebt;
            }, 0);

            const overallPercentagePaid = totalOriginalDebt > 0 ? (totalPaidAmount / totalOriginalDebt * 100) : 0;

            // Prepare detailed debt list with payment percentages
            const debtsWithPercentages = allDebts.map(debt => {
                const totalPaidOnDebt = debt.paymentAllocations.reduce((sum, allocation) => sum + allocation.amount, 0);
                const percentagePaid = debt.originalAmount > 0 ? (totalPaidOnDebt / debt.originalAmount * 100) : 0;

                return {
                    id: debt.id,
                    description: debt.description,
                    originalAmount: debt.originalAmount,
                    remainingAmount: debt.amount,
                    totalPaid: totalPaidOnDebt,
                    percentagePaid: Math.round(percentagePaid * 100) / 100,
                    isPaid: debt.isPaid,
                    createdAt: debt.createdAt,
                    dueDate: debt.dueDate
                };
            });

            return {
                success: true,
                customer: {
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone,
                    creditBalance: customer.creditBalance
                },
                debtSummary: {
                    totalDebts: allDebts.length,
                    unpaidDebts: unpaidDebts.length,
                    paidDebts: paidDebts.length,
                    totalOriginalDebt,
                    totalRemainingDebt,
                    totalPaidAmount,
                    overallPercentagePaid: Math.round(overallPercentagePaid * 100) / 100,
                    creditBalance: customer.creditBalance
                },
                debts: debtsWithPercentages,
                recentPayments: customer.payments
            };
        } catch (e) {
            throw e;
        }
    }

    // Get payment analytics with debt tracking
    static async getPaymentAnalyticsEnhanced(userId, filters = {}) {
        try {
            const { startDate, endDate, customerId } = filters;

            // Build where clause
            const where = { userId };
            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) where.createdAt.gte = new Date(startDate);
                if (endDate) where.createdAt.lte = new Date(endDate);
            }
            if (customerId) where.customerId = parseInt(customerId);

            // Get payments with allocations
            const payments = await prisma.payment.findMany({
                where,
                include: {
                    allocations: {
                        include: {
                            debt: {
                                select: {
                                    description: true,
                                    originalAmount: true
                                }
                            }
                        }
                    },
                    customer: {
                        select: {
                            name: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Calculate analytics
            const totalPayments = payments.length;
            const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
            const totalAppliedToDebt = payments.reduce((sum, payment) => sum + payment.appliedToDebt, 0);
            const totalCreditAdded = payments.reduce((sum, payment) => sum + payment.creditAmount, 0);

            // Payment method breakdown
            const paymentsByMethod = payments.reduce((acc, payment) => {
                const method = payment.paymentMethod;
                if (!acc[method]) {
                    acc[method] = { count: 0, amount: 0 };
                }
                acc[method].count++;
                acc[method].amount += payment.amount;
                return acc;
            }, {});

            // Debt payment effectiveness
            const totalDebtsAffected = new Set(
                payments.flatMap(payment =>
                    payment.allocations.map(allocation => allocation.debtId)
                )
            ).size;

            return {
                success: true,
                analytics: {
                    totalPayments,
                    totalAmount,
                    totalAppliedToDebt,
                    totalCreditAdded,
                    averagePayment: totalPayments > 0 ? totalAmount / totalPayments : 0,
                    debtPaymentEffectiveness: {
                        totalDebtsAffected,
                        averageDebtsPerPayment: totalPayments > 0 ? totalDebtsAffected / totalPayments : 0
                    },
                    paymentsByMethod
                },
                payments: payments.map(payment => ({
                    id: payment.id,
                    amount: payment.amount,
                    appliedToDebt: payment.appliedToDebt,
                    creditAmount: payment.creditAmount,
                    paymentMethod: payment.paymentMethod,
                    customerName: payment.customer?.name || 'Unknown',
                    debtsAffected: payment.allocations.length,
                    allocations: payment.allocations.map(allocation => ({
                        debtDescription: allocation.debt.description,
                        amount: allocation.amount,
                        debtOriginalAmount: allocation.debt.originalAmount
                    })),
                    createdAt: payment.createdAt
                }))
            };
        } catch (e) {
            throw e;
        }
    }
}

module.exports = PaymentService;
