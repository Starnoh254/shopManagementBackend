# Sales System for Small Businesses in Kenya

## 🎯 **Problem Statement**

### **Current Pain Points for Small Business Owners:**

1. **Manual Record Keeping**: Writing sales in books wastes time and is error-prone
2. **No Profit/Loss Visibility**: Owners don't know if they're making money
3. **No Inventory Tracking**: Don't know what's in stock or when to reorder
4. **Mixed Product/Service Sales**: Many shops sell both products AND services
5. **No Customer History**: Can't track customer purchase patterns
6. **No Reports**: No way to analyze sales trends or performance

### **Our Solution:**

A **flexible digital sales system** that handles:

- ✅ **Both Products AND Services** (or combination)
- ✅ **Real-time Profit/Loss tracking**
- ✅ **Automatic inventory management**
- ✅ **Customer purchase history**
- ✅ **Sales analytics and reports**
- ✅ **Mobile-friendly interface**

## 🎯 **Architecture Decision: Extend Current System**

### **Why NOT Microservices (Yet):**

1. **Data Consistency**: Sales, debts, and payments are tightly coupled
2. **Transaction Complexity**: Cross-service transactions are complex
3. **Small Team**: Microservices add operational overhead
4. **Shared Entities**: Customer, Payment data needed everywhere
5. **Development Speed**: Single codebase = faster development

### **Current System Structure:**

```
Backend/
├── src/
│   ├── controllers/
│   │   ├── customerController.js
│   │   ├── debtController.js
│   │   └── paymentController.js
│   ├── services/
│   │   ├── customerService.js
│   │   ├── debtService.js
│   │   └── paymentService.js
│   └── routes/
│       ├── customerRoutes.js
│       ├── debtRoutes.js
│       └── paymentRoutes.js
```

### **Proposed Sales Module Addition:**

```
Backend/
├── src/
│   ├── controllers/
│   │   ├── customerController.js
│   │   ├── debtController.js
│   │   ├── paymentController.js
│   │   ├── salesController.js      ← NEW
│   │   ├── productController.js    ← NEW
│   │   └── inventoryController.js  ← NEW
│   ├── services/
│   │   ├── customerService.js
│   │   ├── debtService.js
│   │   ├── paymentService.js
│   │   ├── salesService.js         ← NEW
│   │   ├── productService.js       ← NEW
│   │   └── inventoryService.js     ← NEW
│   └── routes/
│       ├── customerRoutes.js
│       ├── debtRoutes.js
│       ├── paymentRoutes.js
│       ├── salesRoutes.js          ← NEW
│       ├── productRoutes.js        ← NEW
│       └── inventoryRoutes.js      ← NEW
```

## 📊 **Database Schema Extensions**

### **New Tables Needed:**

```prisma
// PRODUCTS MODULE
model Product {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  price       Float
  cost        Float?    // Purchase cost
  sku         String?   @unique
  category    String?
  userId      Int
  user        User      @relation(fields: [userId], references: [id])

  // Relations
  inventoryItems InventoryItem[]
  saleItems      SaleItem[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId])
  @@index([category])
}

// INVENTORY MODULE
model InventoryItem {
  id          Int       @id @default(autoincrement())
  productId   Int
  product     Product   @relation(fields: [productId], references: [id])
  quantity    Int
  reorderLevel Int?     // Minimum stock level
  location    String?   // Shelf, warehouse location
  userId      Int
  user        User      @relation(fields: [userId], references: [id])

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([productId])
  @@index([userId])
  @@unique([productId, userId]) // One inventory per product per user
}

// SALES MODULE
model Sale {
  id          Int         @id @default(autoincrement())
  customerId  Int?        // Optional - can have walk-in sales
  customer    Customer?   @relation(fields: [customerId], references: [id])
  userId      Int
  user        User        @relation(fields: [userId], references: [id])

  totalAmount Float
  discountAmount Float?   @default(0)
  taxAmount   Float?     @default(0)
  finalAmount Float      // After discount/tax

  saleType    SaleType   @default(CASH)
  status      SaleStatus @default(COMPLETED)

  // Relations
  saleItems   SaleItem[]
  payments    Payment[]  // Link to existing payment system
  debt        Debt?      // If sale on credit

  notes       String?
  receiptNumber String? @unique

  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([customerId])
  @@index([userId])
  @@index([createdAt])
}

// SALE ITEMS (Line items for each sale)
model SaleItem {
  id          Int      @id @default(autoincrement())
  saleId      Int
  sale        Sale     @relation(fields: [saleId], references: [id])
  productId   Int
  product     Product  @relation(fields: [productId], references: [id])

  quantity    Int
  unitPrice   Float    // Price at time of sale
  totalPrice  Float    // quantity * unitPrice

  @@index([saleId])
  @@index([productId])
}

enum SaleType {
  CASH
  CREDIT
  PARTIAL_PAYMENT
}

enum SaleStatus {
  PENDING
  COMPLETED
  CANCELLED
  REFUNDED
}
```

### **Update Existing Models:**

```prisma
model User {
  // ...existing fields...
  products    Product[]
  inventory   InventoryItem[]
  sales       Sale[]
}

model Customer {
  // ...existing fields...
  sales       Sale[]      // Customer's purchase history
}

model Payment {
  // ...existing fields...
  saleId      Int?        // Link payment to sale
  sale        Sale?       @relation(fields: [saleId], references: [id])
}
```

## 🔄 **Integration Points**

### **1. Cash Sales Flow:**

```
Product Selection → Inventory Check → Sale Creation → Payment → Inventory Update
```

### **2. Credit Sales Flow:**

```
Product Selection → Inventory Check → Sale Creation → Debt Creation → Inventory Update
```

### **3. Partial Payment Flow:**

```
Product Selection → Sale Creation → Partial Payment → Remaining Debt Creation
```

## 🚀 **Implementation Phases**

### **Phase 1: Basic Sales (Week 1)**

- Add Product model and basic CRUD
- Add Sale model with cash sales only
- Simple inventory tracking (manual updates)

### **Phase 2: Inventory Management (Week 2)**

- Automatic inventory updates on sales
- Low stock alerts
- Inventory reports

### **Phase 3: Credit Sales Integration (Week 3)**

- Integrate with existing debt system
- Credit sales create debts automatically
- Payment allocation between old debts and new sales

### **Phase 4: Advanced Features (Week 4)**

- Sales analytics and reports
- Product categories and search
- Bulk operations
- Receipt generation

## 🎯 **Benefits of This Approach**

### **Immediate Benefits:**

- ✅ Leverage existing authentication, middleware, error handling
- ✅ Share customer data seamlessly
- ✅ Unified payment system
- ✅ Single database = ACID transactions
- ✅ Faster development

### **Future Migration Path:**

When you grow larger, you can extract modules:

```
Current Monolith → Domain Services → Microservices

1. Extract Sales Service (keep shared DB)
2. Extract Product/Inventory Service
3. Eventually separate databases if needed
```

## 🛠️ **When to Consider Microservices**

Consider microservices when you have:

- Multiple teams (5+ developers)
- Different scaling requirements
- Different technology needs
- Regulatory separation requirements
- Complex domain boundaries

For now, your modular monolith will serve you much better!

## 🎉 **Next Steps**

1. **Create the sales migration**: Add Product, Sale, SaleItem tables
2. **Build basic sales controller**: Create, read, update operations
3. **Integrate with existing systems**: Link to customers and payments
4. **Add inventory management**: Track stock levels
5. **Build sales reports**: Analytics and insights

Would you like me to start implementing the sales module? We can begin with the database schema and basic CRUD operations.
