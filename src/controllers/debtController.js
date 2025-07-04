const DebtService = require('../services/debtService');

/**
 * DEBT CONTROLLER MODULE
 * Handles ONLY debt-related HTTP requests
 * No customer management logic here - delegates to debt service
 */
class DebtController {

    // Add debt to existing customer
    static async addDebt(req, res) {
        try {
            const { customerId, amount, description, dueDate } = req.body;
            const { userId } = req.user;

            const debt = await DebtService.addDebt({
                customerId,
                amount,
                description,
                dueDate,
                userId
            });

            res.status(201).json({
                message: 'Debt added successfully',
                debt
            });
        } catch (err) {
            if (err.message === 'Customer not found') {
                return res.status(404).json({ message: err.message });
            }
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Get all debts for a customer
    static async getCustomerDebts(req, res) {
        try {
            const { customerId } = req.params;
            const { userId } = req.user;

            const debts = await DebtService.getCustomerDebts(parseInt(customerId), userId);

            res.status(200).json({ debts });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Get unpaid debts for a customer
    static async getCustomerUnpaidDebts(req, res) {
        try {
            const { customerId } = req.params;
            const { userId } = req.user;

            const debts = await DebtService.getCustomerUnpaidDebts(parseInt(customerId), userId);
            const totalUnpaid = await DebtService.getTotalUnpaidDebt(parseInt(customerId));

            res.status(200).json({
                debts,
                totalUnpaid
            });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Get all customers with unpaid debts
    static async getCustomersWithUnpaidDebts(req, res) {
        try {
            const { userId } = req.user;

            const customers = await DebtService.getCustomersWithUnpaidDebts(userId);

            res.status(200).json({ customers });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Mark debt as paid
    static async markDebtAsPaid(req, res) {
        try {
            const { debtId } = req.params;
            const { userId } = req.user;

            const debt = await DebtService.markDebtAsPaid(parseInt(debtId), userId);

            res.status(200).json({
                message: 'Debt marked as paid',
                debt
            });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Update debt
    static async updateDebt(req, res) {
        try {
            const { debtId } = req.params;
            const { amount, description, dueDate, isPaid } = req.body;
            const { userId } = req.user;

            const debt = await DebtService.updateDebt(
                parseInt(debtId),
                { amount, description, dueDate, isPaid },
                userId
            );

            res.status(200).json({
                message: 'Debt updated successfully',
                debt
            });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Delete debt
    static async deleteDebt(req, res) {
        try {
            const { debtId } = req.params;
            const { userId } = req.user;

            await DebtService.deleteDebt(parseInt(debtId), userId);

            res.status(200).json({ message: 'Debt deleted successfully' });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }

    // Get debt analytics
    static async getDebtAnalytics(req, res) {
        try {
            const { userId } = req.user;

            const analytics = await DebtService.getDebtAnalytics(userId);

            res.status(200).json({ analytics });
        } catch (err) {
            res.status(500).json({ message: 'Server error', error: err.message });
        }
    }
}

module.exports = DebtController;
