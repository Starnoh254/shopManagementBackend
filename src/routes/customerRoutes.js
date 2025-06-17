const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes in this router
router.use(authMiddleware.authenticateToken);

router.post('/add', customerController.addCustomer);
router.post('/deductDebt', customerController.deductDebt);
router.post('/addDebt', customerController.addDebt)
router.get('/getAllCustomers', customerController.getAllCustomers);
router.get('/getCustomersWithDebts', customerController.getCustomersWithDebts);

module.exports = router;