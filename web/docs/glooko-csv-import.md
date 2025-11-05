# Glooko CSV Import for Insulin Data

This feature allows users to import their insulin dose history from Glooko CSV exports directly into the application using a dedicated insulin logging system.

## Features

- **Automatic Column Detection**: Intelligently detects column names regardless of exact format
- **Insulin Type Classification**: Automatically categorizes insulin as rapid, short, intermediate, long, ultra-long, or premixed
- **Basal/Bolus Detection**: Distinguishes between basal and bolus insulin deliveries
- **Duplicate Prevention**: Skips duplicate entries based on insulin type, dose, and timing
- **Error Handling**: Provides detailed feedback on import success/failures
- **Format Guide**: Built-in documentation to help users understand CSV requirements

## How to Use

1. **Export from Glooko**:
   - Log into your Glooko account
   - Navigate to Reports → Data Export
   - Select your desired date range
   - Choose "Insulin" as the data type
   - Download the CSV file

2. **Import to Application**:
   - Go to Dashboard → Insulin → History
   - Click "Import CSV" button
   - Upload your Glooko CSV file
   - Review the import results

## Supported CSV Formats

### Required Columns
- **Date/Time**: Date and time of insulin dose
- **Insulin Type**: Name or type of insulin medication
- **Dose**: Amount of insulin in units

### Optional Columns
- **Injection Site**: Body location where insulin was administered
- **Notes**: Additional comments or context

### Column Name Variations
The system automatically detects these column name variations:

| Data Type | Possible Column Names |
|-----------|----------------------|
| Date/Time | Date, Timestamp, Event Date, Log Date, DateTime |
| Time | Time, Event Time, Log Time |
| Insulin Type | Insulin Type, Medication, Drug Name, Insulin Name, Type |
| Dose | Dose, Amount, Units, Dosage, Insulin Dose, Value |
| Injection Site | Injection Site, Site, Location, Body Part |
| Notes | Notes, Comment, Comments, Description, Memo |

## Insulin Type Recognition

The system recognizes and maps these common insulin types with automatic basal/bolus classification:

### Rapid-Acting (Usually Bolus)
- Humalog, NovoLog, Apidra, Fiasp
- Generic terms: "rapid", "fast", "bolus"

### Short-Acting (Usually Bolus)
- Regular, Humulin R, Novolin R

### Intermediate-Acting (Usually Basal)
- NPH, Humulin N, Novolin N

### Long-Acting (Basal)
- Lantus, Levemir, Tresiba, Basaglar
- Generic terms: "long", "basal"

### Ultra-Long-Acting (Basal)
- Toujeo, Degludec

### Premixed (Mixed Delivery)
- 70/30, 75/25, Premix

## Delivery Type Classification

The system automatically determines delivery type:
- **Bolus**: Meal-time insulin (rapid/short-acting)
- **Basal**: Background insulin (long/ultra-long-acting)
- **Correction**: High blood sugar corrections
- **Meal**: Specifically for meal coverage

## Date Format Support

The system supports various date formats:
- ISO format: `2024-11-01T08:30:00Z`
- US format: `11/01/2024 8:30 AM`
- European format: `01.11.2024 08:30`
- Simple date: `2024-11-01`

## Import Process

1. **File Validation**: Checks that the uploaded file is a valid CSV
2. **Column Detection**: Automatically identifies required and optional columns
3. **Data Parsing**: Processes each row and validates data
4. **Insulin Classification**: Determines insulin type and delivery method
5. **Duplicate Check**: Compares against existing logs (±5 minutes tolerance)
6. **Data Import**: Saves valid entries directly to insulin_logs table
7. **Results Summary**: Provides detailed feedback on the import process

## Error Handling

The system provides detailed feedback for:
- **Invalid file format**: Non-CSV files are rejected
- **Missing columns**: Required columns must be present
- **Invalid dates**: Unparseable date/time values are skipped
- **Invalid doses**: Non-numeric or zero/negative doses are skipped
- **Duplicates**: Entries matching existing logs are skipped
- **Database errors**: Connection or constraint issues are reported

## API Endpoints

### POST `/api/insulin/import/glooko`
Handles CSV file upload and processing.

**Request**: Multipart form data with CSV file
**Response**: Import results with counts and error details

### GET `/api/medications/logs`
Retrieves insulin logs when category=insulin, uses dedicated insulin_logs table.

**Parameters**:
- `category`: Set to "insulin" for insulin logs
- `days`: Number of days to look back
- `limit`: Maximum number of results
- `offset`: Pagination offset

## Database Structure

The system uses a dedicated `insulin_logs` table with these key fields:
- `insulin_type`: rapid, short, intermediate, long, ultra_long, premixed
- `delivery_type`: bolus, basal, correction, meal
- `units`: Insulin dose amount
- `insulin_name`: Brand name (Humalog, Lantus, etc.)
- `taken_at`: Timestamp of insulin delivery
- `injection_site`: Body location or device
- `meal_relation`: Relationship to meals
- `logged_via`: Import source tracking

## Security Considerations

- All imports are user-scoped (users can only import to their own account)
- File size limits prevent abuse
- Input validation prevents injection attacks
- Row-level security ensures data isolation
- Dedicated table structure prevents medication system complexity

## Future Enhancements

- Support for other CGM/diabetes management platforms
- Bulk export functionality
- Advanced filtering and search by delivery type
- Data visualization and analytics for basal vs bolus patterns
- Automated duplicate resolution options
- Integration with insulin pump data