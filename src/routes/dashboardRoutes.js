const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route   GET /api/dashboard
 * @desc    Get comprehensive dashboard overview
 * @access  Private
 */
router.get('/', dashboardController.getDashboardOverview);

/**
 * @route   GET /api/dashboard/business-overview
 * @desc    Get business overview with analytics
 * @access  Private
 * @query   { period?: "today" | "week" | "month" | "year" }
 */
router.get('/business-overview', dashboardController.getBusinessOverview);

module.exports = router;
