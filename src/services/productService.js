const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * PRODUCT SERVICE MODULE
 * Handles product management for the sales system
 * Manages inventory tracking and stock levels
 */
class ProductService {

    // Add a new product with optional initial inventory
    static async addProduct(data) {
        try {
            const {
                name,
                description,
                category,
                sellingPrice,
                costPrice,
                sku,
                unit = "piece",
                trackInventory = true,
                initialStock = 0,
                reorderLevel = 10,
                userId
            } = data;

            // Validate required fields
            if (!name || !sellingPrice || !userId) {
                throw new Error('Name, selling price, and user ID are required');
            }

            // Check if SKU already exists for this user
            if (sku) {
                const existingSku = await prisma.product.findFirst({
                    where: {
                        sku,
                        userId
                    }
                });

                if (existingSku) {
                    throw new Error('SKU already exists for this user');
                }
            }

            // Create product and inventory in a transaction
            const result = await prisma.$transaction(async (tx) => {
                // Create the product
                const product = await tx.product.create({
                    data: {
                        name,
                        description,
                        category,
                        sellingPrice,
                        costPrice,
                        sku,
                        unit,
                        trackInventory,
                        userId
                    }
                });

                // Create inventory record if tracking is enabled
                let inventory = null;
                if (trackInventory) {
                    inventory = await tx.inventoryItem.create({
                        data: {
                            productId: product.id,
                            quantity: initialStock,
                            reorderLevel,
                            userId
                        }
                    });
                }

                return { product, inventory };
            });

            // Calculate profit margin if cost price is provided
            const profitMargin = costPrice ?
                ((sellingPrice - costPrice) / costPrice * 100) : null;

            // Get current stock status
            const stockStatus = this.getStockStatus(
                result.inventory?.quantity || 0,
                result.inventory?.reorderLevel || 0,
                trackInventory
            );

            return {
                success: true,
                message: 'Product added successfully',
                product: {
                    ...result.product,
                    profitMargin,
                    currentStock: result.inventory?.quantity || 0,
                    reorderLevel: result.inventory?.reorderLevel || 0,
                    stockStatus
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Get all products with inventory information
    static async getAllProducts(userId, filters = {}) {
        try {
            const { category, stockStatus, search } = filters;

            // Build where clause
            const where = {
                userId
            };

            if (category) {
                where.category = category;
            }

            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { sku: { contains: search, mode: 'insensitive' } }
                ];
            }

            // Get products with inventory
            const products = await prisma.product.findMany({
                where,
                include: {
                    inventoryItems: true
                },
                orderBy: {
                    name: 'asc'
                }
            });

            // Process products with stock information
            const processedProducts = products.map(product => {
                const inventory = product.inventoryItems[0]; // One inventory per product per user
                const currentStock = inventory?.quantity || 0;
                const reorderLevel = inventory?.reorderLevel || 0;
                const stockStatus = this.getStockStatus(currentStock, reorderLevel, product.trackInventory);

                const profitMargin = product.costPrice ?
                    ((product.sellingPrice - product.costPrice) / product.costPrice * 100) : null;

                return {
                    id: product.id,
                    name: product.name,
                    description: product.description,
                    category: product.category,
                    sellingPrice: product.sellingPrice,
                    costPrice: product.costPrice,
                    sku: product.sku,
                    unit: product.unit,
                    trackInventory: product.trackInventory,
                    currentStock,
                    reorderLevel,
                    stockStatus,
                    profitMargin,
                    createdAt: product.createdAt,
                    updatedAt: product.updatedAt
                };
            });

            // Filter by stock status if requested
            const filteredProducts = stockStatus ?
                processedProducts.filter(p => p.stockStatus === stockStatus) :
                processedProducts;

            // Calculate summary statistics
            const summary = {
                totalProducts: processedProducts.length,
                inStock: processedProducts.filter(p => p.stockStatus === 'IN_STOCK').length,
                lowStock: processedProducts.filter(p => p.stockStatus === 'LOW_STOCK').length,
                outOfStock: processedProducts.filter(p => p.stockStatus === 'OUT_OF_STOCK').length,
                totalInventoryValue: processedProducts.reduce((sum, p) =>
                    sum + (p.currentStock * (p.costPrice || 0)), 0)
            };

            return {
                success: true,
                products: filteredProducts,
                summary
            };

        } catch (error) {
            throw error;
        }
    }

    // Get a single product by ID
    static async getProductById(productId, userId) {
        try {
            const product = await prisma.product.findFirst({
                where: {
                    id: productId,
                    userId
                },
                include: {
                    inventoryItems: true
                }
            });

            if (!product) {
                throw new Error('Product not found');
            }

            const inventory = product.inventoryItems[0];
            const currentStock = inventory?.quantity || 0;
            const reorderLevel = inventory?.reorderLevel || 0;
            const stockStatus = this.getStockStatus(currentStock, reorderLevel, product.trackInventory);

            const profitMargin = product.costPrice ?
                ((product.sellingPrice - product.costPrice) / product.costPrice * 100) : null;

            return {
                success: true,
                product: {
                    ...product,
                    currentStock,
                    reorderLevel,
                    stockStatus,
                    profitMargin,
                    inventoryItems: undefined // Remove the included inventory items
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Update product information
    static async updateProduct(productId, userId, updateData) {
        try {
            // Verify product exists and belongs to user
            const existingProduct = await prisma.product.findFirst({
                where: {
                    id: productId,
                    userId
                }
            });

            if (!existingProduct) {
                throw new Error('Product not found');
            }

            // Check SKU uniqueness if being updated
            if (updateData.sku && updateData.sku !== existingProduct.sku) {
                const existingSku = await prisma.product.findFirst({
                    where: {
                        sku: updateData.sku,
                        userId,
                        id: { not: productId }
                    }
                });

                if (existingSku) {
                    throw new Error('SKU already exists for this user');
                }
            }

            // Update product
            const updatedProduct = await prisma.product.update({
                where: { id: productId },
                data: updateData,
                include: {
                    inventoryItems: true
                }
            });

            const inventory = updatedProduct.inventoryItems[0];
            const currentStock = inventory?.quantity || 0;
            const reorderLevel = inventory?.reorderLevel || 0;
            const stockStatus = this.getStockStatus(currentStock, reorderLevel, updatedProduct.trackInventory);

            const profitMargin = updatedProduct.costPrice ?
                ((updatedProduct.sellingPrice - updatedProduct.costPrice) / updatedProduct.costPrice * 100) : null;

            return {
                success: true,
                message: 'Product updated successfully',
                product: {
                    ...updatedProduct,
                    currentStock,
                    reorderLevel,
                    stockStatus,
                    profitMargin,
                    inventoryItems: undefined
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Update inventory levels
    static async updateInventory(productId, userId, inventoryData) {
        try {
            const { quantity, reorderLevel, operation = 'SET' } = inventoryData;

            // Verify product exists and belongs to user
            const product = await prisma.product.findFirst({
                where: {
                    id: productId,
                    userId
                }
            });

            if (!product) {
                throw new Error('Product not found');
            }

            if (!product.trackInventory) {
                throw new Error('Inventory tracking is not enabled for this product');
            }

            // Get current inventory
            const currentInventory = await prisma.inventoryItem.findFirst({
                where: {
                    productId,
                    userId
                }
            });

            if (!currentInventory) {
                throw new Error('Inventory record not found');
            }

            // Calculate new quantity based on operation
            let newQuantity;
            switch (operation) {
                case 'ADD':
                    newQuantity = currentInventory.quantity + quantity;
                    break;
                case 'SUBTRACT':
                    newQuantity = Math.max(0, currentInventory.quantity - quantity);
                    break;
                case 'SET':
                default:
                    newQuantity = quantity;
                    break;
            }

            // Update inventory
            const updatedInventory = await prisma.inventoryItem.update({
                where: {
                    id: currentInventory.id
                },
                data: {
                    quantity: newQuantity,
                    ...(reorderLevel !== undefined && { reorderLevel })
                }
            });

            const stockStatus = this.getStockStatus(newQuantity, updatedInventory.reorderLevel, true);

            return {
                success: true,
                message: 'Inventory updated successfully',
                inventory: {
                    productId,
                    previousQuantity: currentInventory.quantity,
                    newQuantity,
                    reorderLevel: updatedInventory.reorderLevel,
                    stockStatus,
                    operation
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Helper method to determine stock status
    static getStockStatus(currentStock, reorderLevel, trackInventory) {
        if (!trackInventory) {
            return 'NOT_TRACKED';
        }

        if (currentStock === 0) {
            return 'OUT_OF_STOCK';
        } else if (currentStock <= reorderLevel) {
            return 'LOW_STOCK';
        } else {
            return 'IN_STOCK';
        }
    }

    // Get inventory alerts for low/out of stock items
    static async getInventoryAlerts(userId) {
        try {
            const products = await prisma.product.findMany({
                where: {
                    userId,
                    trackInventory: true
                },
                include: {
                    inventoryItems: true
                }
            });

            const lowStock = [];
            const outOfStock = [];

            products.forEach(product => {
                const inventory = product.inventoryItems[0];
                if (!inventory) return;

                const currentStock = inventory.quantity;
                const reorderLevel = inventory.reorderLevel;

                if (currentStock === 0) {
                    outOfStock.push({
                        productId: product.id,
                        name: product.name,
                        category: product.category,
                        currentStock,
                        reorderLevel,
                        status: 'OUT_OF_STOCK'
                    });
                } else if (currentStock <= reorderLevel) {
                    lowStock.push({
                        productId: product.id,
                        name: product.name,
                        category: product.category,
                        currentStock,
                        reorderLevel,
                        status: 'LOW_STOCK',
                        suggestedOrderQuantity: Math.max(50, reorderLevel * 2)
                    });
                }
            });

            return {
                success: true,
                alerts: {
                    lowStock,
                    outOfStock,
                    totalAlerts: lowStock.length + outOfStock.length
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Delete a product (only if no sales history)
    static async deleteProduct(productId, userId) {
        try {
            // Check if product has any sales history
            const salesCount = await prisma.saleItem.count({
                where: {
                    productId,
                    sale: {
                        userId
                    }
                }
            });

            if (salesCount > 0) {
                throw new Error('Cannot delete product with sales history. Consider marking it as inactive instead.');
            }

            // Delete in transaction (inventory first, then product)
            await prisma.$transaction(async (tx) => {
                // Delete inventory records
                await tx.inventoryItem.deleteMany({
                    where: {
                        productId,
                        userId
                    }
                });

                // Delete product
                await tx.product.delete({
                    where: {
                        id: productId
                    }
                });
            });

            return {
                success: true,
                message: 'Product deleted successfully'
            };

        } catch (error) {
            throw error;
        }
    }

    // Get total product count for a user
    static async getProductCount(userId) {
        try {
            return await prisma.product.count({
                where: { userId }
            });

        } catch (error) {
            throw error;
        }
    }
}

module.exports = ProductService;
