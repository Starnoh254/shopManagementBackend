const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * PRODUCT ROUTES
 * Base path: /api/products
 */

// GET /api/products/alerts - Get inventory alerts (before /:id route)
router.get('/alerts', ProductController.getInventoryAlerts);

// GET /api/products - Get all products with optional filters
// Query params: ?category=Beverages&stockStatus=LOW_STOCK&search=cola
router.get('/', ProductController.getAllProducts);

// GET /api/products/:id - Get single product by ID
router.get('/:id', ProductController.getProductById);

// POST /api/products - Add new product
router.post('/', ProductController.addProduct);

// PUT /api/products/:id - Update product information
router.put('/:id', ProductController.updateProduct);

// PUT /api/products/:id/inventory - Update inventory levels
router.put('/:id/inventory', ProductController.updateInventory);

// DELETE /api/products/:id - Delete product (only if no sales history)
router.delete('/:id', ProductController.deleteProduct);

module.exports = router;
