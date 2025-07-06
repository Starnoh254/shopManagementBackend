const ProductService = require('../services/productService');

/**
 * PRODUCT CONTROLLER
 * Handles HTTP requests for product management
 * Routes: /api/products
 */
class ProductController {

    // POST /api/products - Add new product
    static async addProduct(req, res) {
        try {
            const userId = req.user.id; // From auth middleware
            const productData = { ...req.body, userId };

            const result = await ProductService.addProduct(productData);

            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to add product',
                error: error.message
            });
        }
    }

    // GET /api/products - Get all products with optional filters
    static async getAllProducts(req, res) {
        try {
            const userId = req.user.id;
            const filters = {
                category: req.query.category,
                stockStatus: req.query.stockStatus,
                search: req.query.search
            };

            const result = await ProductService.getAllProducts(userId, filters);

            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve products',
                error: error.message
            });
        }
    }

    // GET /api/products/:id - Get single product
    static async getProductById(req, res) {
        try {
            const userId = req.user.id;
            const productId = parseInt(req.params.id);

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid product ID is required'
                });
            }

            const result = await ProductService.getProductById(productId, userId);

            res.status(200).json(result);
        } catch (error) {
            const statusCode = error.message === 'Product not found' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to retrieve product',
                error: error.message
            });
        }
    }

    // PUT /api/products/:id - Update product
    static async updateProduct(req, res) {
        try {
            const userId = req.user.id;
            const productId = parseInt(req.params.id);

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid product ID is required'
                });
            }

            const result = await ProductService.updateProduct(productId, userId, req.body);

            res.status(200).json(result);
        } catch (error) {
            const statusCode = error.message === 'Product not found' ? 404 : 400;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to update product',
                error: error.message
            });
        }
    }

    // PUT /api/products/:id/inventory - Update inventory levels
    static async updateInventory(req, res) {
        try {
            const userId = req.user.id;
            const productId = parseInt(req.params.id);

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid product ID is required'
                });
            }

            const result = await ProductService.updateInventory(productId, userId, req.body);

            res.status(200).json(result);
        } catch (error) {
            const statusCode = error.message.includes('not found') ? 404 : 400;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to update inventory',
                error: error.message
            });
        }
    }

    // GET /api/products/alerts - Get inventory alerts
    static async getInventoryAlerts(req, res) {
        try {
            const userId = req.user.id;

            const result = await ProductService.getInventoryAlerts(userId);

            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve inventory alerts',
                error: error.message
            });
        }
    }

    // DELETE /api/products/:id - Delete product
    static async deleteProduct(req, res) {
        try {
            const userId = req.user.id;
            const productId = parseInt(req.params.id);

            if (!productId) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid product ID is required'
                });
            }

            const result = await ProductService.deleteProduct(productId, userId);

            res.status(200).json(result);
        } catch (error) {
            const statusCode = error.message.includes('Cannot delete') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to delete product',
                error: error.message
            });
        }
    }
}

module.exports = ProductController;
