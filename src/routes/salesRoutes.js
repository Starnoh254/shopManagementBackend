const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route   POST /api/sales
 * @desc    Create a new sale
 * @access  Private
 * @body    {
 *   customerId?: string,
 *   items?: Array<{productId: string, quantity: number, unitPrice?: number}>,
 *   services?: Array<{serviceId: string, quantity: number, unitPrice?: number}>,
 *   paymentMethod: string,
 *   paymentAmount: number,
 *   notes?: string
 * }
 */
router.post('/', salesController.createSale);

/**
 * @route   GET /api/sales/:id
 * @desc    Get sale by ID
 * @access  Private
 */
router.get('/:id', salesController.getSaleById);

/**
 * @route   GET /api/sales
 * @desc    Get sales history with filtering
 * @access  Private
 * @query   {
 *   customerId?: string,
 *   startDate?: string,
 *   endDate?: string,
 *   status?: string,
 *   paymentMethod?: string,
 *   page?: number,
 *   limit?: number
 * }
 */
router.get('/', salesController.getSalesHistory);

/**
 * @route   GET /api/sales/analytics/daily
 * @desc    Get daily sales summary
 * @access  Private
 * @query   { date?: string }
 */
router.get('/analytics/daily', salesController.getDailySalesSummary);

/**
 * @route   GET /api/sales/analytics/overview
 * @desc    Get sales analytics
 * @access  Private
 * @query   {
 *   startDate?: string,
 *   endDate?: string,
 *   groupBy?: string
 * }
 */
router.get('/analytics/overview', salesController.getSalesAnalytics);

/**
 * @route   GET /api/sales/analytics/profit-loss
 * @desc    Get profit/loss report
 * @access  Private
 * @query   {
 *   startDate?: string,
 *   endDate?: string,
 *   groupBy?: string
 * }
 */
router.get('/analytics/profit-loss', salesController.getProfitLossReport);

/**
 * @route   GET /api/sales/analytics/top-products
 * @desc    Get top selling products
 * @access  Private
 * @query   {
 *   startDate?: string,
 *   endDate?: string,
 *   limit?: number
 * }
 */
router.get('/analytics/top-products', salesController.getTopSellingProducts);

/**
 * @route   GET /api/sales/alerts/low-stock
 * @desc    Get low stock alerts
 * @access  Private
 */
router.get('/alerts/low-stock', salesController.getLowStockAlerts);

/**
 * @route   POST /api/sales/:saleId/payment
 * @desc    Process additional payment for a sale
 * @access  Private
 * @body    {
 *   paymentAmount: number,
 *   paymentMethod: string,
 *   notes?: string
 * }
 */
router.post('/:saleId/payment', salesController.processSalePayment);

module.exports = router;
