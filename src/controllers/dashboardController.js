const salesService = require('../services/salesService');
const productService = require('../services/productService');
const serviceService = require('../services/serviceService');
const logger = require('../utils/logger');

/**
 * Get comprehensive dashboard data
 */
const getDashboardOverview = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date();
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // Get today's sales summary
        const todaysSales = await salesService.getDailySalesSummary(today);

        // Get this month's sales analytics
        const monthlyAnalytics = await salesService.getSalesAnalytics({
            startDate: thisMonth,
            endDate: today,
            groupBy: 'month'
        });

        // Get recent sales (last 5)
        const recentSales = await salesService.getSalesHistory(userId, {
            page: 1,
            limit: 5
        });

        // Get top selling products today
        const topProductsToday = await salesService.getTopSellingProducts({
            startDate: today,
            endDate: today,
            limit: 5
        });

        // Get low stock alerts
        const stockAlerts = await salesService.getLowStockAlerts();

        // Get total counts
        const [totalProducts, totalServices] = await Promise.all([
            productService.getProductCount(userId),
            serviceService.getServiceCount(userId)
        ]);

        // Calculate growth (comparing with last month)
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

        const lastMonthAnalytics = await salesService.getSalesAnalytics({
            startDate: lastMonth,
            endDate: lastMonthEnd,
            groupBy: 'month'
        });

        const currentMonthRevenue = monthlyAnalytics.totals.totalRevenue;
        const lastMonthRevenue = lastMonthAnalytics.totals.totalRevenue;
        const growth = lastMonthRevenue > 0 ?
            ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;

        const dashboard = {
            todaysSales: {
                totalSales: todaysSales.summary.totalSales,
                revenue: todaysSales.summary.totalRevenue,
                profit: todaysSales.summary.totalProfit,
                profitMargin: todaysSales.summary.profitMargin
            },
            thisMonth: {
                revenue: currentMonthRevenue,
                profit: monthlyAnalytics.totals.totalProfit,
                growth: parseFloat(growth.toFixed(2))
            },
            quickStats: {
                totalProducts: totalProducts,
                totalServices: totalServices,
                lowStockItems: stockAlerts.totalAlerts,
                pendingOrders: 0 // TODO: Implement order tracking
            },
            recentSales: recentSales.sales.map(sale => ({
                id: sale.id,
                customerName: sale.customerName || 'Walk-in Customer',
                amount: sale.totalAmount,
                items: `${sale.itemCount} item(s)`,
                time: new Date(sale.createdAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit'
                })
            })),
            topSellingToday: topProductsToday.map(item => ({
                name: item.product.name,
                quantitySold: item.quantitySold,
                revenue: item.revenue
            })),
            stockAlerts: {
                total: stockAlerts.totalAlerts,
                critical: stockAlerts.criticalAlerts,
                warning: stockAlerts.warningAlerts
            }
        };

        res.json({
            success: true,
            dashboard
        });

    } catch (error) {
        logger.error('Error fetching dashboard overview:', error);
        res.status(500).json({
            error: 'Failed to fetch dashboard data',
            details: error.message
        });
    }
};

/**
 * Get business overview stats
 */
const getBusinessOverview = async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = 'month' } = req.query;

        let startDate, endDate;
        const now = new Date();

        switch (period) {
            case 'today':
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                endDate = now;
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = now;
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
        }

        const analytics = await salesService.getSalesAnalytics({
            startDate,
            endDate,
            groupBy: 'day'
        });

        const profitLoss = await salesService.getProfitLossReport({
            startDate,
            endDate,
            groupBy: 'day'
        });

        const topProducts = await salesService.getTopSellingProducts({
            startDate,
            endDate,
            limit: 10
        });

        res.json({
            success: true,
            period,
            overview: {
                salesMetrics: analytics.totals,
                profitLoss: profitLoss.summary,
                topProducts,
                trends: analytics.periods
            }
        });

    } catch (error) {
        logger.error('Error fetching business overview:', error);
        res.status(500).json({
            error: 'Failed to fetch business overview',
            details: error.message
        });
    }
};

module.exports = {
    getDashboardOverview,
    getBusinessOverview
};
