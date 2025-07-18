const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes in this router
router.use(authMiddleware);

// PAYMENT MANAGEMENT ROUTES
router.post('/record', PaymentController.recordPayment);                        // Record a payment
router.post('/apply-credit/:customerId', PaymentController.applyCreditToDebts); // Apply credit to debts
router.get('/customer/:customerId', PaymentController.getCustomerPayments);     // Get all payments for customer
router.get('/customer/:customerId/debt-summary', PaymentController.getCustomerDebtSummary); // Get customer debt & payment summary
router.get('/debt/:debtId/history', PaymentController.getDebtPaymentHistory);   // Get debt payment history
router.get('/analytics/enhanced', PaymentController.getPaymentAnalyticsEnhanced); // Enhanced payment analytics
router.get('/analytics', PaymentController.getPaymentAnalytics);               // Get payment analytics
router.get('/:paymentId/details', PaymentController.getPaymentWithDebts);      // Get payment with debt details
router.get('/:paymentId', PaymentController.getPaymentById);                   // Get payment by ID
router.put('/:paymentId', PaymentController.updatePayment);                    // Update payment
router.delete('/:paymentId', PaymentController.deletePayment);                 // Delete payment

module.exports = router;
