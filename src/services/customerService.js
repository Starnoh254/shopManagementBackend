const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class customerService {

    static async addCustomer(data) {
        try {
            // Check if customer already exists (by phone number)
            const existingCustomer = await prisma.customer.findUnique({
                where: { phone: data.phone }
            });

            if (existingCustomer) {
                // Increment the amount owed for the existing customer
                return await prisma.customer.update({
                    where: { phone: data.phone },
                    data: {
                        amountOwed: existingCustomer.amountOwed + data.amount,
                        is_paid: data.is_paid // Optionally update is_paid status
                    }
                });
            }

            // Create new customer in the database
            return await prisma.customer.create({
                data: {
                    name: data.name,
                    phone: data.phone,
                    amountOwed: data.amount,
                    is_paid: data.is_paid,
                    userId: data.userId
                }
            });
        } catch (e) {
            throw e;
        }
    }

    static async deductDebt(phone, amount) {
        try {
            // Find the customer by phone number
            const customer = await prisma.customer.findUnique({
                where: { phone }
            });

            if (!customer) {
                throw new Error('Customer not found');
            }

            // Calculate new amount owed
            let newAmountOwed = customer.amountOwed - amount;
            // sourcery skip: use-braces
            if (newAmountOwed < 0) newAmountOwed = 0;

            // Update customer record
            return await prisma.customer.update({
                where: { phone },
                data: {
                    amountOwed: newAmountOwed,
                    is_paid: newAmountOwed === 0
                }
            });
        } catch (e) {
            throw e;
        }
    }
}

module.exports = customerService