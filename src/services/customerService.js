const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const sendSMS = require('../utils/sms')

class customerService {
    static AMOUNT = 200;

    static async addCustomer(data) {
        try {

            if (data?.id) {
                // Check if customer already exists (by id number)
                const existingCustomer = await prisma.customer.findUnique({
                    where: { id: data?.id }
                });

                if (existingCustomer) {
                    console.log("Its an existing customer bro")
                    console.log(`Existing amount : ${existingCustomer.amountOwed + data.amount}`)
                    console.log(`Pass mark : ${this.AMOUNT}`)
                    if (existingCustomer.amountOwed + data.amount >= this.AMOUNT) {
                        console.log("Hapa ni sending block")
                        sendSMS();
                    }
                    // Increment the amount owed for the existing customer
                    return await prisma.customer.update({
                        where: { id: data?.id },
                        data: {
                            amountOwed: existingCustomer.amountOwed + data.amount,
                            is_paid: false
                        }
                    });
                }
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

    static async deductDebt(id, amount) {
        try {
            // Find the customer by id number
            const customer = await prisma.customer.findUnique({
                where: { id }
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
                where: { id },
                data: {
                    amountOwed: newAmountOwed,
                    is_paid: newAmountOwed === 0
                }
            });
        } catch (e) {
            throw e;
        }
    }

    static async getAllCustomers(userId) {
        try {
            return await prisma.customer.findMany({
                where: { userId }
            });
        } catch (e) {
            throw e;
        }
    }

    static async getCustomersWithDebts(userId) {
        try {
            return await prisma.customer.findMany({
                where: {
                    userId,
                    amountOwed: { gt: 0 }
                }
            });
        } catch (e) {
            throw e;
        }
    }
}

module.exports = customerService