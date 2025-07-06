const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * SERVICE SERVICE MODULE
 * Handles service management for the sales system
 * Manages services, pricing, and material requirements
 */
class ServiceService {

    // Add a new service with optional material requirements
    static async addService(data) {
        try {
            const {
                name,
                description,
                category,
                price,
                costEstimate,
                duration,
                requiresBooking = false,
                requiresMaterials = false,
                materials = [],
                userId
            } = data;

            // Validate required fields
            if (!name || !price || !userId) {
                throw new Error('Name, price, and user ID are required');
            }

            // Validate materials if provided
            if (requiresMaterials && materials.length > 0) {
                for (const material of materials) {
                    const product = await prisma.product.findFirst({
                        where: {
                            id: material.productId,
                            userId
                        }
                    });

                    if (!product) {
                        throw new Error(`Product with ID ${material.productId} not found`);
                    }
                }
            }

            // Create service and materials in a transaction
            const result = await prisma.$transaction(async (tx) => {
                // Create the service
                const service = await tx.service.create({
                    data: {
                        name,
                        description,
                        category,
                        price,
                        costEstimate,
                        duration,
                        requiresBooking,
                        requiresMaterials,
                        userId
                    }
                });

                // Create service materials if any
                const serviceMaterials = [];
                if (requiresMaterials && materials.length > 0) {
                    for (const material of materials) {
                        const serviceMaterial = await tx.serviceMaterial.create({
                            data: {
                                serviceId: service.id,
                                productId: material.productId,
                                quantity: material.quantity || 1
                            }
                        });
                        serviceMaterials.push(serviceMaterial);
                    }
                }

                return { service, serviceMaterials };
            });

            // Calculate profit margin if cost estimate is provided
            const profitMargin = costEstimate ?
                ((price - costEstimate) / costEstimate * 100) : null;

            // Get material details for response
            const materialDetails = [];
            if (result.serviceMaterials.length > 0) {
                for (const sm of result.serviceMaterials) {
                    const product = await prisma.product.findUnique({
                        where: { id: sm.productId },
                        select: { name: true }
                    });
                    materialDetails.push({
                        productId: sm.productId,
                        productName: product.name,
                        quantity: sm.quantity
                    });
                }
            }

            return {
                success: true,
                message: 'Service added successfully',
                service: {
                    ...result.service,
                    profitMargin,
                    materials: materialDetails
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Get all services with material information
    static async getAllServices(userId, filters = {}) {
        try {
            const { category, search, isActive } = filters;

            // Build where clause
            const where = {
                userId
            };

            if (category) {
                where.category = category;
            }

            if (isActive !== undefined) {
                where.isActive = isActive;
            }

            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } }
                ];
            }

            // Get services with materials
            const services = await prisma.service.findMany({
                where,
                include: {
                    serviceMaterials: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sellingPrice: true,
                                    unit: true,
                                    trackInventory: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    name: 'asc'
                }
            });

            // Process services with material and profit information
            const processedServices = services.map(service => {
                const profitMargin = service.costEstimate ?
                    ((service.price - service.costEstimate) / service.costEstimate * 100) : null;

                const materials = service.serviceMaterials.map(sm => ({
                    productId: sm.productId,
                    productName: sm.product.name,
                    quantity: sm.quantity,
                    unitPrice: sm.product.sellingPrice
                }));

                return {
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    category: service.category,
                    price: service.price,
                    costEstimate: service.costEstimate,
                    profitMargin,
                    duration: service.duration,
                    requiresBooking: service.requiresBooking,
                    requiresMaterials: service.requiresMaterials,
                    isActive: service.isActive,
                    materials,
                    createdAt: service.createdAt,
                    updatedAt: service.updatedAt
                };
            });

            return {
                success: true,
                services: processedServices
            };

        } catch (error) {
            throw error;
        }
    }

    // Get a single service by ID
    static async getServiceById(serviceId, userId) {
        try {
            const service = await prisma.service.findFirst({
                where: {
                    id: serviceId,
                    userId
                },
                include: {
                    serviceMaterials: {
                        include: {
                            product: {
                                select: {
                                    name: true,
                                    sellingPrice: true
                                }
                            }
                        }
                    }
                }
            });

            if (!service) {
                throw new Error('Service not found');
            }

            const profitMargin = service.costEstimate ?
                ((service.price - service.costEstimate) / service.costEstimate * 100) : null;

            const materials = service.serviceMaterials.map(sm => ({
                productId: sm.productId,
                productName: sm.product.name,
                quantity: sm.quantity,
                unitPrice: sm.product.sellingPrice
            }));

            return {
                success: true,
                service: {
                    ...service,
                    profitMargin,
                    materials,
                    serviceMaterials: undefined // Remove the included service materials
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Update service information
    static async updateService(serviceId, userId, updateData) {
        try {
            // Verify service exists and belongs to user
            const existingService = await prisma.service.findFirst({
                where: {
                    id: serviceId,
                    userId
                }
            });

            if (!existingService) {
                throw new Error('Service not found');
            }

            // Extract materials from update data
            const { materials, ...serviceData } = updateData;

            // Update service and materials in transaction
            const result = await prisma.$transaction(async (tx) => {
                // Update service
                const updatedService = await tx.service.update({
                    where: { id: serviceId },
                    data: serviceData
                });

                // Update materials if provided
                if (materials !== undefined) {
                    // Delete existing materials
                    await tx.serviceMaterial.deleteMany({
                        where: { serviceId }
                    });

                    // Add new materials
                    const serviceMaterials = [];
                    if (materials.length > 0) {
                        for (const material of materials) {
                            // Verify product exists
                            const product = await tx.product.findFirst({
                                where: {
                                    id: material.productId,
                                    userId
                                }
                            });

                            if (!product) {
                                throw new Error(`Product with ID ${material.productId} not found`);
                            }

                            const serviceMaterial = await tx.serviceMaterial.create({
                                data: {
                                    serviceId,
                                    productId: material.productId,
                                    quantity: material.quantity || 1
                                }
                            });
                            serviceMaterials.push(serviceMaterial);
                        }
                    }
                }

                return updatedService;
            });

            // Get updated service with materials
            const serviceWithMaterials = await this.getServiceById(serviceId, userId);

            return {
                success: true,
                message: 'Service updated successfully',
                service: serviceWithMaterials.service
            };

        } catch (error) {
            throw error;
        }
    }

    // Check if service can be delivered (materials availability)
    static async checkServiceAvailability(serviceId, userId, quantity = 1) {
        try {
            const service = await prisma.service.findFirst({
                where: {
                    id: serviceId,
                    userId
                },
                include: {
                    serviceMaterials: {
                        include: {
                            product: {
                                include: {
                                    inventoryItems: true
                                }
                            }
                        }
                    }
                }
            });

            if (!service) {
                throw new Error('Service not found');
            }

            if (!service.isActive) {
                return {
                    available: false,
                    reason: 'Service is currently inactive'
                };
            }

            // Check material availability if required
            if (service.requiresMaterials) {
                const unavailableMaterials = [];

                for (const sm of service.serviceMaterials) {
                    const inventory = sm.product.inventoryItems[0];
                    const currentStock = inventory?.quantity || 0;
                    const requiredQuantity = sm.quantity * quantity;

                    if (sm.product.trackInventory && currentStock < requiredQuantity) {
                        unavailableMaterials.push({
                            productName: sm.product.name,
                            required: requiredQuantity,
                            available: currentStock,
                            shortage: requiredQuantity - currentStock
                        });
                    }
                }

                if (unavailableMaterials.length > 0) {
                    return {
                        available: false,
                        reason: 'Insufficient materials',
                        unavailableMaterials
                    };
                }
            }

            return {
                available: true,
                service: {
                    id: service.id,
                    name: service.name,
                    price: service.price,
                    duration: service.duration,
                    requiresBooking: service.requiresBooking
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Deduct materials used for service delivery
    static async deductServiceMaterials(serviceId, userId, quantity = 1) {
        try {
            const service = await prisma.service.findFirst({
                where: {
                    id: serviceId,
                    userId
                },
                include: {
                    serviceMaterials: {
                        include: {
                            product: {
                                include: {
                                    inventoryItems: true
                                }
                            }
                        }
                    }
                }
            });

            if (!service || !service.requiresMaterials) {
                return { success: true, materialsDeducted: [] };
            }

            const materialsDeducted = [];

            await prisma.$transaction(async (tx) => {
                for (const sm of service.serviceMaterials) {
                    if (sm.product.trackInventory) {
                        const inventory = sm.product.inventoryItems[0];
                        if (inventory) {
                            const deductionQuantity = sm.quantity * quantity;
                            const newQuantity = Math.max(0, inventory.quantity - deductionQuantity);

                            await tx.inventoryItem.update({
                                where: { id: inventory.id },
                                data: { quantity: newQuantity }
                            });

                            materialsDeducted.push({
                                productId: sm.productId,
                                productName: sm.product.name,
                                quantityUsed: deductionQuantity,
                                previousStock: inventory.quantity,
                                newStock: newQuantity
                            });
                        }
                    }
                }
            });

            return {
                success: true,
                materialsDeducted
            };

        } catch (error) {
            throw error;
        }
    }

    // Delete a service (only if no sales history)
    static async deleteService(serviceId, userId) {
        try {
            // Check if service has any sales history
            const salesCount = await prisma.saleItem.count({
                where: {
                    serviceId,
                    sale: {
                        userId
                    }
                }
            });

            if (salesCount > 0) {
                throw new Error('Cannot delete service with sales history. Consider marking it as inactive instead.');
            }

            // Delete in transaction (materials first, then service)
            await prisma.$transaction(async (tx) => {
                // Delete service materials
                await tx.serviceMaterial.deleteMany({
                    where: { serviceId }
                });

                // Delete service
                await tx.service.delete({
                    where: { id: serviceId }
                });
            });

            return {
                success: true,
                message: 'Service deleted successfully'
            };

        } catch (error) {
            throw error;
        }
    }

    // Toggle service active status
    static async toggleServiceStatus(serviceId, userId) {
        try {
            const service = await prisma.service.findFirst({
                where: {
                    id: serviceId,
                    userId
                }
            });

            if (!service) {
                throw new Error('Service not found');
            }

            const updatedService = await prisma.service.update({
                where: { id: serviceId },
                data: { isActive: !service.isActive }
            });

            return {
                success: true,
                message: `Service ${updatedService.isActive ? 'activated' : 'deactivated'} successfully`,
                service: {
                    id: updatedService.id,
                    name: updatedService.name,
                    isActive: updatedService.isActive
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Get total service count for a user
    static async getServiceCount(userId) {
        try {
            return await prisma.service.count({
                where: { userId }
            });

        } catch (error) {
            throw error;
        }
    }
}

module.exports = ServiceService;
