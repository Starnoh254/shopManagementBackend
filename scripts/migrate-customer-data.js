const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateCustomerData() {
    console.log('🔄 Starting data migration...');

    try {
        // Step 1: Get all customers with debt data from old schema
        const customersWithDebts = await prisma.$queryRaw`
      SELECT id, userId, amountOwed, is_paid, createdAt 
      FROM Customer 
      WHERE amountOwed > 0 OR is_paid = true
    `;

        console.log(`📊 Found ${customersWithDebts.length} customers with debt data`);

        // Step 2: Create Debt records for each customer with debt
        for (const customer of customersWithDebts) {
            if (customer.amountOwed > 0 || customer.is_paid) {
                await prisma.debt.create({
                    data: {
                        customerId: customer.id,
                        userId: customer.userId,
                        amount: customer.amountOwed || 0,
                        description: 'Migrated from old system',
                        isPaid: customer.is_paid || false,
                        createdAt: customer.createdAt,
                        updatedAt: new Date()
                    }
                });

                console.log(`✅ Migrated debt for customer ID: ${customer.id}, Amount: ${customer.amountOwed}`);
            }
        }

        console.log('🎉 Data migration completed successfully!');

    } catch (error) {
        console.error('❌ Error during migration:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    migrateCustomerData()
        .then(() => {
            console.log('Migration script finished');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateCustomerData };
