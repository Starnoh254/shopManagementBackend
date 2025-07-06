const salesService = require('../services/salesService');
const logger = require('../utils/logger');

/**
 * Create a new sale
 */
const createSale = async (req, res) => {
    try {
        const { customerId, items, services, paymentMethod, paymentAmount, notes } = req.body;
        const userId = req.user.id; // Get from auth middleware

        // Validate required fields
        if (!items && !services) {
            return res.status(400).json({
                error: 'At least one item or service must be provided'
            });
        }

        if (!paymentMethod || !paymentAmount) {
            return res.status(400).json({
                error: 'Payment method and amount are required'
            });
        }

        const saleData = {
            customerId,
            items: items || [],
            services: services || [],
            paymentMethod,
            paymentAmount: parseFloat(paymentAmount),
            notes,
            userId
        };

        const sale = await salesService.createSale(saleData);

        logger.info(`Sale created successfully: ${sale.id}`, {
            saleId: sale.id,
            customerId,
            totalAmount: sale.totalAmount,
            paymentMethod
        });

        res.status(201).json({
            message: 'Sale created successfully',
            sale
        });
    } catch (error) {
        logger.error('Error creating sale:', error);
        res.status(500).json({
            error: 'Failed to create sale',
            details: error.message
        });
    }
};

/**
 * Get sale by ID
 */
const getSaleById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const sale = await salesService.getSaleById(id, userId);

        if (!sale) {
            return res.status(404).json({
                error: 'Sale not found'
            });
        }

        res.json(sale);
    } catch (error) {
        logger.error('Error fetching sale:', error);
        res.status(500).json({
            error: 'Failed to fetch sale',
            details: error.message
        });
    }
};

/**
 * Get sales history with filtering
 */
const getSalesHistory = async (req, res) => {
    try {
        const {
            customerId,
            startDate,
            endDate,
            status,
            paymentMethod,
            page = 1,
            limit = 20
        } = req.query;
        const userId = req.user.id;

        const filters = {
            customerId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            status,
            paymentMethod,
            page: parseInt(page),
            limit: parseInt(limit)
        };

        const result = await salesService.getSalesHistory(userId, filters);

        res.json(result);
    } catch (error) {
        logger.error('Error fetching sales history:', error);
        res.status(500).json({
            error: 'Failed to fetch sales history',
            details: error.message
        });
    }
};

/**
 * Get daily sales summary
 */
const getDailySalesSummary = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();

        const summary = await salesService.getDailySalesSummary(targetDate);

        res.json(summary);
    } catch (error) {
        logger.error('Error fetching daily sales summary:', error);
        res.status(500).json({
            error: 'Failed to fetch daily sales summary',
            details: error.message
        });
    }
};

/**
 * Get sales analytics
 */
const getSalesAnalytics = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            groupBy = 'day'
        } = req.query;

        const analytics = await salesService.getSalesAnalytics({
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            groupBy
        });

        res.json(analytics);
    } catch (error) {
        logger.error('Error fetching sales analytics:', error);
        res.status(500).json({
            error: 'Failed to fetch sales analytics',
            details: error.message
        });
    }
};

/**
 * Get profit/loss report
 */
const getProfitLossReport = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            groupBy = 'day'
        } = req.query;

        const report = await salesService.getProfitLossReport({
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            groupBy
        });

        res.json(report);
    } catch (error) {
        logger.error('Error fetching profit/loss report:', error);
        res.status(500).json({
            error: 'Failed to fetch profit/loss report',
            details: error.message
        });
    }
};

/**
 * Get top selling products
 */
const getTopSellingProducts = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            limit = 10
        } = req.query;

        const topProducts = await salesService.getTopSellingProducts({
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit: parseInt(limit)
        });

        res.json(topProducts);
    } catch (error) {
        logger.error('Error fetching top selling products:', error);
        res.status(500).json({
            error: 'Failed to fetch top selling products',
            details: error.message
        });
    }
};

/**
 * Get low stock alerts
 */
const getLowStockAlerts = async (req, res) => {
    try {
        const alerts = await salesService.getLowStockAlerts();

        res.json(alerts);
    } catch (error) {
        logger.error('Error fetching low stock alerts:', error);
        res.status(500).json({
            error: 'Failed to fetch low stock alerts',
            details: error.message
        });
    }
};

/**
 * Process sale payment
 */
const processSalePayment = async (req, res) => {
    try {
        const { saleId } = req.params;
        const { paymentAmount, paymentMethod, notes } = req.body;

        if (!paymentAmount || !paymentMethod) {
            return res.status(400).json({
                error: 'Payment amount and method are required'
            });
        }

        const result = await salesService.processSalePayment({
            saleId,
            paymentAmount: parseFloat(paymentAmount),
            paymentMethod,
            notes
        });

        logger.info(`Payment processed for sale: ${saleId}`, {
            saleId,
            paymentAmount,
            paymentMethod
        });

        res.json({
            message: 'Payment processed successfully',
            result
        });
    } catch (error) {
        logger.error('Error processing sale payment:', error);
        res.status(500).json({
            error: 'Failed to process sale payment',
            details: error.message
        });
    }
};

module.exports = {
    createSale,
    getSaleById,
    getSalesHistory,
    getDailySalesSummary,
    getSalesAnalytics,
    getProfitLossReport,
    getTopSellingProducts,
    getLowStockAlerts,
    processSalePayment
};
