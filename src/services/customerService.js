const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * CUSTOMER SERVICE MODULE
 * Handles ONLY customer-related operations
 * No debt logic here - pure customer management
 */
class CustomerService {

    // Create a new customer
    static async createCustomer(data) {
        try {
            const { name, phone, email, address, userId } = data;

            // Check if customer already exists
            const existingCustomer = await prisma.customer.findUnique({
                where: { phone }
            });

            if (existingCustomer) {
                throw new Error('Customer with this phone number already exists');
            }

            return await prisma.customer.create({
                data: {
                    name,
                    phone,
                    email,
                    address,
                    userId
                }
            });
        } catch (e) {
            throw e;
        }
    }

    // Get all customers for a user
    static async getAllCustomers(userId) {
        try {
            return await prisma.customer.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' }
            });
        } catch (e) {
            throw e;
        }
    }

    // Get customer by ID
    static async getCustomerById(customerId, userId) {
        try {
            return await prisma.customer.findFirst({
                where: {
                    id: customerId,
                    userId
                }
            });
        } catch (e) {
            throw e;
        }
    }

    // Search customers by name or phone
    static async searchCustomers(query, userId) {
        try {
            return await prisma.customer.findMany({
                where: {
                    userId,
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { phone: { contains: query } }
                    ]
                },
                orderBy: { name: 'asc' }
            });
        } catch (e) {
            throw e;
        }
    }

    // Update customer details
    static async updateCustomer(customerId, data, userId) {
        try {
            const { name, phone, email, address } = data;

            return await prisma.customer.update({
                where: {
                    id: customerId,
                    userId
                },
                data: {
                    name,
                    phone,
                    email,
                    address
                }
            });
        } catch (e) {
            throw e;
        }
    }

    // Delete customer
    static async deleteCustomer(customerId, userId) {
        try {
            // Check if customer has unpaid debts
            const unpaidDebts = await prisma.debt.findFirst({
                where: {
                    customerId,
                    isPaid: false
                }
            });

            if (unpaidDebts) {
                throw new Error('Cannot delete customer with unpaid debts');
            }

            return await prisma.customer.delete({
                where: {
                    id: customerId,
                    userId
                }
            });
        } catch (e) {
            throw e;
        }
    }
}

module.exports = CustomerService;