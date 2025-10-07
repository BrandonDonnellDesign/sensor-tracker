# Integration Health Data Sources

## 📊 **Complete Data Source Breakdown**

### **1. Dexcom API Health**
- **Data Source**: `dexcom_sync_log` table
- **Success Rate**: `(success_count / total_requests) * 100`
- **Error Count**: Count of failed sync attempts (last 24h)
- **Response Time**: `180 + random(100)` ms (simulated)
- **Status Logic**:
  - 🟢 Healthy: ≥95% success rate
  - 🟡 Degraded: 85-94% success rate
  - 🔴 Down: <85% success rate

```sql
-- Success count
SELECT COUNT(*) FROM dexcom_sync_log 
WHERE status = 'success' AND created_at >= '24h ago';

-- Error count
SELECT COUNT(*) FROM dexcom_sync_log 
WHERE status = 'error' AND created_at >= '24h ago';
```

### **2. OCR Service Health**
- **Data Source**: `photos` table (using `sensor_photos` would be more accurate)
- **Success Rate**: `((total - deleted) / total) * 100`
- **Error Count**: Count of deleted photos (proxy for failed processing)
- **Response Time**: `1000 + random(500)` ms (simulated)
- **Status Logic**:
  - 🟢 Healthy: ≥90% success rate
  - 🟡 Degraded: 75-89% success rate
  - 🔴 Down: <75% success rate

```sql
-- Total photos
SELECT COUNT(*) FROM photos WHERE created_at >= '24h ago';

-- Failed photos (deleted)
SELECT COUNT(*) FROM photos 
WHERE is_deleted = true AND created_at >= '24h ago';
```

### **3. Supabase Database Health**
- **Data Source**: Live database query performance
- **Success Rate**: `99.8 + random(0.2)` (simulated high reliability)
- **Error Count**: `random(2)` (simulated low error count)
- **Response Time**: **REAL** - actual query execution time
- **Status Logic**:
  - 🟢 Healthy: <100ms response time
  - 🟡 Degraded: 100-499ms response time
  - 🔴 Down: ≥500ms response time

```sql
-- Test query (timed)
SELECT id FROM profiles LIMIT 1;
```

### **4. Push Notifications Health**
- **Data Source**: `notifications` table
- **Success Rate**: `(read_notifications / total_notifications) * 100`
- **Error Count**: Count of unread notifications
- **Response Time**: `180 + random(100)` ms (simulated)
- **Status Logic**:
  - 🟢 Healthy: ≥70% read rate
  - 🟡 Degraded: 50-69% read rate
  - 🔴 Down: <50% read rate

```sql
-- Total notifications
SELECT COUNT(*) FROM notifications WHERE created_at >= '24h ago';

-- Read notifications
SELECT COUNT(*) FROM notifications 
WHERE read = true AND created_at >= '24h ago';
```

### **5. File Storage Health**
- **Data Source**: `photos` table
- **Success Rate**: `(photos_with_storage / total_photos) * 100`
- **Error Count**: Photos without storage paths
- **Response Time**: `60 + random(40)` ms (simulated)
- **Status Logic**:
  - 🟢 Healthy: ≥98% success rate
  - 🟡 Degraded: 90-97% success rate
  - 🔴 Down: <90% success rate

```sql
-- Photos with storage paths
SELECT COUNT(*) FROM photos 
WHERE storage_path IS NOT NULL AND created_at >= '24h ago';
```

### **6. System Health**
- **Data Source**: `system_logs` table
- **Success Rate**: `max(80, 100 - error_count * 2)`
- **Error Count**: Count of error-level log entries
- **Response Time**: `40 + random(30)` ms (simulated)
- **Status Logic**:
  - 🟢 Healthy: <5 errors
  - 🟡 Degraded: 5-19 errors
  - 🔴 Down: ≥20 errors

```sql
-- Error logs
SELECT COUNT(*) FROM system_logs 
WHERE level = 'error' AND created_at >= '24h ago';
```

## 🔍 **Data Quality Assessment**

### **Real Data Sources** ✅
- **Dexcom API**: Real sync success/failure rates
- **Database**: Real query performance
- **Notifications**: Real delivery/read rates
- **System Logs**: Real error counts
- **File Storage**: Real upload success rates

### **Simulated Data Sources** ⚠️
- **Response Times**: Most are simulated ranges
- **OCR Processing**: Uses photo deletion as proxy
- **Database Success Rate**: High simulated reliability

### **Potential Issues** 🚨
- **OCR Service**: Queries `photos` table but should use `sensor_photos`
- **Response Times**: Mostly simulated, not real API response times
- **Notification Success**: Uses "read" rate instead of delivery status

## 🔧 **Recommendations for Improvement**

### **1. Fix OCR Service Data**
```sql
-- Should use sensor_photos instead of photos
SELECT COUNT(*) FROM sensor_photos 
WHERE photo_url IS NOT NULL AND created_at >= '24h ago';
```

### **2. Real Response Time Tracking**
- Implement actual API response time logging
- Store response times in sync logs
- Calculate real averages instead of simulated ranges

### **3. Better Notification Metrics**
```sql
-- Use delivery_status instead of read status
SELECT COUNT(*) FROM notifications 
WHERE delivery_status = 'delivered' AND created_at >= '24h ago';
```

### **4. Enhanced Error Tracking**
- Add specific error categories
- Track error patterns and trends
- Implement alerting thresholds

The integration health system provides a good overview but could be enhanced with more real-time data and fewer simulated metrics!