const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/customerController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes in this router
router.use(authMiddleware.authenticateToken);

// CUSTOMER MANAGEMENT ROUTES (NO debt logic here)
router.post('/create', CustomerController.createCustomer);        // Create new customer
router.get('/all', CustomerController.getAllCustomers);           // Get all customers
router.get('/search', CustomerController.searchCustomers);        // Search customers
router.get('/:customerId', CustomerController.getCustomerById);   // Get customer by ID
router.put('/:customerId', CustomerController.updateCustomer);    // Update customer
router.delete('/:customerId', CustomerController.deleteCustomer); // Delete customer

module.exports = router;