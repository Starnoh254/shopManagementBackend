const PaymentService = require('../services/paymentService');

/**
 * PAYMENT CONTROLLER MODULE
 * Handles ONLY payment-related HTTP requests
 * No customer or debt management logic here - delegates to payment service
 */
class PaymentController {

    // Record a payment
    static async recordPayment(req, res) {
        try {
            const { customerId, amount, paymentMethod, description, reference } = req.body;
            const { userId } = req.user;

            const result = await PaymentService.recordPayment({
                customerId,
                amount,
                paymentMethod,
                description,
                reference,
                userId
            });

            res.status(201).json({
                message: 'Payment recorded successfully',
                payment: result.payment,
                remainingPayment: result.remainingPayment
            });
        } catch (err) {
            if (err.message === 'Customer not found') {
                return res.status(404).json({ message: err.message });
            }
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Get all payments for a customer
    static async getCustomerPayments(req, res) {
        try {
            const { customerId } = req.params;
            const { userId } = req.user;

            const payments = await PaymentService.getCustomerPayments(parseInt(customerId), userId);
            const totalPayments = await PaymentService.getTotalCustomerPayments(parseInt(customerId));

            res.status(200).json({
                payments,
                totalPayments
            });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Get payment by ID
    static async getPaymentById(req, res) {
        try {
            const { paymentId } = req.params;
            const { userId } = req.user;

            const payment = await PaymentService.getPaymentById(parseInt(paymentId), userId);

            if (!payment) {
                return res.status(404).json({ message: 'Payment not found' });
            }

            res.status(200).json({ payment });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Update payment
    static async updatePayment(req, res) {
        try {
            const { paymentId } = req.params;
            const { amount, paymentMethod, description, reference } = req.body;
            const { userId } = req.user;

            const payment = await PaymentService.updatePayment(
                parseInt(paymentId),
                { amount, paymentMethod, description, reference },
                userId
            );

            res.status(200).json({
                message: 'Payment updated successfully',
                payment
            });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Delete payment
    static async deletePayment(req, res) {
        try {
            const { paymentId } = req.params;
            const { userId } = req.user;

            await PaymentService.deletePayment(parseInt(paymentId), userId);

            res.status(200).json({ message: 'Payment deleted successfully' });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Get payment analytics
    static async getPaymentAnalytics(req, res) {
        try {
            const { userId } = req.user;

            const analytics = await PaymentService.getPaymentAnalytics(userId);

            res.status(200).json({ analytics });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }
}

module.exports = PaymentController;
