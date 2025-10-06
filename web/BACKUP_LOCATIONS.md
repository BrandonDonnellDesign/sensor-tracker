# Database Backup System

## Current Backup Locations

### Development Environment
- **Local Storage**: `./backups/` directory in your project root
- **Full Path**: `C:\Users\Brandon\Projects\sensor-tracker\web\backups\`
- **File Format**: JSON files named `backup_YYYY-MM-DDTHH-mm-ss-sssZ.json`

### Production Options (configurable)
- **AWS S3**: `s3://your-bucket/sensor-tracker-backups/`
- **Google Cloud Storage**: `gs://your-bucket/sensor-tracker-backups/`
- **Azure Blob Storage**: `https://yourstorage.blob.core.windows.net/backups/`

## How Backups Work

### What Gets Backed Up
- ✅ **sensors** table - All sensor records
- ✅ **profiles** table - User profiles and settings
- ✅ **photos** table - Photo metadata
- ✅ **sensor_photos** table - Sensor-specific photos
- ✅ **archived_sensors** table - Historical sensor data

### Backup Structure
```json
{
  "backup_info": {
    "id": "backup_2025-10-05T10-30-00-000Z",
    "created_at": "2025-10-05T10:30:00.000Z",
    "version": "1.0",
    "database_name": "sensor_tracker"
  },
  "tables": {
    "sensors": [...],
    "profiles": [...],
    "photos": [...],
    "sensor_photos": [...],
    "archived_sensors": [...]
  },
  "metadata": {
    "record_counts": {...},
    "total_records": 1234
  }
}
```

## API Endpoints

### Create Backup
- **Endpoint**: POST `/api/admin/system-health`
- **Action**: `backup_database`
- **Creates**: Full database backup file

### Manage Backups
- **List**: GET `/api/admin/backups?action=list`
- **Download**: GET `/api/admin/backups?action=download&id=backup_id`
- **Info**: GET `/api/admin/backups?action=info&id=backup_id`
- **Delete**: DELETE `/api/admin/backups?id=backup_id`

## Security Notes

⚠️ **Important**: Backup files contain sensitive user data
- Store in secure locations
- Encrypt for production use
- Limit access to admin users only
- Regular cleanup of old backups

## File Locations by Environment

### Development
```
C:\Users\Brandon\Projects\sensor-tracker\web\backups\
├── backup_2025-10-05T10-30-00-000Z.json
├── backup_2025-10-04T15-45-30-123Z.json
└── backup_2025-10-03T09-15-45-456Z.json
```

### Production (recommended)
```
AWS S3 Bucket: sensor-tracker-backups/
├── 2025/10/backup_2025-10-05T10-30-00-000Z.json
├── 2025/10/backup_2025-10-04T15-45-30-123Z.json
└── 2025/09/backup_2025-09-30T12-00-00-000Z.json
```

## Restoration Process

1. Download backup file from storage
2. Parse JSON structure
3. Restore tables in order (profiles → sensors → photos → sensor_photos → archived_sensors)
4. Verify record counts match metadata
5. Update application with restored data

## Automated Backup Schedule (Future)

- **Daily**: Keep 7 days
- **Weekly**: Keep 4 weeks  
- **Monthly**: Keep 12 months
- **Yearly**: Keep indefinitely