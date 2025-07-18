/*
  Warnings:

  - Added the required column `originalAmount` to the `Debt` table without a default value. This is not possible if the table is not empty.

*/

-- First, add the column with a default value
ALTER TABLE `debt` ADD COLUMN `originalAmount` DOUBLE NOT NULL DEFAULT 0;

-- Set originalAmount to current amount for existing records
UPDATE `debt` SET `originalAmount` = `amount` WHERE `originalAmount` = 0;

-- CreateTable
CREATE TABLE `PaymentAllocation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `paymentId` INTEGER NOT NULL,
    `debtId` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `allocatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaymentAllocation_paymentId_idx`(`paymentId`),
    INDEX `PaymentAllocation_debtId_idx`(`debtId`),
    UNIQUE INDEX `PaymentAllocation_paymentId_debtId_key`(`paymentId`, `debtId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PaymentAllocation` ADD CONSTRAINT `PaymentAllocation_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentAllocation` ADD CONSTRAINT `PaymentAllocation_debtId_fkey` FOREIGN KEY (`debtId`) REFERENCES `Debt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditTransaction` ADD CONSTRAINT `CreditTransaction_relatedPaymentId_fkey` FOREIGN KEY (`relatedPaymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
