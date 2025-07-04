# Simple Debt Management System for Small Businesses

## � Problem Statement

This system replaces the **paper notebook** used by small vendors (water sellers, shops) to track customer debts. Key issues solved:

- ✅ **No more lost books** - All data is stored digitally
- ✅ **Chronological debt history** - Customers can see exactly when they took credit
- ✅ **Easy lookup** - Find any customer's debt history instantly
- ✅ **Automated reminders** - SMS notifications when debt reaches threshold

## 💡 Core Features (MVP)

Your current system already has the essentials:

- ✅ User authentication (shop owner login)
- ✅ Customer management (add customers)
- ✅ Debt tracking (add debt, record payments)
- ✅ **Chronological transaction history** (most important feature!)
- ✅ SMS notifications

## 🎯 Small Business Focus

## 📋 Simplified Database Schema (Current + Essential Improvements)

```prisma
// Current User model (keep as is)
model User {
  id            Int            @id @default(autoincrement())
  email         String         @unique
  password      String
  name          String?
  shopName      String?        // NEW: Shop name for branding
  customers     Customer[]
  transactions  Transaction[]
  createdAt     DateTime       @default(now())
}

// Enhanced Customer model (minimal additions)
model Customer {
  id                Int               @id @default(autoincrement())
  name              String
  phone             String            @unique
  address           String?           // NEW: Optional address
  amountOwed        Float             @default(0)
  totalPaid         Float             @default(0)  // NEW: Track total payments
  lastPaymentDate   DateTime?         // NEW: When they last paid
  is_paid           Boolean           @default(true)

  // Relationships
  userId            Int
  user              User              @relation(fields: [userId], references: [id])
  transactions      Transaction[]

  // Timestamps
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  @@index([userId])
  @@index([phone])
}

// Enhanced Transaction model (key for chronological history)
model Transaction {
  id              Int               @id @default(autoincrement())
  customerId      Int
  customer        Customer          @relation(fields: [customerId], references: [id])
  userId          Int
  user            User              @relation(fields: [userId], references: [id])

  amount          Float
  type            TransactionType   // DEBT or PAYMENT
  description     String?           // "20L water bottles", "Payment received"

  // NEW: Important for small business tracking
  paymentMethod   PaymentMethod     @default(CASH)
  reference       String?           // Receipt number, notes

  createdAt       DateTime          @default(now())

  @@index([customerId, createdAt])  // Fast chronological queries
  @@index([userId, createdAt])
}

enum TransactionType {
  DEBT
  PAYMENT
}

enum PaymentMethod {
  CASH
  MPESA
  BANK_TRANSFER
  OTHER
}
```

## 🔧 Essential API Endpoints (Small Business Focus)

### Core Customer Operations

```
POST   /customer/add                    # Add customer or debt (current)
POST   /customer/deductDebt            # Record payment (current)
GET    /customer/getAllCustomers       # List all customers (current)
GET    /customer/getCustomersWithDebts # Customers who owe money (current)
GET    /customer/:id/history           # CHRONOLOGICAL debt history (current)
```

### NEW: Essential Small Business Features

```
GET    /customer/search?name=xxx       # Quick customer search
GET    /customer/:id/summary           # Customer overview with totals
GET    /reports/daily                  # Today's transactions
GET    /reports/weekly                 # This week's summary
```

## 🎯 Core Use Cases (Water Vendor Example)

### 1. **Customer Comes for Water**

```
1. Vendor searches: "GET /customer/search?name=Mary"
2. If new customer: "POST /customer/add" with debt
3. If existing: "POST /customer/add" (adds to existing debt)
4. Transaction recorded with timestamp for chronological history
```

### 2. **Customer Asks: "When did I take water on credit?"**

```
1. "GET /customer/:id/history"
2. Shows ALL transactions in chronological order:
   - "Jan 15, 2025 - 2 bottles water (KES 100) - DEBT"
   - "Jan 18, 2025 - Payment received (KES 50) - PAYMENT"
   - "Jan 20, 2025 - 3 bottles water (KES 150) - DEBT"
```

### 3. **Customer Makes Payment**

```
1. "POST /customer/deductDebt"
2. Records payment with timestamp
3. Updates amountOwed and lastPaymentDate
4. Customer can see exact payment history
```

## � Essential Reports for Small Business

### Daily Operations

- How much money is owed to me today?
- Who paid me today?
- New debts added today

### Weekly/Monthly

- Total outstanding debt
- Top customers by debt amount
- Payment trends

## 🚀 Implementation Priority (Small Business First)

### ✅ **Phase 1: Already Done (Core MVP)**

1. Customer management
2. Debt tracking with timestamps
3. Chronological transaction history
4. SMS notifications

### 🎯 **Phase 2: Small Business Essentials (Next)**

1. Customer search functionality
2. Better customer summaries (total paid, last payment)
3. Daily/weekly reports
4. Payment method tracking (Cash/M-Pesa)

### � **Phase 3: Nice-to-Have (Future)**

1. Customer photos/profiles
2. Backup/export features
3. Multiple shop locations
4. WhatsApp integration

## 🔑 Key Success Metrics

### For the Water Vendor

- ✅ **No more lost records** - Everything is digital
- ✅ **Instant customer lookup** - Find any customer in seconds
- ✅ **Complete debt history** - Answer "when did I take credit?" instantly
- ✅ **Automated reminders** - SMS when debt gets high
- ✅ **Daily totals** - Know exactly how much is owed

### Technical Success

- Fast chronological queries (indexed by customerId + createdAt)
- Simple, reliable SMS notifications
- Easy-to-use mobile interface
- Data backup and recovery

---

## � Real-World Example: Chronological History

```json
// GET /customer/123/history response
{
  "customer": {
    "name": "Mary Wanjiku",
    "phone": "+254712345678",
    "amountOwed": 200,
    "totalPaid": 800,
    "lastPaymentDate": "2025-01-20T10:30:00Z"
  },
  "history": [
    {
      "date": "2025-01-22T14:00:00Z",
      "type": "DEBT",
      "amount": 100,
      "description": "2 bottles - 20L water",
      "paymentMethod": null
    },
    {
      "date": "2025-01-20T10:30:00Z",
      "type": "PAYMENT",
      "amount": 150,
      "description": "Payment received",
      "paymentMethod": "MPESA"
    },
    {
      "date": "2025-01-18T16:45:00Z",
      "type": "DEBT",
      "amount": 250,
      "description": "5 bottles - 20L water",
      "paymentMethod": null
    }
  ]
}
```

This shows Mary exactly when she took water and when she paid - **replacing the paper book with perfect digital records!**
