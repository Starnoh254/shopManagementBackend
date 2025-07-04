const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const customerRoutes = require('./customerRoutes');
const debtRoutes = require('./debtRoutes');
const paymentRoutes = require('./paymentRoutes');

// Auth routes
router.use('/auth', authRoutes);

// Customer management routes (NO debt logic)
router.use('/customers', customerRoutes);

// Debt management routes (ONLY debt logic)
router.use('/debts', debtRoutes);

// Payment management routes (ONLY payment logic)
router.use('/payments', paymentRoutes);

module.exports = router;