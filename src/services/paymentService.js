const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * PAYMENT SERVICE MODULE
 * Handles ONLY payment-related operations
 * Works with debt service to mark debts as paid
 */
class PaymentService {

    // Record a payment
    static async recordPayment(data) {
        try {
            const { customerId, amount, paymentMethod, description, reference, userId } = data;

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

            // Create payment record
            const payment = await prisma.payment.create({
                data: {
                    customerId,
                    userId,
                    amount,
                    paymentMethod: paymentMethod || 'CASH',
                    description: description || 'Payment received',
                    reference
                }
            });

            // Get unpaid debts for this customer (oldest first)
            const unpaidDebts = await prisma.debt.findMany({
                where: {
                    customerId,
                    isPaid: false
                },
                orderBy: { createdAt: 'asc' } // Pay oldest debts first
            });

            // Apply payment to debts (FIFO - First In, First Out)
            let remainingPayment = amount;

            for (const debt of unpaidDebts) {
                if (remainingPayment <= 0) break;

                if (remainingPayment >= debt.amount) {
                    // Payment covers this debt completely
                    await prisma.debt.update({
                        where: { id: debt.id },
                        data: {
                            isPaid: true,
                            updatedAt: new Date()
                        }
                    });
                    remainingPayment -= debt.amount;
                } else {
                    // Payment partially covers this debt
                    // For now, we keep debt as unpaid but reduce amount
                    // (You might want different logic here)
                    await prisma.debt.update({
                        where: { id: debt.id },
                        data: {
                            amount: debt.amount - remainingPayment,
                            updatedAt: new Date()
                        }
                    });
                    remainingPayment = 0;
                }
            }

            return {
                payment,
                remainingPayment // Any overpayment
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
}

module.exports = PaymentService;
