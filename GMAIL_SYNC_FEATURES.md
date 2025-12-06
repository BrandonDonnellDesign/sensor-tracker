# Gmail Sync Features & Enhancements

## Overview
Comprehensive Gmail integration for automatic order tracking, inventory management, and error monitoring for diabetes supply orders.

## Features Implemented

### 1. ✅ Error Handling & Logging

**Error Logger Service** (`web/lib/gmail/error-logger.ts`)
- Centralized error tracking for all Gmail sync operations
- Categories: `email_parsing`, `order_matching`, `inventory_update`, `gmail_api`, `database`
- Severity levels: `info`, `warning`, `error`, `critical`
- Automatic database logging with RLS policies
- Console logging based on severity
- Error statistics and analytics

**Database Tables** (`web/supabase/migrations/20251205000010_create_gmail_sync_errors.sql`)
- `gmail_sync_errors` - Tracks all sync errors with full context
- `unmatched_emails` - Stores emails that couldn't be matched to orders for manual review
- Indexes for fast querying
- RLS policies for security
- Cleanup functions for old data

**Integration**
- Sync service automatically logs all errors
- Parsing failures tracked with email content preview
- Order matching failures logged with reason
- Inventory update errors captured with operation type
- Gmail API errors logged with operation context

### 2. ✅ User Sync Status Dashboard

**Gmail Sync Monitor** (`web/app/dashboard/gmail-sync/page.tsx`)
- Real-time error statistics for YOUR account
- View YOUR sync errors with filtering
- Review YOUR unmatched emails
- Mark emails as reviewed
- Refresh data on demand
- Color-coded severity indicators
- **Privacy:** Only shows your own data, not other users

**API Routes**
- `GET /api/gmail/sync-errors` - Fetch errors and statistics
- `DELETE /api/gmail/sync-errors` - Cleanup old errors
- `GET /api/gmail/unmatched-emails` - Fetch unmatched emails
- `PATCH /api/gmail/unmatched-emails/[id]` - Mark as reviewed

**Features**
- Total errors count
- Critical/error count
- Warnings count
- Unmatched emails count
- Detailed error view with stack traces
- Parsed data inspection
- Review workflow for unmatched emails

### 3. ✅ Additional Pharmacy Parsers

**CVS Pharmacy Parser** (`web/lib/gmail/parsers/cvs-parser.ts`)
- Detects CVS pharmacy emails
- Extracts order numbers (8-10 digits)
- Parses tracking numbers
- Identifies diabetes supplies:
  - Dexcom sensors
  - Test strips
  - Insulin
  - Lancets
  - Pump supplies
- Determines order status (ordered/shipped/delivered)
- Extracts delivery dates
- Confidence scoring

**Walgreens Parser** (`web/lib/gmail/parsers/walgreens-parser.ts`)
- Detects Walgreens pharmacy emails
- Extracts order numbers (alphanumeric)
- Parses tracking numbers
- Identifies diabetes supplies:
  - Dexcom sensors
  - Test strips (Contour Next, OneTouch)
  - Insulin (all major brands)
  - Lancets
  - Pump supplies (Omnipod, infusion sets)
- Determines order status
- Extracts delivery dates
- Confidence scoring

**Parser Registry**
- Automatically tries all registered parsers
- Priority-based parsing
- Easy to add new parsers
- Comprehensive test coverage

### 4. ✅ Notification System (Already Implemented)

**Current Implementation**
- Smart notifications with IOB/glucose alerts
- Real-time notifications via Supabase
- Browser push notifications
- Scheduled notifications (every 5 minutes)
- Sensor expiration alerts
- Inventory low stock alerts

**Notification Types**
- Order delivered notifications
- Inventory low stock warnings
- Sync error alerts
- IOB safety warnings
- Glucose-based alerts
- Sensor expiration reminders

**Features**
- Priority levels (low, medium, high, urgent)
- Actionable notifications with links
- Dismissible/non-dismissible options
- Auto-expire functionality
- Frequency control (once, daily, weekly, on-condition)
- Confidence scoring

### 5. ✅ Data Export Functionality

**Export API** (`web/app/api/export/user-data/route.ts`)
- Export all user data in JSON or CSV format
- Selective data export (choose what to include)
- Includes:
  - Glucose readings
  - Insulin doses
  - Food logs
  - Sensor history
  - Supply orders
  - Current inventory
- Secure download with proper headers
- Timestamped filenames

**Export UI Component** (`web/components/settings/data-export.tsx`)
- Format selection (JSON/CSV)
- Checkbox options for data types
- Progress indicator
- Automatic file download
- User-friendly interface
- Perfect for:
  - Insurance claims
  - Doctor appointments
  - Personal backup
  - Data portability

### 6. ✅ Testing

**Unit Tests**
- CVS parser tests (`web/lib/gmail/parsers/__tests__/cvs-parser.test.ts`)
- Walgreens parser tests (`web/lib/gmail/parsers/__tests__/walgreens-parser.test.ts`)
- Test coverage for:
  - Email identification
  - Order parsing
  - Status detection
  - Tracking number extraction
  - Product identification

## Usage

### For Users

**Automatic Order Tracking**
1. Connect Gmail account in Settings
2. System automatically scans for pharmacy emails
3. Orders are matched to existing orders or created new
4. Inventory updates automatically when orders delivered
5. Notifications sent for important events

**View Sync Status**
1. Go to Settings > Gmail Debug
2. View recent sync history
3. See parsed emails and matched orders
4. Check for any errors

**Export Your Data**
1. Go to Settings > Data Export
2. Choose format (JSON or CSV)
3. Select data types to include
4. Click "Export Data"
5. File downloads automatically

### For Users

**Monitor Your Sync Health**
1. Go to Dashboard > Gmail Sync
2. View YOUR error statistics
3. Review YOUR unmatched emails
4. Mark emails as reviewed
5. Investigate YOUR parsing failures
6. **Privacy:** Only your data is visible

**Add New Pharmacy Parser**
1. Create new parser class implementing `EmailParser`
2. Implement `canParse()` and `parse()` methods
3. Register in `ParserRegistry`
4. Add tests
5. Deploy

## Database Schema

### gmail_sync_errors
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- category: TEXT (email_parsing, order_matching, etc.)
- severity: TEXT (info, warning, error, critical)
- message: TEXT
- details: JSONB
- email_id: TEXT
- order_id: UUID (foreign key to orders)
- stack_trace: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### unmatched_emails
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- email_id: TEXT
- vendor: TEXT
- subject: TEXT
- parsed_data: JSONB
- email_date: TIMESTAMPTZ
- reviewed: BOOLEAN
- reviewed_at: TIMESTAMPTZ
- reviewed_by: UUID (foreign key to auth.users)
- notes: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

## API Endpoints

### Gmail Sync Errors
- `GET /api/gmail/sync-errors` - Get recent errors and statistics
- `DELETE /api/gmail/sync-errors` - Cleanup old errors

### Unmatched Emails
- `GET /api/gmail/unmatched-emails` - Get unmatched emails
- `PATCH /api/gmail/unmatched-emails/[id]` - Update review status

### Data Export
- `GET /api/export/user-data?format=json&includeGlucose=true&...` - Export user data

## Security

**Row Level Security (RLS)**
- Users can only see their own errors
- Users can only see their own unmatched emails
- Admins can see all unmatched emails
- System can insert errors for any user

**Data Privacy**
- Email content is truncated in error logs
- Sensitive data is not stored in error details
- Export requires authentication
- All API routes require valid session

## Performance

**Optimizations**
- Indexed queries for fast error lookup
- Automatic cleanup of old errors (30 days)
- Efficient parser registry with early exit
- Batch processing for multiple emails
- Caching of parser results

**Monitoring**
- Error statistics by category
- Error statistics by severity
- Sync success rate tracking
- Performance metrics in admin dashboard

## Future Enhancements

**Potential Additions**
1. More pharmacy parsers (Express Scripts, US Med, Edgepark)
2. Machine learning for better email parsing
3. Automatic order creation from emails
4. Email template customization
5. Webhook notifications for sync events
6. Mobile app integration
7. Advanced analytics on sync patterns
8. Bulk email processing
9. Email attachment parsing (invoices, receipts)
10. Integration with insurance portals

## Troubleshooting

**Common Issues**

1. **Emails not being parsed**
   - Check Gmail connection status
   - Verify email is from supported vendor
   - Check admin dashboard for parsing errors
   - Review unmatched emails for patterns

2. **Orders not matching**
   - Verify order exists in system
   - Check order number format
   - Review matching logic in order-matcher.ts
   - Check unmatched emails for details

3. **Inventory not updating**
   - Check sync errors for inventory_update category
   - Verify order status is "delivered"
   - Check inventory table for duplicates
   - Review migration logs

4. **Sync taking too long**
   - Check number of emails being processed
   - Review Gmail API quota
   - Check database performance
   - Consider increasing sync interval

## Support

For issues or questions:
1. Check admin dashboard for errors
2. Review sync error logs
3. Check unmatched emails
4. Export data for debugging
5. Contact support with error details

## Changelog

### 2025-12-05
- ✅ Added comprehensive error logging system
- ✅ Created admin dashboard for sync monitoring
- ✅ Implemented CVS pharmacy parser
- ✅ Implemented Walgreens pharmacy parser
- ✅ Added data export functionality (JSON/CSV)
- ✅ Created unit tests for new parsers
- ✅ Updated sync service with error logging
- ✅ Added unmatched email tracking
- ✅ Documented notification system
- ✅ Build successful with all features
