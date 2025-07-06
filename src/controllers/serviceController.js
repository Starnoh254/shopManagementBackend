const ServiceService = require('../services/serviceService');

/**
 * SERVICE CONTROLLER
 * Handles HTTP requests for service management
 * Routes: /api/services
 */
class ServiceController {

    // POST /api/services - Add new service
    static async addService(req, res) {
        try {
            const userId = req.user.id; // From auth middleware
            const serviceData = { ...req.body, userId };

            const result = await ServiceService.addService(serviceData);

            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to add service',
                error: error.message
            });
        }
    }

    // GET /api/services - Get all services with optional filters
    static async getAllServices(req, res) {
        try {
            const userId = req.user.id;
            const filters = {
                category: req.query.category,
                search: req.query.search,
                isActive: req.query.isActive === 'true' ? true :
                    req.query.isActive === 'false' ? false : undefined
            };

            const result = await ServiceService.getAllServices(userId, filters);

            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve services',
                error: error.message
            });
        }
    }

    // GET /api/services/:id - Get single service
    static async getServiceById(req, res) {
        try {
            const userId = req.user.id;
            const serviceId = parseInt(req.params.id);

            if (!serviceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid service ID is required'
                });
            }

            const result = await ServiceService.getServiceById(serviceId, userId);

            res.status(200).json(result);
        } catch (error) {
            const statusCode = error.message === 'Service not found' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to retrieve service',
                error: error.message
            });
        }
    }

    // PUT /api/services/:id - Update service
    static async updateService(req, res) {
        try {
            const userId = req.user.id;
            const serviceId = parseInt(req.params.id);

            if (!serviceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid service ID is required'
                });
            }

            const result = await ServiceService.updateService(serviceId, userId, req.body);

            res.status(200).json(result);
        } catch (error) {
            const statusCode = error.message === 'Service not found' ? 404 : 400;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to update service',
                error: error.message
            });
        }
    }

    // GET /api/services/:id/availability - Check service availability
    static async checkAvailability(req, res) {
        try {
            const userId = req.user.id;
            const serviceId = parseInt(req.params.id);
            const quantity = parseInt(req.query.quantity) || 1;

            if (!serviceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid service ID is required'
                });
            }

            const result = await ServiceService.checkServiceAvailability(serviceId, userId, quantity);

            res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            const statusCode = error.message === 'Service not found' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to check service availability',
                error: error.message
            });
        }
    }

    // PUT /api/services/:id/toggle-status - Toggle active/inactive status
    static async toggleStatus(req, res) {
        try {
            const userId = req.user.id;
            const serviceId = parseInt(req.params.id);

            if (!serviceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid service ID is required'
                });
            }

            const result = await ServiceService.toggleServiceStatus(serviceId, userId);

            res.status(200).json(result);
        } catch (error) {
            const statusCode = error.message === 'Service not found' ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to toggle service status',
                error: error.message
            });
        }
    }

    // DELETE /api/services/:id - Delete service
    static async deleteService(req, res) {
        try {
            const userId = req.user.id;
            const serviceId = parseInt(req.params.id);

            if (!serviceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid service ID is required'
                });
            }

            const result = await ServiceService.deleteService(serviceId, userId);

            res.status(200).json(result);
        } catch (error) {
            const statusCode = error.message.includes('Cannot delete') ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to delete service',
                error: error.message
            });
        }
    }
}

module.exports = ServiceController;
