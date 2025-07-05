const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/customerController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes in this router
router.use(authMiddleware.authenticateToken);

// CUSTOMER MANAGEMENT ROUTES (NO debt logic here)
router.post('/create', CustomerController.createCustomer);               // Create new customer
router.get('/all', CustomerController.getAllCustomers);                  // Get all customers
router.get('/with-balance', CustomerController.getAllCustomersWithBalance); // Get customers with balance info
router.get('/search', CustomerController.searchCustomers);               // Search customers
router.get('/:customerId', CustomerController.getCustomerById);          // Get customer by ID
router.get('/:customerId/balance', CustomerController.getCustomerWithBalance); // Get customer with balance
router.put('/:customerId', CustomerController.updateCustomer);           // Update customer
router.delete('/:customerId', CustomerController.deleteCustomer);        // Delete customer

module.exports = router;