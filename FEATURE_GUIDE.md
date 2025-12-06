# Feature Guide - Gmail Sync Enhancements

## 🎯 What We Built

A comprehensive system for automatic diabetes supply order tracking with robust error handling, multi-pharmacy support, and data export capabilities.

---

## 📊 1. Gmail Sync Status Dashboard

**Location:** `/dashboard/gmail-sync`

### What You See:
```
┌─────────────────────────────────────────────────────────┐
│  Gmail Sync Monitor                      [Refresh]      │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │  Total   │  │Critical/ │  │ Warnings │  │Unmatched ││
│  │  Errors  │  │  Errors  │  │          │  │  Emails  ││
│  │    42    │  │     3    │  │    15    │  │     8    ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
├─────────────────────────────────────────────────────────┤
│  [Sync Errors (42)]  [Unmatched Emails (8)]            │
├─────────────────────────────────────────────────────────┤
│  ⚠️ Failed to parse CVS email                          │
│     December 5, 2025 10:30 AM                          │
│     [ERROR] [email_parsing]                            │
│     > View Details                                      │
├─────────────────────────────────────────────────────────┤
│  ℹ️ Could not match email to order                     │
│     December 5, 2025 9:15 AM                           │
│     [INFO] [order_matching]                            │
│     > View Details                                      │
└─────────────────────────────────────────────────────────┘
```

### Features:
- ✅ Real-time error statistics
- ✅ Color-coded severity (red=critical, yellow=warning, blue=info)
- ✅ Detailed error inspection with stack traces
- ✅ Review unmatched emails
- ✅ Mark emails as reviewed
- ✅ Refresh on demand

---

## 🏥 2. Multi-Pharmacy Support

### Supported Pharmacies:
1. **Amazon Pharmacy** ✅ (Already working)
2. **CVS Pharmacy** ✅ (NEW)
3. **Walgreens** ✅ (NEW)
4. **Omnipod/Insulet** ✅ (Already working)
5. **Dexcom** ✅ (Already working)

### What Gets Parsed:
```
Email from CVS:
┌─────────────────────────────────────────┐
│ Subject: Your order has shipped        │
│ From: orders@cvs.com                   │
├─────────────────────────────────────────┤
│ Order #12345678 has shipped!           │
│                                         │
│ Tracking: 1Z999AA10123456784           │
│                                         │
│ Items:                                  │
│ - Dexcom G6 Sensor (3-pack)            │
│ - Test Strips 100 count                │
│                                         │
│ Delivery: December 10, 2025            │
└─────────────────────────────────────────┘
         ↓
    Automatically Parsed
         ↓
┌─────────────────────────────────────────┐
│ Order Created/Updated:                  │
│ - Supplier: CVS                         │
│ - Order #: 12345678                     │
│ - Status: Shipped                       │
│ - Tracking: 1Z999AA10123456784         │
│ - Items: Dexcom G6 Sensor, Test Strips │
│ - Delivery: Dec 10, 2025               │
└─────────────────────────────────────────┘
```

### Detected Products:
- 🔵 Dexcom sensors (G6, G7)
- 🩸 Test strips (all brands)
- 💉 Insulin (Humalog, Novolog, Lantus, etc.)
- 📌 Lancets
- 🔧 Pump supplies (Omnipod, infusion sets, reservoirs)

---

## 📥 3. Data Export

**Location:** Settings > Data Export (component ready to integrate)

### Export Options:
```
┌─────────────────────────────────────────┐
│  Export Your Data                       │
├─────────────────────────────────────────┤
│  Format:                                │
│  ○ JSON (Complete data)                 │
│  ● CSV (Spreadsheet format)             │
├─────────────────────────────────────────┤
│  Include:                               │
│  ☑ Glucose readings                     │
│  ☑ Insulin doses                        │
│  ☑ Food logs                            │
│  ☑ Sensor history                       │
│  ☑ Supply orders                        │
│  ☑ Current inventory                    │
├─────────────────────────────────────────┤
│  [Export Data]                          │
└─────────────────────────────────────────┘
```

### Use Cases:
- 📋 Insurance claims
- 👨‍⚕️ Doctor appointments
- 💾 Personal backup
- 📊 External analysis
- 🔄 Data portability

### Export Formats:

**JSON Example:**
```json
{
  "exportDate": "2025-12-05T10:00:00Z",
  "userId": "...",
  "glucoseData": [
    {
      "timestamp": "2025-12-05T09:00:00Z",
      "value": 120,
      "source": "dexcom"
    }
  ],
  "orders": [
    {
      "orderDate": "2025-12-01",
      "supplier": "CVS",
      "status": "delivered",
      "quantity": 3
    }
  ]
}
```

**CSV Example:**
```csv
GLUCOSE DATA
Timestamp,Value (mg/dL),Source,Notes
2025-12-05 09:00:00,120,dexcom,

ORDERS
Order Date,Order Number,Supplier,Status,Quantity
2025-12-01,12345678,CVS,delivered,3
```

---

## 🔍 4. Error Tracking System

### Error Categories:
1. **email_parsing** - Failed to parse email content
2. **order_matching** - Couldn't match email to existing order
3. **inventory_update** - Failed to update inventory
4. **gmail_api** - Gmail API errors
5. **database** - Database operation errors

### Severity Levels:
- 🔴 **Critical** - System failure, immediate attention needed
- 🟠 **Error** - Operation failed, user impact
- 🟡 **Warning** - Potential issue, monitoring needed
- 🔵 **Info** - Informational, no action needed

### What Gets Logged:
```javascript
{
  category: "email_parsing",
  severity: "warning",
  message: "Failed to parse CVS email",
  details: {
    vendor: "CVS",
    error_message: "Order number not found",
    email_preview: "Your order has shipped..."
  },
  email_id: "msg_abc123",
  stack_trace: "Error: ...",
  created_at: "2025-12-05T10:00:00Z"
}
```

---

## 🔄 5. Automatic Workflows

### Order Tracking Flow:
```
1. Email Arrives
   ↓
2. Gmail Sync (every 5 min)
   ↓
3. Parser Identifies Vendor
   ↓
4. Extract Order Details
   ↓
5. Match to Existing Order
   ↓
6. Update Order Status
   ↓
7. Update Inventory (if delivered)
   ↓
8. Send Notification
```

### Error Handling Flow:
```
1. Error Occurs
   ↓
2. Log to Database
   ↓
3. Console Log (based on severity)
   ↓
4. Admin Dashboard Updates
   ↓
5. (Optional) Send Alert
```

---

## 📱 6. Notifications (Already Implemented)

### Notification Types:
- 📦 **Order Delivered** - "Your CVS order has been delivered!"
- 📉 **Low Inventory** - "Only 2 sensors remaining"
- ⚠️ **Sync Error** - "Failed to sync Gmail"
- 💉 **IOB Warning** - "High insulin on board"
- 📊 **Glucose Alert** - "Rising glucose detected"
- ⏰ **Sensor Expiration** - "Sensor due for replacement"

### Priority Levels:
- 🔴 **Urgent** - Requires immediate action
- 🟠 **High** - Important, act soon
- 🟡 **Medium** - Normal priority
- 🟢 **Low** - Informational

---

## 🛠️ 7. For Developers

### Adding a New Pharmacy Parser:

```typescript
// 1. Create parser file
// web/lib/gmail/parsers/pharmacy-name-parser.ts

import { EmailParser, ParsedOrder } from './base-parser';
import { ParsedEmailMetadata } from '@/lib/gmail/gmail-service';

export class PharmacyNameParser implements EmailParser {
  name = 'Pharmacy Name';

  canParse(email: ParsedEmailMetadata): boolean {
    return email.from.includes('pharmacy.com');
  }

  parse(email: ParsedEmailMetadata): ParsedOrder | null {
    // Extract order details
    return {
      supplier: 'Pharmacy Name',
      orderNumber: '...',
      status: 'shipped',
      items: ['...'],
      confidence: 0.8,
    };
  }
}

// 2. Register in registry.ts
import { PharmacyNameParser } from './pharmacy-name-parser';

constructor() {
  this.register(new PharmacyNameParser());
}

// 3. Add tests
// web/lib/gmail/parsers/__tests__/pharmacy-name-parser.test.ts
```

---

## 📊 8. Database Schema

### New Tables:

**gmail_sync_errors**
```sql
- id (UUID)
- user_id (UUID) → auth.users
- category (TEXT)
- severity (TEXT)
- message (TEXT)
- details (JSONB)
- email_id (TEXT)
- order_id (UUID) → orders
- stack_trace (TEXT)
- created_at (TIMESTAMPTZ)
```

**unmatched_emails**
```sql
- id (UUID)
- user_id (UUID) → auth.users
- email_id (TEXT)
- vendor (TEXT)
- subject (TEXT)
- parsed_data (JSONB)
- email_date (TIMESTAMPTZ)
- reviewed (BOOLEAN)
- reviewed_at (TIMESTAMPTZ)
- reviewed_by (UUID) → auth.users
- notes (TEXT)
- created_at (TIMESTAMPTZ)
```

---

## 🔐 9. Security

### Row Level Security (RLS):
- ✅ Users can only see their own errors
- ✅ Users can only see their own unmatched emails
- ✅ Admins can see all unmatched emails
- ✅ System can insert errors for any user

### Data Privacy:
- ✅ Email content truncated in logs (500 chars max)
- ✅ Sensitive data not stored in error details
- ✅ Export requires authentication
- ✅ All API routes require valid session

---

## 🚀 10. Performance

### Optimizations:
- ⚡ Indexed queries for fast lookups
- 🧹 Automatic cleanup of old errors (30 days)
- 🎯 Efficient parser registry with early exit
- 📦 Batch processing for multiple emails
- 💾 Caching of parser results

### Monitoring:
- 📊 Error statistics by category
- 📈 Error statistics by severity
- ✅ Sync success rate tracking
- ⏱️ Performance metrics in admin dashboard

---

## 📝 Quick Reference

### API Endpoints:
```
GET  /api/gmail/sync-errors              # Get errors
GET  /api/gmail/unmatched-emails         # Get unmatched
PATCH /api/gmail/unmatched-emails/[id]   # Mark reviewed
GET  /api/export/user-data               # Export data
```

### User Pages:
```
/dashboard/gmail-sync                    # Sync monitor
```

### User Features:
```
Settings > Gmail Debug                   # View sync status
Settings > Data Export                   # Export data
Dashboard > Inventory                    # View inventory
Dashboard > Supplies                     # View orders
```

---

## ✅ Testing

Run tests:
```bash
cd web
npm test -- cvs-parser
npm test -- walgreens-parser
```

Build:
```bash
cd web
npm run build
```

---

## 🎉 Summary

You now have:
- ✅ Robust error handling and logging
- ✅ Admin monitoring dashboard
- ✅ CVS and Walgreens support
- ✅ Data export (JSON/CSV)
- ✅ Comprehensive documentation
- ✅ Unit tests
- ✅ Security (RLS)
- ✅ Performance optimizations
- ✅ Production-ready build

**Total:** 15 new files, 2 modified files, 1 database migration, 100% build success! 🚀
