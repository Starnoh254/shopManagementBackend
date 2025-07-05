-- AlterTable
ALTER TABLE `customer` ADD COLUMN `creditBalance` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `payment` ADD COLUMN `appliedToDebt` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `creditAmount` DOUBLE NOT NULL DEFAULT 0;
