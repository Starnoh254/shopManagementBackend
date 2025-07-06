-- AlterTable
ALTER TABLE `Debt` ADD COLUMN `saleId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `saleId` INTEGER NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `businessAddress` VARCHAR(191) NULL,
    ADD COLUMN `businessType` ENUM('PRODUCTS_ONLY', 'SERVICES_ONLY', 'MIXED') NULL DEFAULT 'MIXED',
    ADD COLUMN `currency` VARCHAR(191) NULL DEFAULT 'KES',
    ADD COLUMN `defaultTaxRate` DOUBLE NULL DEFAULT 16;

-- CreateTable
CREATE TABLE `Product` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `sellingPrice` DOUBLE NOT NULL,
    `costPrice` DOUBLE NULL,
    `sku` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL DEFAULT 'piece',
    `trackInventory` BOOLEAN NOT NULL DEFAULT true,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_sku_key`(`sku`),
    INDEX `Product_userId_idx`(`userId`),
    INDEX `Product_category_idx`(`category`),
    INDEX `Product_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `reorderLevel` INTEGER NULL DEFAULT 10,
    `location` VARCHAR(191) NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventoryItem_productId_idx`(`productId`),
    INDEX `InventoryItem_userId_idx`(`userId`),
    UNIQUE INDEX `InventoryItem_productId_userId_key`(`productId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Service` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `price` DOUBLE NOT NULL,
    `costEstimate` DOUBLE NULL,
    `duration` INTEGER NULL,
    `requiresBooking` BOOLEAN NOT NULL DEFAULT false,
    `requiresMaterials` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Service_userId_idx`(`userId`),
    INDEX `Service_category_idx`(`category`),
    INDEX `Service_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceMaterial` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,

    INDEX `ServiceMaterial_serviceId_idx`(`serviceId`),
    INDEX `ServiceMaterial_productId_idx`(`productId`),
    UNIQUE INDEX `ServiceMaterial_serviceId_productId_key`(`serviceId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sale` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleNumber` VARCHAR(191) NULL,
    `customerId` INTEGER NULL,
    `userId` INTEGER NOT NULL,
    `subtotal` DOUBLE NOT NULL,
    `discountAmount` DOUBLE NULL DEFAULT 0,
    `taxAmount` DOUBLE NULL DEFAULT 0,
    `totalAmount` DOUBLE NOT NULL,
    `totalCost` DOUBLE NULL DEFAULT 0,
    `totalProfit` DOUBLE NULL DEFAULT 0,
    `saleType` ENUM('CASH', 'CREDIT', 'PARTIAL_PAYMENT') NOT NULL DEFAULT 'CASH',
    `status` ENUM('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'COMPLETED',
    `notes` VARCHAR(191) NULL,
    `receiptNumber` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Sale_saleNumber_key`(`saleNumber`),
    UNIQUE INDEX `Sale_receiptNumber_key`(`receiptNumber`),
    INDEX `Sale_customerId_idx`(`customerId`),
    INDEX `Sale_userId_idx`(`userId`),
    INDEX `Sale_createdAt_idx`(`createdAt`),
    INDEX `Sale_saleNumber_idx`(`saleNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SaleItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleId` INTEGER NOT NULL,
    `itemType` ENUM('PRODUCT', 'SERVICE') NOT NULL,
    `productId` INTEGER NULL,
    `serviceId` INTEGER NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DOUBLE NOT NULL,
    `totalPrice` DOUBLE NOT NULL,
    `unitCost` DOUBLE NULL DEFAULT 0,
    `totalCost` DOUBLE NULL DEFAULT 0,
    `profit` DOUBLE NULL DEFAULT 0,
    `scheduledFor` DATETIME(3) NULL,
    `isCompleted` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SaleItem_saleId_idx`(`saleId`),
    INDEX `SaleItem_productId_idx`(`productId`),
    INDEX `SaleItem_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Debt_saleId_idx` ON `Debt`(`saleId`);

-- CreateIndex
CREATE INDEX `Payment_saleId_idx` ON `Payment`(`saleId`);

-- AddForeignKey
ALTER TABLE `Debt` ADD CONSTRAINT `Debt_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceMaterial` ADD CONSTRAINT `ServiceMaterial_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceMaterial` ADD CONSTRAINT `ServiceMaterial_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
