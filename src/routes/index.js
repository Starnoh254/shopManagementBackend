const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const customerRoutes = require('./customerRoutes');
const debtRoutes = require('./debtRoutes');
const paymentRoutes = require('./paymentRoutes');
const productRoutes = require('./productRoutes');
const serviceRoutes = require('./serviceRoutes');
const salesRoutes = require('./salesRoutes');
const dashboardRoutes = require('./dashboardRoutes');

// Auth routes
router.use('/auth', authRoutes);

// Customer management routes (NO debt logic)
router.use('/customers', customerRoutes);

// Debt management routes (ONLY debt logic)
router.use('/debts', debtRoutes);

// Payment management routes (ONLY payment logic)
router.use('/payments', paymentRoutes);

// Product management routes (Sales system)
router.use('/products', productRoutes);

// Service management routes (Sales system)
router.use('/services', serviceRoutes);

// Sales transaction routes (Sales system)
router.use('/sales', salesRoutes);

// Dashboard and analytics routes
router.use('/dashboard', dashboardRoutes);

module.exports = router;