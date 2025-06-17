const customerService = require('../services/customerService');

class customerController {
    // Add a new customer 
    static async addCustomer(req, res) {
        const { name, phone, amount, is_paid } = req.body;
        const { userId } = req.user;
        console.log(`Here is the id ${userId}`)
        const data = { name, phone, amount, is_paid, userId };
        try {
            const user = await customerService.addCustomer(data);
            res.status(201).json({ message: 'Customer Details entered successfully', user });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    static async addDebt (req, res) {
        const { id , amount } = req.body;
        const data = { id , amount };
        try {
            const user = await customerService.addCustomer(data);
            res.status(201).json({ message: 'Customer Details updated successfully', user });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    static async deductDebt(req, res) {
        const { id, amount } = req.body;
        try {
            const user = await customerService.deductDebt(id , amount);
            res.status(201).json({ message: 'Customer Details updated successfully', user });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    static async getAllCustomers(req, res) {
        const { userId } = req.user;
        try {
            const customers = await customerService.getAllCustomers(userId);
            res.status(200).json({ customers });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    static async getCustomersWithDebts(req, res) {
        const { userId } = req.user;
        try {
            const customers = await customerService.getCustomersWithDebts(userId);
            res.status(200).json({ customers });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }
}

module.exports = customerController;