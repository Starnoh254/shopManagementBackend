const CustomerService = require('../services/customerService');

/**
 * CUSTOMER CONTROLLER MODULE
 * Handles ONLY customer-related HTTP requests
 * No debt logic here - delegates to customer service
 */
class CustomerController {

    // Create a new customer
    static async createCustomer(req, res) {
        try {
            const { name, phone, email, address } = req.body;
            const { userId } = req.user;

            const customer = await CustomerService.createCustomer({
                name,
                phone,
                email,
                address,
                userId
            });

            res.status(201).json({
                message: 'Customer created successfully',
                customer
            });
        } catch (err) {
            if (err.message === 'Customer with this phone number already exists') {
                return res.status(400).json({ message: err.message });
            }
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Get all customers
    static async getAllCustomers(req, res) {
        try {
            const { userId } = req.user;
            const customers = await CustomerService.getAllCustomers(userId);

            res.status(200).json({ customers });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Get customer by ID
    static async getCustomerById(req, res) {
        try {
            const { customerId } = req.params;
            const { userId } = req.user;

            const customer = await CustomerService.getCustomerById(parseInt(customerId), userId);

            if (!customer) {
                return res.status(404).json({ message: 'Customer not found' });
            }

            res.status(200).json({ customer });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Search customers
    static async searchCustomers(req, res) {
        try {
            const { q: query } = req.query;
            const { userId } = req.user;

            if (!query) {
                return res.status(400).json({ message: 'Search query is required' });
            }

            const customers = await CustomerService.searchCustomers(query, userId);

            res.status(200).json({ customers });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Update customer
    static async updateCustomer(req, res) {
        try {
            const { customerId } = req.params;
            const { name, phone, email, address } = req.body;
            const { userId } = req.user;

            const customer = await CustomerService.updateCustomer(
                parseInt(customerId),
                { name, phone, email, address },
                userId
            );

            res.status(200).json({
                message: 'Customer updated successfully',
                customer
            });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Delete customer
    static async deleteCustomer(req, res) {
        try {
            const { customerId } = req.params;
            const { userId } = req.user;

            await CustomerService.deleteCustomer(parseInt(customerId), userId);

            res.status(200).json({ message: 'Customer deleted successfully' });
        } catch (err) {
            if (err.message === 'Cannot delete customer with unpaid debts') {
                return res.status(400).json({ message: err.message });
            }
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }
}

module.exports = CustomerController;