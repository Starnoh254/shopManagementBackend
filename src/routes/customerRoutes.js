const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/add', authMiddleware.authenticateToken, customerController.addCustomer);
router.post('/deductDebt', authMiddleware.authenticateToken, customerController.deductDebt);


module.exports = router;