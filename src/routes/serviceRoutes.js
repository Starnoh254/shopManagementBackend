const express = require('express');
const router = express.Router();
const ServiceController = require('../controllers/serviceController');
const authMiddleware = require('../middlewares/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * SERVICE ROUTES
 * Base path: /api/services
 */

// GET /api/services - Get all services with optional filters
// Query params: ?category=Electronics&search=repair&isActive=true
router.get('/', ServiceController.getAllServices);

// GET /api/services/:id - Get single service by ID
router.get('/:id', ServiceController.getServiceById);

// GET /api/services/:id/availability - Check if service can be delivered
// Query params: ?quantity=2
router.get('/:id/availability', ServiceController.checkAvailability);

// POST /api/services - Add new service
router.post('/', ServiceController.addService);

// PUT /api/services/:id - Update service information
router.put('/:id', ServiceController.updateService);

// PUT /api/services/:id/toggle-status - Toggle active/inactive status
router.put('/:id/toggle-status', ServiceController.toggleStatus);

// DELETE /api/services/:id - Delete service (only if no sales history)
router.delete('/:id', ServiceController.deleteService);

module.exports = router;
