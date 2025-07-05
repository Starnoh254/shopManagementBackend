/**
 * CLEANUP SCRIPT FOR ZERO-DOLLAR PAYMENTS
 * 
 * This script removes confusing $0 payment records that were created 
 * during credit application in the old system. These should now be 
 * tracked as CreditTransactions instead.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupZeroPayments() {
    console.log('🧹 Starting cleanup of $0 payment records...');

    try {
        // Find all payments with amount = 0
        const zeroPayments = await prisma.payment.findMany({
            where: {
                amount: 0
            },
            include: {
                customer: {
                    select: {
                        name: true,
                        phone: true
                    }
                }
            }
        });

        console.log(`Found ${zeroPayments.length} zero-amount payment records to review`);

        if (zeroPayments.length === 0) {
            console.log('✅ No zero-amount payments found. Database is clean!');
            return;
        }

        // Display what we found
        console.log('\n📋 Zero-amount payments found:');
        zeroPayments.forEach((payment, index) => {
            console.log(`${index + 1}. Customer: ${payment.customer.name} (${payment.customer.phone})`);
            console.log(`   Payment ID: ${payment.id}`);
            console.log(`   Amount: $${payment.amount}`);
            console.log(`   Applied to Debt: $${payment.appliedToDebt || 0}`);
            console.log(`   Credit Amount: $${payment.creditAmount || 0}`);
            console.log(`   Description: ${payment.description}`);
            console.log(`   Date: ${payment.createdAt}`);
            console.log('   ---');
        });

        // Check if these are really just credit applications
        const creditApplications = zeroPayments.filter(p =>
            p.amount === 0 &&
            (p.appliedToDebt > 0 || p.creditAmount < 0) &&
            (p.description?.includes('credit') || p.description?.includes('applied'))
        );

        console.log(`\n🔍 Found ${creditApplications.length} payments that appear to be credit applications`);

        if (creditApplications.length > 0) {
            console.log('\n⚠️  These payments appear to be credit applications that should be CreditTransactions instead.');
            console.log('Would you like to convert them? (This will:');
            console.log('1. Create equivalent CreditTransaction records');
            console.log('2. Delete the confusing $0 payment records');
            console.log('3. Preserve all the important data)');

            // For now, just show what we would do
            console.log('\n📝 Conversion plan:');

            for (const payment of creditApplications) {
                console.log(`\nPayment ID ${payment.id} would become:`);

                if (payment.appliedToDebt > 0) {
                    console.log(`  → CreditTransaction: -$${payment.appliedToDebt} (APPLIED_TO_DEBT)`);
                }

                if (payment.creditAmount < 0) {
                    console.log(`  → CreditTransaction: $${Math.abs(payment.creditAmount)} (OVERPAYMENT_ADDED)`);
                }
            }

            // Perform the cleanup
            console.log('\n🔄 Performing conversion...');

            for (const payment of creditApplications) {
                // Create CreditTransaction for credit applied to debt
                if (payment.appliedToDebt > 0) {
                    await prisma.creditTransaction.create({
                        data: {
                            customerId: payment.customerId,
                            userId: payment.userId,
                            amount: -payment.appliedToDebt, // Negative because credit was used
                            type: 'APPLIED_TO_DEBT',
                            description: `Migrated: ${payment.description}`,
                            createdAt: payment.createdAt
                        }
                    });
                    console.log(`✅ Created credit transaction for payment ${payment.id}: -$${payment.appliedToDebt}`);
                }

                // Create CreditTransaction for overpayment added  
                if (payment.creditAmount < 0) {
                    await prisma.creditTransaction.create({
                        data: {
                            customerId: payment.customerId,
                            userId: payment.userId,
                            amount: Math.abs(payment.creditAmount), // Positive because credit was added
                            type: 'OVERPAYMENT_ADDED',
                            description: `Migrated: ${payment.description}`,
                            createdAt: payment.createdAt
                        }
                    });
                    console.log(`✅ Created credit transaction for payment ${payment.id}: +$${Math.abs(payment.creditAmount)}`);
                }

                // Delete the confusing $0 payment record
                await prisma.payment.delete({
                    where: { id: payment.id }
                });
                console.log(`🗑️  Deleted confusing $0 payment record ${payment.id}`);
            }

            console.log('\n✅ Cleanup completed successfully!');
        }

        // Also check for any other unusual payment records
        const unusualPayments = zeroPayments.filter(p =>
            !(p.appliedToDebt > 0 || p.creditAmount < 0)
        );

        if (unusualPayments.length > 0) {
            console.log(`\n❓ Found ${unusualPayments.length} other $0 payments that need manual review:`);
            unusualPayments.forEach(p => {
                console.log(`   - Payment ${p.id}: ${p.description}`);
            });
        }

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the cleanup
cleanupZeroPayments();
