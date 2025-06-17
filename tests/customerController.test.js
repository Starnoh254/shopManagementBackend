/**
 * Unit tests for customerController.
 * 
 * We mock customerService to:
 * - Isolate controller logic from service/database logic.
 * - Ensure tests are fast, reliable, and deterministic.
 * - Focus only on controller behavior and response handling.
 * 
 * If you want to test integration with the real service/database,
 * write separate integration tests.
 */

const customerController = require('../src/controllers/customerController');
const customerService = require('../src/services/customerService');

// Mock the customerService module so we can control its behavior in tests
jest.mock('../src/services/customerService');

describe('customerController', () => {
    let req, res;

    beforeEach(() => {
        req = { body: {}, user: { userId: 1 } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('addCustomer', () => {
        it('should add a customer and return success', async () => {
            customerService.addCustomer.mockResolvedValue({ id: 1, name: 'Test' });
            req.body = { name: 'Test', phone: '123', amount: 100, is_paid: false };

            await customerController.addCustomer(req, res);

            expect(customerService.addCustomer).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Customer Details entered successfully',
                user: { id: 1, name: 'Test' }
            });
        });

        it('should handle errors', async () => {
            customerService.addCustomer.mockRejectedValue(new Error('fail'));
            await customerController.addCustomer(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Server error',
                error: 'fail'
            });
        });
    });

    describe('deductDebt', () => {
        it('should deduct debt and return success', async () => {
            customerService.deductDebt.mockResolvedValue({ id: 1, amountOwed: 0 });
            req.body = { phone: '123', amount: 50 };

            await customerController.deductDebt(req, res);

            expect(customerService.deductDebt).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Customer Details updated successfully',
                user: { id: 1, amountOwed: 0 }
            });
        });

        it('should handle errors', async () => {
            customerService.deductDebt.mockRejectedValue(new Error('fail'));
            await customerController.deductDebt(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Server error',
                error: 'fail'
            });
        });
    });
});