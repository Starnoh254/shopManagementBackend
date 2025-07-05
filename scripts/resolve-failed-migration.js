/**
 * RESOLVE FAILED MIGRATION SCRIPT
 * 
 * This script helps resolve the failed migration issue in production.
 * The migration '20250704011602_modular_redesign' failed during deployment.
 */

const { execSync } = require('child_process');
const path = require('path');

async function resolveFailedMigration() {
    console.log('🔧 Resolving failed migration...');

    try {
        console.log('\n📋 Current situation:');
        console.log('- Migration "20250704011602_modular_redesign" failed in production');
        console.log('- This migration drops tables and restructures the database');
        console.log('- Prisma won\'t apply new migrations until this is resolved');

        console.log('\n🎯 Resolution options:');
        console.log('1. Mark the migration as resolved (if changes were partially applied)');
        console.log('2. Rollback and reapply the migration');
        console.log('3. Manual database fixes');

        console.log('\n⚠️  IMPORTANT: This script will attempt to resolve the failed migration.');
        console.log('Make sure you have a database backup before proceeding!');

        // Option 1: Mark the failed migration as resolved
        console.log('\n🔄 Attempting to resolve the failed migration...');

        try {
            // This command marks the failed migration as resolved
            console.log('Running: npx prisma migrate resolve --applied 20250704011602_modular_redesign');

            const result = execSync('npx prisma migrate resolve --applied 20250704011602_modular_redesign', {
                cwd: process.cwd(),
                encoding: 'utf8',
                stdio: 'pipe'
            });

            console.log('✅ Migration resolution output:');
            console.log(result);

            // Now try to deploy remaining migrations
            console.log('\n🚀 Attempting to deploy remaining migrations...');

            const deployResult = execSync('npx prisma migrate deploy', {
                cwd: process.cwd(),
                encoding: 'utf8',
                stdio: 'pipe'
            });

            console.log('✅ Migration deploy output:');
            console.log(deployResult);

            console.log('\n🎉 Success! Failed migration has been resolved.');

        } catch (resolveError) {
            console.log('\n❌ Failed to resolve with --applied flag.');
            console.log('Error:', resolveError.message);

            // Option 2: Try marking it as rolled back
            console.log('\n🔄 Trying alternative approach: marking as rolled back...');

            try {
                console.log('Running: npx prisma migrate resolve --rolled-back 20250704011602_modular_redesign');

                const rollbackResult = execSync('npx prisma migrate resolve --rolled-back 20250704011602_modular_redesign', {
                    cwd: process.cwd(),
                    encoding: 'utf8',
                    stdio: 'pipe'
                });

                console.log('✅ Rollback resolution output:');
                console.log(rollbackResult);

                // Try to deploy again
                console.log('\n🚀 Attempting to deploy migrations after rollback...');

                const deployAfterRollback = execSync('npx prisma migrate deploy', {
                    cwd: process.cwd(),
                    encoding: 'utf8',
                    stdio: 'pipe'
                });

                console.log('✅ Deploy after rollback output:');
                console.log(deployAfterRollback);

                console.log('\n🎉 Success! Migration resolved with rollback approach.');

            } catch (rollbackError) {
                console.log('\n❌ Both resolution approaches failed.');
                console.log('Rollback error:', rollbackError.message);

                console.log('\n🛠️  Manual resolution required:');
                console.log('1. Connect to your production database');
                console.log('2. Check which tables/columns exist from the failed migration');
                console.log('3. Either complete the migration manually or revert changes');
                console.log('4. Update the _prisma_migrations table to mark as resolved');

                console.log('\n📝 Helpful commands:');
                console.log('- Check migration status: npx prisma migrate status');
                console.log('- Mark as applied: npx prisma migrate resolve --applied 20250704011602_modular_redesign');
                console.log('- Mark as rolled back: npx prisma migrate resolve --rolled-back 20250704011602_modular_redesign');
                console.log('- Force reset (⚠️ LOSES DATA): npx prisma migrate reset --force');
            }
        }

    } catch (error) {
        console.error('❌ Error during migration resolution:', error.message);

        console.log('\n🔍 Debugging steps:');
        console.log('1. Check your database connection');
        console.log('2. Verify your DATABASE_URL is correct');
        console.log('3. Ensure you have proper database permissions');
        console.log('4. Check the actual state of your production database');

        console.log('\n📞 If you need help:');
        console.log('- Check Prisma docs: https://pris.ly/d/migrate-resolve');
        console.log('- Review your database logs');
        console.log('- Consider restoring from backup if available');
    }
}

// Self-executing function
resolveFailedMigration().catch(console.error);
