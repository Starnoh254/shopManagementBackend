const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes in this router
router.use(authMiddleware.authenticateToken);

// PAYMENT MANAGEMENT ROUTES
router.post('/record', PaymentController.recordPayment);                        // Record a payment
router.post('/apply-credit/:customerId', PaymentController.applyCreditToDebts); // Apply credit to debts
router.get('/customer/:customerId', PaymentController.getCustomerPayments);     // Get all payments for customer
router.get('/:paymentId', PaymentController.getPaymentById);                   // Get payment by ID
router.put('/:paymentId', PaymentController.updatePayment);                    // Update payment
router.delete('/:paymentId', PaymentController.deletePayment);                 // Delete payment
router.get('/analytics', PaymentController.getPaymentAnalytics);               // Get payment analytics

module.exports = router;
