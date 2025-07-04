const express = require('express');
const router = express.Router();
const DebtController = require('../controllers/debtController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes in this router
router.use(authMiddleware.authenticateToken);

// DEBT MANAGEMENT ROUTES
router.post('/add', DebtController.addDebt);                                    // Add debt to customer
router.get('/customer/:customerId', DebtController.getCustomerDebts);           // Get all debts for customer
router.get('/customer/:customerId/unpaid', DebtController.getCustomerUnpaidDebts); // Get unpaid debts for customer
router.get('/customers-with-debts', DebtController.getCustomersWithUnpaidDebts); // Get customers with unpaid debts
router.put('/:debtId/mark-paid', DebtController.markDebtAsPaid);                // Mark debt as paid
router.put('/:debtId', DebtController.updateDebt);                             // Update debt
router.delete('/:debtId', DebtController.deleteDebt);                          // Delete debt
router.get('/analytics', DebtController.getDebtAnalytics);                     // Get debt analytics

module.exports = router;
