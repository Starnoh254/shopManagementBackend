const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const customerRoutes = require('./customerRoutes')

// Auth routes
router.use('/auth', authRoutes);

// Customer routes
router.use('/customer', customerRoutes)

module.exports = router;