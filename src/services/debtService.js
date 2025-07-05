const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const sendSMS = require('../utils/sms');

/**
 * DEBT SERVICE MODULE  
 * Handles ONLY debt-related operations
 * No customer management logic here - pure debt management
 */
class DebtService {
    static DEBT_THRESHOLD = 200; // SMS notification threshold

    // Add debt to existing customer with automatic credit application
    static async addDebt(data) {
        try {
            const { customerId, amount, description, dueDate, userId } = data;

            // Verify customer exists and get credit balance
            const customer = await prisma.customer.findFirst({
                where: {
                    id: customerId,
                    userId
                }
            });

            if (!customer) {
                throw new Error('Customer not found');
            }

            // Create debt record
            const debt = await prisma.debt.create({
                data: {
                    customerId,
                    userId,
                    amount,
                    description: description || 'Debt added',
                    dueDate: dueDate ? new Date(dueDate) : null
                }
            });

            // Automatically apply available credit to the new debt
            let creditApplied = 0;
            let finalDebtAmount = amount;

            if (customer.creditBalance > 0) {
                creditApplied = Math.min(customer.creditBalance, amount);
                finalDebtAmount = amount - creditApplied;

                // Update debt amount if credit was applied
                if (creditApplied > 0) {
                    await prisma.debt.update({
                        where: { id: debt.id },
                        data: {
                            amount: finalDebtAmount,
                            isPaid: finalDebtAmount === 0,
                            updatedAt: new Date()
                        }
                    });

                    // Update customer's credit balance
                    await prisma.customer.update({
                        where: { id: customerId },
                        data: {
                            creditBalance: customer.creditBalance - creditApplied,
                            updatedAt: new Date()
                        }
                    });

                    // Create a credit transaction record (NOT a payment)
                    await prisma.creditTransaction.create({
                        data: {
                            customerId,
                            userId,
                            amount: -creditApplied, // Negative because credit was used
                            type: 'APPLIED_TO_DEBT',
                            description: `Auto-applied to new debt: ${description || 'Debt added'}`,
                            relatedDebtId: debt.id
                        }
                    });
                }
            }

            // Check for SMS notification (only if debt remains after credit application)
            if (finalDebtAmount > 0) {
                const totalUnpaidDebt = await this.getTotalUnpaidDebt(customerId);
                if (totalUnpaidDebt >= this.DEBT_THRESHOLD) {
                    try {
                        await sendSMS();
                    } catch (smsError) {
                        console.log('SMS sending failed:', smsError.message);
                    }
                }
            }

            // Return updated debt information
            const updatedDebt = await prisma.debt.findUnique({
                where: { id: debt.id }
            });

            return {
                success: true,
                message: creditApplied > 0 ?
                    `Debt added successfully. $${creditApplied} credit automatically applied.` :
                    'Debt added successfully',
                debt: updatedDebt,
                creditApplied,
                finalAmount: finalDebtAmount
            };
        } catch (e) {
            throw e;
        }
    }

    // Get all debts for a customer
    static async getCustomerDebts(customerId, userId) {
        try {
            return await prisma.debt.findMany({
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

    // Get all unpaid debts for a customer
    static async getCustomerUnpaidDebts(customerId, userId) {
        try {
            return await prisma.debt.findMany({
                where: {
                    customerId,
                    userId,
                    isPaid: false
                },
                orderBy: { createdAt: 'desc' }
            });
        } catch (e) {
            throw e;
        }
    }

    // Get total unpaid debt for a customer
    static async getTotalUnpaidDebt(customerId) {
        try {
            const result = await prisma.debt.aggregate({
                where: {
                    customerId,
                    isPaid: false
                },
                _sum: {
                    amount: true
                }
            });

            return result._sum.amount || 0;
        } catch (e) {
            throw e;
        }
    }

    // Mark debt as paid
    static async markDebtAsPaid(debtId, userId) {
        try {
            return await prisma.debt.update({
                where: {
                    id: debtId,
                    userId
                },
                data: {
                    isPaid: true,
                    updatedAt: new Date()
                }
            });
        } catch (e) {
            throw e;
        }
    }

    // Get all customers with unpaid debts
    static async getCustomersWithUnpaidDebts(userId) {
        try {
            return await prisma.customer.findMany({
                where: {
                    userId,
                    debts: {
                        some: {
                            isPaid: false
                        }
                    }
                },
                include: {
                    debts: {
                        where: { isPaid: false },
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });
        } catch (e) {
            throw e;
        }
    }

    // Update debt details
    static async updateDebt(debtId, data, userId) {
        try {
            const { amount, description, dueDate, isPaid } = data;

            return await prisma.debt.update({
                where: {
                    id: debtId,
                    userId
                },
                data: {
                    amount,
                    description,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    isPaid,
                    updatedAt: new Date()
                }
            });
        } catch (e) {
            throw e;
        }
    }

    // Delete debt
    static async deleteDebt(debtId, userId) {
        try {
            return await prisma.debt.delete({
                where: {
                    id: debtId,
                    userId
                }
            });
        } catch (e) {
            throw e;
        }
    }

    // Get debt analytics for user
    static async getDebtAnalytics(userId) {
        try {
            const totalDebts = await prisma.debt.count({
                where: { userId }
            });

            const unpaidDebts = await prisma.debt.count({
                where: {
                    userId,
                    isPaid: false
                }
            });

            const totalAmount = await prisma.debt.aggregate({
                where: { userId },
                _sum: { amount: true }
            });

            const unpaidAmount = await prisma.debt.aggregate({
                where: {
                    userId,
                    isPaid: false
                },
                _sum: { amount: true }
            });

            return {
                totalDebts,
                unpaidDebts,
                paidDebts: totalDebts - unpaidDebts,
                totalAmount: totalAmount._sum.amount || 0,
                unpaidAmount: unpaidAmount._sum.amount || 0,
                paidAmount: (totalAmount._sum.amount || 0) - (unpaidAmount._sum.amount || 0)
            };
        } catch (e) {
            throw e;
        }
    }
}

module.exports = DebtService;
