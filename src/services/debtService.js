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

    // Add debt to existing customer
    static async addDebt(data) {
        try {
            const { customerId, amount, description, dueDate, userId } = data;

            // Verify customer exists
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

            // Check for SMS notification
            const totalUnpaidDebt = await this.getTotalUnpaidDebt(customerId);
            if (totalUnpaidDebt >= this.DEBT_THRESHOLD) {
                try {
                    await sendSMS();
                } catch (smsError) {
                    console.log('SMS sending failed:', smsError.message);
                }
            }

            return debt;
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
