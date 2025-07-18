# Enhanced Payment and Debt Tracking System

## 🎯 Overview

The enhanced payment and debt tracking system provides comprehensive tracking of which specific debts are paid by each payment, calculates debt payment percentages, and maintains a complete audit trail of all payment allocations.

## 🏗️ Database Schema Changes

### New Models

#### PaymentAllocation

Tracks which specific debts were paid by each payment:

```prisma
model PaymentAllocation {
  id          Int     @id @default(autoincrement())
  paymentId   Int
  payment     Payment @relation(fields: [paymentId], references: [id])
  debtId      Int
  debt        Debt    @relation(fields: [debtId], references: [id])
  amount      Float   // How much of this payment went to this debt
  allocatedAt DateTime @default(now())
}
```

### Updated Models

#### Debt Model

Now tracks original debt amount for percentage calculations:

```prisma
model Debt {
  // ...existing fields...
  amount          Float               // Current remaining amount
  originalAmount  Float               // Original debt amount (never changes)
  paymentAllocations PaymentAllocation[] // Track payments made to this debt
}
```

#### Payment Model

Enhanced with allocation tracking:

```prisma
model Payment {
  // ...existing fields...
  allocations     PaymentAllocation[] // Track which debts this payment covered
  creditTransactions CreditTransaction[] // Related credit transactions
}
```

## 🚀 How the Enhanced System Works

### 1. **Payment Process (FIFO - First In, First Out)**

When a customer makes a payment:

```javascript
// Example: Customer owes $150 (3 debts: $50, $60, $40) and pays $100

1. Get unpaid debts (oldest first)
   - Debt #1: $50 (Jan 1st)
   - Debt #2: $60 (Jan 5th)
   - Debt #3: $40 (Jan 10th)

2. Apply payment using FIFO:
   - $50 → Debt #1 (fully paid)
   - $50 → Debt #2 (partially paid, $10 remaining)
   - $0  → Debt #3 (untouched)

3. Create payment allocations:
   - PaymentAllocation: paymentId=123, debtId=1, amount=$50
   - PaymentAllocation: paymentId=123, debtId=2, amount=$50

4. Update debt statuses:
   - Debt #1: isPaid=true, amount=$0
   - Debt #2: amount=$10 (was $60)
   - Debt #3: unchanged
```

### 2. **Debt Percentage Tracking**

Each debt tracks:

- **Original Amount**: Never changes (e.g., $60)
- **Current Amount**: Remaining balance (e.g., $10)
- **Total Paid**: Sum of all allocations (e.g., $50)
- **Percentage Paid**: (Total Paid / Original Amount) × 100 (e.g., 83.33%)

### 3. **Complete Audit Trail**

Every payment creates detailed records:

```javascript
{
  "payment": {
    "id": 123,
    "amount": 100,
    "allocations": [
      {
        "debtId": 1,
        "amount": 50,
        "debt": {
          "description": "Water bottles",
          "originalAmount": 50
        }
      },
      {
        "debtId": 2,
        "amount": 50,
        "debt": {
          "description": "Delivery service",
          "originalAmount": 60
        }
      }
    ]
  }
}
```

## 📡 New API Endpoints

### 1. **Get Payment with Debt Details**

```
GET /api/payments/{paymentId}/details
```

Returns payment with all debt allocations and affected debts.

**Response:**

```javascript
{
  "success": true,
  "payment": {
    "id": 123,
    "amount": 100,
    "paymentMethod": "CASH",
    "allocations": [
      {
        "debtId": 1,
        "amount": 50,
        "debt": {
          "description": "Water bottles",
          "originalAmount": 50,
          "isPaid": true
        }
      }
    ],
    "customer": {
      "name": "John Doe",
      "phone": "+254700000000"
    }
  }
}
```

### 2. **Get Debt Payment History**

```
GET /api/payments/debt/{debtId}/history
```

Returns complete payment history for a specific debt with percentage calculations.

**Response:**

```javascript
{
  "success": true,
  "debt": {
    "id": 1,
    "description": "Water bottles",
    "originalAmount": 100,
    "amount": 25,
    "isPaid": false,
    "paymentSummary": {
      "originalAmount": 100,
      "totalPaid": 75,
      "remainingAmount": 25,
      "percentagePaid": 75.0,
      "isFullyPaid": false,
      "numberOfPayments": 3
    },
    "paymentAllocations": [
      {
        "amount": 30,
        "payment": {
          "amount": 50,
          "paymentMethod": "MPESA",
          "createdAt": "2025-01-15T10:00:00Z"
        }
      }
    ]
  }
}
```

### 3. **Get Customer Debt Summary**

```
GET /api/payments/customer/{customerId}/debt-summary
```

Returns comprehensive debt and payment overview for a customer.

**Response:**

```javascript
{
  "success": true,
  "customer": {
    "id": 1,
    "name": "John Doe",
    "creditBalance": 50
  },
  "debtSummary": {
    "totalDebts": 5,
    "unpaidDebts": 2,
    "paidDebts": 3,
    "totalOriginalDebt": 500,
    "totalRemainingDebt": 150,
    "totalPaidAmount": 350,
    "overallPercentagePaid": 70.0
  },
  "debts": [
    {
      "id": 1,
      "description": "Water bottles",
      "originalAmount": 100,
      "remainingAmount": 25,
      "totalPaid": 75,
      "percentagePaid": 75.0,
      "isPaid": false
    }
  ]
}
```

### 4. **Enhanced Payment Analytics**

```
GET /api/payments/analytics/enhanced?startDate=2025-01-01&endDate=2025-01-31
```

Returns detailed payment analytics with debt tracking insights.

**Response:**

```javascript
{
  "success": true,
  "analytics": {
    "totalPayments": 50,
    "totalAmount": 5000,
    "totalAppliedToDebt": 4500,
    "totalCreditAdded": 500,
    "debtPaymentEffectiveness": {
      "totalDebtsAffected": 75,
      "averageDebtsPerPayment": 1.5
    }
  },
  "payments": [
    {
      "id": 123,
      "amount": 100,
      "debtsAffected": 2,
      "allocations": [
        {
          "debtDescription": "Water bottles",
          "amount": 50
        }
      ]
    }
  ]
}
```

## 💡 Business Benefits

### 1. **Complete Traceability**

- See exactly which debts each payment covered
- Track partial payments over time
- Full audit trail for dispute resolution

### 2. **Better Customer Service**

- Show customers exactly what they paid for
- Provide detailed payment receipts
- Clear breakdown of remaining balances

### 3. **Improved Reporting**

- Calculate debt payment percentages
- Track payment effectiveness
- Identify slow-paying customers

### 4. **Financial Accuracy**

- Prevent double-counting payments
- Ensure FIFO debt payment order
- Automatic credit balance management

## 🔧 Usage Examples

### Recording a Payment

```javascript
// Customer pays $150 towards multiple debts
POST /api/payments/record
{
  "customerId": 1,
  "amount": 150,
  "paymentMethod": "MPESA",
  "description": "Payment via M-Pesa",
  "reference": "ABC123XYZ"
}

// Response shows which debts were paid
{
  "success": true,
  "payment": {
    "allocations": [
      { "debtId": 1, "amount": 100 }, // Debt 1 fully paid
      { "debtId": 2, "amount": 50 }   // Debt 2 partially paid
    ]
  },
  "summary": {
    "debtsPaid": [
      {
        "debtId": 1,
        "originalAmount": 100,
        "amountPaid": 100,
        "fullyPaid": true
      }
    ]
  }
}
```

### Checking Payment Details

```javascript
// Get details of payment #123
GET /api/payments/123/details

// See exactly which debts were affected
{
  "payment": {
    "amount": 150,
    "allocations": [
      {
        "debtId": 1,
        "amount": 100,
        "debt": {
          "description": "Water bottles",
          "originalAmount": 100
        }
      }
    ]
  }
}
```

## 🎯 Key Features

✅ **Payment-to-Debt Mapping**: Every payment tracks which debts it paid  
✅ **Debt Percentage Tracking**: Calculate how much of each debt has been paid  
✅ **FIFO Payment Order**: Always pay oldest debts first  
✅ **Complete Audit Trail**: Full history of all payment allocations  
✅ **Credit Balance Integration**: Automatic credit application with tracking  
✅ **Enhanced Analytics**: Detailed insights into payment patterns  
✅ **Customer Transparency**: Clear breakdown of what was paid when

The enhanced system provides complete visibility into the payment and debt relationship, making it easy to track, report, and manage customer payments with full accountability.
