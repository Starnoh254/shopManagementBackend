const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ProductService = require('./productService');
const ServiceService = require('./serviceService');

/**
 * SALES SERVICE MODULE
 * Handles sales transaction processing
 * Integrates products, services, inventory, and payments
 */
class SalesService {

    // Create a new sale transaction
    static async createSale(data) {
        try {
            const {
                customerId,
                items,
                saleType = 'CASH',
                discountAmount = 0,
                taxAmount = 0,
                paymentAmount,
                paymentMethod = 'CASH',
                notes,
                userId
            } = data;

            // Validate items
            if (!items || items.length === 0) {
                throw new Error('At least one item is required');
            }

            // Validate customer if provided
            if (customerId) {
                const customer = await prisma.customer.findFirst({
                    where: { id: customerId, userId }
                });
                if (!customer) {
                    throw new Error('Customer not found');
                }
            }

            // Process sale in transaction
            const result = await prisma.$transaction(async (tx) => {
                // Calculate totals and validate items
                let subtotal = 0;
                const processedItems = [];
                const inventoryUpdates = [];
                const materialDeductions = [];

                for (const item of items) {
                    let processedItem;

                    if (item.type === 'PRODUCT') {
                        processedItem = await this.processProductItem(item, userId, tx);
                    } else if (item.type === 'SERVICE') {
                        processedItem = await this.processServiceItem(item, userId, tx);
                    } else {
                        throw new Error(`Invalid item type: ${item.type}`);
                    }

                    processedItems.push(processedItem);
                    subtotal += processedItem.totalPrice;

                    // Track inventory updates
                    if (processedItem.inventoryUpdate) {
                        inventoryUpdates.push(processedItem.inventoryUpdate);
                    }
                    if (processedItem.materialDeductions) {
                        materialDeductions.push(...processedItem.materialDeductions);
                    }
                }

                // Calculate final totals
                const totalAmount = subtotal - discountAmount + taxAmount;
                const totalCost = processedItems.reduce((sum, item) => sum + item.totalCost, 0);
                const totalProfit = totalAmount - totalCost;

                // Generate sale number
                const saleNumber = await this.generateSaleNumber(userId, tx);

                // Create sale record
                const sale = await tx.sale.create({
                    data: {
                        saleNumber,
                        customerId,
                        userId,
                        subtotal,
                        discountAmount,
                        taxAmount,
                        totalAmount,
                        totalCost,
                        totalProfit,
                        saleType,
                        status: 'COMPLETED',
                        notes
                    }
                });

                // Create sale items
                for (const item of processedItems) {
                    await tx.saleItem.create({
                        data: {
                            saleId: sale.id,
                            itemType: item.type,
                            productId: item.type === 'PRODUCT' ? item.id : null,
                            serviceId: item.type === 'SERVICE' ? item.id : null,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice,
                            unitCost: item.unitCost,
                            totalCost: item.totalCost,
                            profit: item.profit,
                            scheduledFor: item.scheduledFor,
                            isCompleted: item.type === 'PRODUCT' // Products are immediately completed
                        }
                    });
                }

                // Handle payment based on sale type
                let paymentRecord = null;
                let debtRecord = null;

                if (saleType === 'CASH') {
                    // Create payment record
                    paymentRecord = await tx.payment.create({
                        data: {
                            customerId,
                            userId,
                            amount: totalAmount,
                            appliedToDebt: totalAmount,
                            paymentMethod,
                            description: `Payment for sale ${saleNumber}`,
                            saleId: sale.id
                        }
                    });
                } else if (saleType === 'CREDIT') {
                    // Create debt record
                    debtRecord = await tx.debt.create({
                        data: {
                            customerId,
                            userId,
                            amount: totalAmount,
                            originalAmount: totalAmount, // Track original debt amount
                            description: `Credit sale ${saleNumber}`,
                            saleId: sale.id
                        }
                    });
                } else if (saleType === 'PARTIAL_PAYMENT') {
                    if (!paymentAmount || paymentAmount <= 0) {
                        throw new Error('Payment amount is required for partial payments');
                    }

                    // Create payment record
                    paymentRecord = await tx.payment.create({
                        data: {
                            customerId,
                            userId,
                            amount: paymentAmount,
                            appliedToDebt: paymentAmount,
                            paymentMethod,
                            description: `Partial payment for sale ${saleNumber}`,
                            saleId: sale.id
                        }
                    });

                    // Create debt for remaining amount
                    const remainingAmount = totalAmount - paymentAmount;
                    if (remainingAmount > 0) {
                        debtRecord = await tx.debt.create({
                            data: {
                                customerId,
                                userId,
                                amount: remainingAmount,
                                originalAmount: remainingAmount, // Track original debt amount
                                description: `Remaining balance for sale ${saleNumber}`,
                                saleId: sale.id
                            }
                        });
                    }
                }

                return {
                    sale,
                    processedItems,
                    inventoryUpdates,
                    materialDeductions,
                    paymentRecord,
                    debtRecord
                };
            });

            // Prepare response
            const profitMargin = result.sale.totalAmount > 0 ?
                (result.sale.totalProfit / result.sale.totalAmount * 100) : 0;

            return {
                success: true,
                message: 'Sale recorded successfully',
                sale: {
                    id: result.sale.id,
                    saleNumber: result.sale.saleNumber,
                    customerId: result.sale.customerId,
                    customerName: customerId ? await this.getCustomerName(customerId) : 'Walk-in Customer',
                    saleType: result.sale.saleType,
                    status: result.sale.status,
                    items: result.processedItems.map(item => ({
                        id: item.id,
                        type: item.type,
                        name: item.name,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        profit: item.profit,
                        scheduledFor: item.scheduledFor
                    })),
                    subtotal: result.sale.subtotal,
                    discountAmount: result.sale.discountAmount,
                    taxAmount: result.sale.taxAmount,
                    totalAmount: result.sale.totalAmount,
                    totalProfit: result.sale.totalProfit,
                    profitMargin,
                    paymentReceived: result.paymentRecord?.amount || 0,
                    amountDue: result.debtRecord?.amount || 0,
                    createdAt: result.sale.createdAt
                },
                inventoryUpdates: result.inventoryUpdates,
                materialDeductions: result.materialDeductions
            };

        } catch (error) {
            throw error;
        }
    }

    // Process a product item in the sale
    static async processProductItem(item, userId, tx) {
        const { id, quantity, unitPrice } = item;

        // Get product details
        const product = await tx.product.findFirst({
            where: { id, userId },
            include: { inventoryItems: true }
        });

        if (!product) {
            throw new Error(`Product with ID ${id} not found`);
        }

        // Check inventory if tracking is enabled
        let inventoryUpdate = null;
        if (product.trackInventory) {
            const inventory = product.inventoryItems[0];
            if (!inventory || inventory.quantity < quantity) {
                throw new Error(`Insufficient stock for ${product.name}. Available: ${inventory?.quantity || 0}, Required: ${quantity}`);
            }

            // Update inventory
            const newQuantity = inventory.quantity - quantity;
            await tx.inventoryItem.update({
                where: { id: inventory.id },
                data: { quantity: newQuantity }
            });

            inventoryUpdate = {
                productId: id,
                previousStock: inventory.quantity,
                newStock: newQuantity,
                quantitySold: quantity
            };
        }

        // Calculate pricing
        const finalUnitPrice = unitPrice || product.sellingPrice;
        const totalPrice = quantity * finalUnitPrice;
        const unitCost = product.costPrice || 0;
        const totalCost = quantity * unitCost;
        const profit = totalPrice - totalCost;

        return {
            id,
            type: 'PRODUCT',
            name: product.name,
            quantity,
            unitPrice: finalUnitPrice,
            totalPrice,
            unitCost,
            totalCost,
            profit,
            inventoryUpdate
        };
    }

    // Process a service item in the sale
    static async processServiceItem(item, userId, tx) {
        const { id, quantity, unitPrice, scheduledFor } = item;

        // Get service details
        const service = await tx.service.findFirst({
            where: { id, userId },
            include: {
                serviceMaterials: {
                    include: {
                        product: {
                            include: { inventoryItems: true }
                        }
                    }
                }
            }
        });

        if (!service) {
            throw new Error(`Service with ID ${id} not found`);
        }

        if (!service.isActive) {
            throw new Error(`Service ${service.name} is currently inactive`);
        }

        // Check and deduct materials if required
        let materialDeductions = [];
        if (service.requiresMaterials) {
            for (const sm of service.serviceMaterials) {
                if (sm.product.trackInventory) {
                    const inventory = sm.product.inventoryItems[0];
                    const requiredQuantity = sm.quantity * quantity;

                    if (!inventory || inventory.quantity < requiredQuantity) {
                        throw new Error(`Insufficient materials for ${service.name}. ${sm.product.name}: Available ${inventory?.quantity || 0}, Required: ${requiredQuantity}`);
                    }

                    // Deduct materials
                    const newQuantity = inventory.quantity - requiredQuantity;
                    await tx.inventoryItem.update({
                        where: { id: inventory.id },
                        data: { quantity: newQuantity }
                    });

                    materialDeductions.push({
                        productId: sm.productId,
                        productName: sm.product.name,
                        quantityUsed: requiredQuantity,
                        previousStock: inventory.quantity,
                        newStock: newQuantity
                    });
                }
            }
        }

        // Calculate pricing
        const finalUnitPrice = unitPrice || service.price;
        const totalPrice = quantity * finalUnitPrice;
        const unitCost = service.costEstimate || 0;
        const totalCost = quantity * unitCost;
        const profit = totalPrice - totalCost;

        return {
            id,
            type: 'SERVICE',
            name: service.name,
            quantity,
            unitPrice: finalUnitPrice,
            totalPrice,
            unitCost,
            totalCost,
            profit,
            scheduledFor,
            materialDeductions
        };
    }

    // Generate unique sale number
    static async generateSaleNumber(userId, tx) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');

        // Count today's sales for this user
        const startOfDay = new Date(year, today.getMonth(), today.getDate());
        const endOfDay = new Date(year, today.getMonth(), today.getDate() + 1);

        const salesCount = await tx.sale.count({
            where: {
                userId,
                createdAt: {
                    gte: startOfDay,
                    lt: endOfDay
                }
            }
        });

        const sequence = String(salesCount + 1).padStart(3, '0');
        return `SALE-${year}${month}${day}-${sequence}`;
    }

    // Get customer name helper
    static async getCustomerName(customerId) {
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: { name: true }
        });
        return customer?.name || 'Unknown Customer';
    }

    // Get sales history with filtering
    static async getSalesHistory(userId, filters = {}) {
        try {
            const {
                startDate,
                endDate,
                customerId,
                saleType,
                status,
                page = 1,
                limit = 20
            } = filters;

            // Build where clause
            const where = { userId };

            if (startDate) {
                where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
            }
            if (endDate) {
                where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
            }
            if (customerId) {
                where.customerId = parseInt(customerId);
            }
            if (saleType) {
                where.saleType = saleType;
            }
            if (status) {
                where.status = status;
            }

            // Get total count
            const totalItems = await prisma.sale.count({ where });
            const totalPages = Math.ceil(totalItems / limit);
            const offset = (page - 1) * limit;

            // Get sales
            const sales = await prisma.sale.findMany({
                where,
                include: {
                    customer: { select: { name: true } },
                    saleItems: { select: { id: true } }
                },
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit
            });

            // Calculate summary statistics
            const summary = await this.calculateSalesSummary(where);

            return {
                success: true,
                sales: sales.map(sale => ({
                    id: sale.id,
                    saleNumber: sale.saleNumber,
                    customerName: sale.customer?.name || 'Walk-in Customer',
                    totalAmount: sale.totalAmount,
                    totalProfit: sale.totalProfit,
                    profitMargin: sale.totalAmount > 0 ? (sale.totalProfit / sale.totalAmount * 100) : 0,
                    itemCount: sale.saleItems.length,
                    saleType: sale.saleType,
                    status: sale.status,
                    createdAt: sale.createdAt
                })),
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems,
                    itemsPerPage: limit
                },
                summary
            };

        } catch (error) {
            throw error;
        }
    }

    // Calculate sales summary
    static async calculateSalesSummary(where) {
        const result = await prisma.sale.aggregate({
            where,
            _count: { id: true },
            _sum: {
                totalAmount: true,
                totalProfit: true
            },
            _avg: {
                totalAmount: true
            }
        });

        return {
            totalSales: result._count.id,
            totalRevenue: result._sum.totalAmount || 0,
            totalProfit: result._sum.totalProfit || 0,
            averageOrderValue: result._avg.totalAmount || 0
        };
    }

    // Get sale details by ID
    static async getSaleById(saleId, userId) {
        try {
            const sale = await prisma.sale.findFirst({
                where: { id: saleId, userId },
                include: {
                    customer: { select: { name: true, phone: true } },
                    saleItems: {
                        include: {
                            product: { select: { name: true, unit: true } },
                            service: { select: { name: true, duration: true } }
                        }
                    },
                    payments: true,
                    debts: { where: { isPaid: false } }
                }
            });

            if (!sale) {
                throw new Error('Sale not found');
            }

            return {
                success: true,
                sale: {
                    ...sale,
                    customerName: sale.customer?.name || 'Walk-in Customer',
                    items: sale.saleItems.map(item => ({
                        id: item.id,
                        type: item.itemType,
                        name: item.product?.name || item.service?.name,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        profit: item.profit,
                        unit: item.product?.unit,
                        duration: item.service?.duration,
                        scheduledFor: item.scheduledFor,
                        isCompleted: item.isCompleted
                    })),
                    profitMargin: sale.totalAmount > 0 ? (sale.totalProfit / sale.totalAmount * 100) : 0
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Get daily sales summary
    static async getDailySalesSummary(date = new Date()) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const where = {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                status: {
                    not: 'CANCELLED'
                }
            };

            const summary = await this.calculateSalesSummary(where);

            // Get hourly breakdown
            const hourlyBreakdown = await prisma.sale.groupBy({
                by: ['createdAt'],
                where,
                _sum: {
                    totalAmount: true,
                    totalProfit: true
                },
                _count: {
                    id: true
                }
            });

            // Process hourly data
            const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
                hour,
                sales: 0,
                revenue: 0,
                profit: 0
            }));

            hourlyBreakdown.forEach(item => {
                const hour = new Date(item.createdAt).getHours();
                hourlyData[hour].sales += item._count.id;
                hourlyData[hour].revenue += item._sum.totalAmount || 0;
                hourlyData[hour].profit += item._sum.totalProfit || 0;
            });

            return {
                date: date.toISOString().split('T')[0],
                summary,
                hourlyBreakdown: hourlyData
            };

        } catch (error) {
            throw error;
        }
    }

    // Get sales analytics with grouping
    static async getSalesAnalytics({ startDate, endDate, groupBy = 'day' }) {
        try {
            const where = {
                status: {
                    not: 'CANCELLED'
                }
            };

            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) {
                    where.createdAt.gte = startDate;
                }
                if (endDate) {
                    where.createdAt.lte = endDate;
                }
            }

            const sales = await prisma.sale.findMany({
                where,
                select: {
                    id: true,
                    totalAmount: true,
                    totalProfit: true,
                    createdAt: true,
                    status: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });

            // Group sales by specified period
            const grouped = sales.reduce((acc, sale) => {
                let key;
                const date = new Date(sale.createdAt);

                switch (groupBy) {
                    case 'hour':
                        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
                        break;
                    case 'day':
                        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
                        break;
                    case 'week':
                        const weekStart = new Date(date);
                        weekStart.setDate(date.getDate() - date.getDay());
                        key = `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getDate()) / 7)}`;
                        break;
                    case 'month':
                        key = `${date.getFullYear()}-${date.getMonth() + 1}`;
                        break;
                    case 'year':
                        key = `${date.getFullYear()}`;
                        break;
                    default:
                        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
                }

                if (!acc[key]) {
                    acc[key] = {
                        period: key,
                        salesCount: 0,
                        totalRevenue: 0,
                        totalProfit: 0,
                        averageOrderValue: 0
                    };
                }

                acc[key].salesCount++;
                acc[key].totalRevenue += sale.totalAmount;
                acc[key].totalProfit += sale.totalProfit;

                return acc;
            }, {});

            // Calculate averages and format response
            const analytics = Object.values(grouped).map(period => ({
                ...period,
                averageOrderValue: period.salesCount > 0 ? period.totalRevenue / period.salesCount : 0,
                profitMargin: period.totalRevenue > 0 ? (period.totalProfit / period.totalRevenue * 100) : 0
            }));

            return {
                groupBy,
                periods: analytics,
                totals: {
                    salesCount: sales.length,
                    totalRevenue: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
                    totalProfit: sales.reduce((sum, sale) => sum + sale.totalProfit, 0),
                    averageOrderValue: sales.length > 0 ? sales.reduce((sum, sale) => sum + sale.totalAmount, 0) / sales.length : 0
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Get profit/loss report
    static async getProfitLossReport({ startDate, endDate, groupBy = 'day' }) {
        try {
            const analytics = await this.getSalesAnalytics({ startDate, endDate, groupBy });

            // Add expense tracking (for now just show profit as we don't have expense tracking yet)
            const profitLossData = analytics.periods.map(period => ({
                ...period,
                expenses: 0, // TODO: Implement expense tracking
                netProfit: period.totalProfit,
                roi: period.totalRevenue > 0 ? (period.totalProfit / period.totalRevenue * 100) : 0
            }));

            return {
                groupBy,
                periods: profitLossData,
                summary: {
                    totalRevenue: analytics.totals.totalRevenue,
                    totalProfit: analytics.totals.totalProfit,
                    totalExpenses: 0, // TODO: Implement expense tracking
                    netProfit: analytics.totals.totalProfit,
                    profitMargin: analytics.totals.totalRevenue > 0 ?
                        (analytics.totals.totalProfit / analytics.totals.totalRevenue * 100) : 0
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Get top selling products
    static async getTopSellingProducts({ startDate, endDate, limit = 10 }) {
        try {
            const where = {
                sale: {
                    status: {
                        not: 'CANCELLED'
                    }
                }
            };

            if (startDate || endDate) {
                where.sale.createdAt = {};
                if (startDate) {
                    where.sale.createdAt.gte = startDate;
                }
                if (endDate) {
                    where.sale.createdAt.lte = endDate;
                }
            }

            const topProducts = await prisma.saleItem.groupBy({
                by: ['productId'],
                where: {
                    ...where,
                    productId: {
                        not: null
                    }
                },
                _sum: {
                    quantity: true,
                    totalPrice: true,
                    profit: true
                },
                _count: {
                    id: true
                },
                orderBy: {
                    _sum: {
                        quantity: 'desc'
                    }
                },
                take: limit
            });

            // Get product details and return enriched data
            return await Promise.all(
                topProducts.map(async (item) => {
                    const product = await prisma.product.findUnique({
                        where: { id: item.productId },
                        select: {
                            id: true,
                            name: true,
                            category: true,
                            unit: true,
                            sellingPrice: true
                        }
                    });

                    return {
                        product,
                        quantitySold: item._sum.quantity,
                        revenue: item._sum.totalPrice,
                        profit: item._sum.profit,
                        salesCount: item._count.id,
                        averagePrice: item._sum.totalPrice / item._sum.quantity
                    };
                })
            );

        } catch (error) {
            throw error;
        }
    }

    // Get low stock alerts
    static async getLowStockAlerts() {
        try {
            // Get all products with their inventory information
            const allProducts = await prisma.product.findMany({
                where: {
                    trackInventory: true
                },
                select: {
                    id: true,
                    name: true,
                    category: true,
                    unit: true,
                    sellingPrice: true,
                    costPrice: true,
                    trackInventory: true,
                    inventoryItems: {
                        select: {
                            quantity: true,
                            reorderLevel: true
                        }
                    }
                }
            });

            // Process products to determine stock status
            const alertProducts = [];

            for (const product of allProducts) {
                if (product.inventoryItems.length > 0) {
                    const inventory = product.inventoryItems[0]; // Assuming one inventory item per product
                    const currentStock = inventory.quantity || 0;
                    const reorderLevel = inventory.reorderLevel || 10;

                    let alertLevel = null;
                    if (currentStock === 0) {
                        alertLevel = 'critical'; // Out of stock
                    } else if (currentStock <= reorderLevel) {
                        alertLevel = 'warning'; // Low stock
                    }

                    if (alertLevel) {
                        alertProducts.push({
                            id: product.id,
                            name: product.name,
                            category: product.category,
                            currentStock: currentStock,
                            minStockLevel: reorderLevel,
                            stockStatus: currentStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
                            unit: product.unit,
                            sellingPrice: product.sellingPrice,
                            costPrice: product.costPrice,
                            alertLevel: alertLevel,
                            suggestedRestockQuantity: Math.max(
                                (reorderLevel * 2) - currentStock,
                                reorderLevel
                            )
                        });
                    }
                }
            }

            // Sort by alert level (critical first) then by current stock
            alertProducts.sort((a, b) => {
                if (a.alertLevel === 'critical' && b.alertLevel === 'warning') return -1;
                if (a.alertLevel === 'warning' && b.alertLevel === 'critical') return 1;
                return a.currentStock - b.currentStock;
            });

            return {
                totalAlerts: alertProducts.length,
                criticalAlerts: alertProducts.filter(a => a.alertLevel === 'critical').length,
                warningAlerts: alertProducts.filter(a => a.alertLevel === 'warning').length,
                alerts: alertProducts
            };

        } catch (error) {
            throw error;
        }
    }

    // Process additional payment for a sale
    static async processSalePayment({ saleId, paymentAmount, paymentMethod, notes }) {
        try {
            return await prisma.$transaction(async (tx) => {
                // Get sale details
                const sale = await tx.sale.findUnique({
                    where: { id: saleId },
                    include: {
                        customer: true
                    }
                });

                if (!sale) {
                    throw new Error('Sale not found');
                }

                if (sale.status === 'CANCELLED') {
                    throw new Error('Cannot process payment for cancelled sale');
                }

                // Calculate remaining balance
                const remainingBalance = sale.totalAmount - sale.paidAmount;

                if (remainingBalance <= 0) {
                    throw new Error('Sale is already fully paid');
                }

                if (paymentAmount > remainingBalance) {
                    throw new Error(`Payment amount (${paymentAmount}) exceeds remaining balance (${remainingBalance})`);
                }

                // Create payment record
                const payment = await tx.payment.create({
                    data: {
                        customerId: sale.customerId,
                        amount: paymentAmount,
                        method: paymentMethod,
                        type: 'RECEIVED',
                        status: 'COMPLETED',
                        notes: notes || `Payment for sale ${sale.saleNumber}`,
                        saleId: sale.id,
                        userId: sale.userId
                    }
                });

                // Update sale
                const newPaidAmount = sale.paidAmount + paymentAmount;
                const updatedSale = await tx.sale.update({
                    where: { id: saleId },
                    data: {
                        paidAmount: newPaidAmount,
                        status: newPaidAmount >= sale.totalAmount ? 'PAID' : 'PARTIAL_PAYMENT'
                    }
                });

                // Update customer debt if exists
                if (sale.customerId) {
                    const debt = await tx.debt.findFirst({
                        where: {
                            customerId: sale.customerId,
                            saleId: sale.id
                        }
                    });

                    if (debt) {
                        const newDebtAmount = debt.amount - paymentAmount;

                        if (newDebtAmount <= 0) {
                            await tx.debt.update({
                                where: { id: debt.id },
                                data: {
                                    amount: 0,
                                    status: 'PAID'
                                }
                            });
                        } else {
                            await tx.debt.update({
                                where: { id: debt.id },
                                data: {
                                    amount: newDebtAmount
                                }
                            });
                        }
                    }
                }

                return {
                    payment,
                    sale: updatedSale,
                    remainingBalance: sale.totalAmount - newPaidAmount
                };
            });

        } catch (error) {
            throw error;
        }
    }
}

module.exports = SalesService;
