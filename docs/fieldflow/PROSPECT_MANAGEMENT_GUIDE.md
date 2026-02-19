# FieldFlow Prospect Management Guide

This guide covers how to manage prospects in FieldFlow, from adding new leads to tracking them through your sales pipeline.

## Overview

Prospects in FieldFlow represent potential customers you're targeting. Each prospect can track:
- Company and contact information
- Location data for route planning
- Status through your sales pipeline
- Estimated deal value
- Custom fields and tags
- Activity history

## Adding Prospects

### Manual Entry

1. Navigate to **Prospects** from the main menu
2. Click **Add Prospect** (+ button)
3. Fill in the prospect details:

**Required Fields:**
- Company Name

**Recommended Fields:**
- Contact Name
- Phone Number
- Email Address
- Street Address
- City
- Province

**Optional Fields:**
- Contact Title
- Estimated Value
- Priority (Low, Medium, High, Urgent)
- Notes

### Using the Map

1. In the "Add Prospect" form, click **Map**
2. Search for the address or click on the map
3. The location will auto-populate address fields
4. GPS coordinates are saved for route planning

### Importing from CSV

For bulk imports:

1. Click the **Import** button
2. Select your CSV file
3. Map columns to FieldFlow fields:
   - Company Name (required)
   - Contact Name
   - Email
   - Phone
   - Address, City, Province
   - Status, Priority
4. Preview the import
5. Click **Import** to add prospects

**CSV Template:**
```csv
Company Name,Contact Name,Email,Phone,City,Province
ABC Corp,John Smith,john@abc.com,0821234567,Johannesburg,Gauteng
XYZ Ltd,Jane Doe,jane@xyz.co.za,0839876543,Cape Town,Western Cape
```

## Prospect Statuses

Prospects move through these stages:

| Status | Description |
|--------|-------------|
| **New** | Recently added, not yet contacted |
| **Contacted** | Initial contact made |
| **Qualified** | Confirmed as a valid opportunity |
| **Proposal** | Quote or proposal sent |
| **Won** | Deal closed successfully |
| **Lost** | Deal did not close |

### Changing Status

- From the prospect list: Click the ⋮ menu → Change Status
- From prospect detail: Use the status dropdown
- Bulk update: Enable selection mode → select prospects → Change Status

## Finding Prospects

### Search
Use the search bar to find prospects by:
- Company name
- Contact name
- City
- Tags

### Filters

**By Status:** Click status buttons to filter (New, Contacted, etc.)

**By Tags:** Click a tag to filter by that tag

**Combined:** Filters can be combined (e.g., "New" status + "IT" tag)

### Nearby Prospects

Find prospects near your current location:

1. Click **Find Nearby**
2. Allow location access
3. Select radius (1km, 5km, 10km, 25km)
4. View prospects on the map
5. Filter by status or priority

## Managing Prospects

### Editing

1. Click on a prospect to view details
2. Edit any field directly
3. Changes auto-save

### Deleting

1. From list: Click ⋮ menu → Delete
2. From detail: Click Delete button
3. Confirm deletion

**Note:** Deleting is permanent. Associated meetings and activities remain in history.

### Bulk Operations

Enable selection mode to:
- **Bulk Status Change**: Update multiple prospects at once
- **Bulk Delete**: Remove multiple prospects
- **Bulk Export**: Export selected to CSV

## Tags and Organization

### Adding Tags

1. Open prospect detail
2. Click **Add Tag**
3. Enter tag name or select existing
4. Press Enter

### Managing Tags

- Tags are shared across all prospects
- Click a tag on any prospect to filter by it
- Remove tags by clicking the X on the tag

### Suggested Uses

- Industry: "Mining", "Manufacturing", "IT"
- Source: "Referral", "Cold Call", "Website"
- Product Interest: "Pumps", "Pipes", "Services"

## Custom Fields

Add fields specific to your business:

1. Go to **Settings → Custom Fields**
2. Click **Add Field**
3. Configure:
   - Field Name
   - Field Type (Text, Number, Date, Dropdown)
   - Required (yes/no)
4. Save

Custom fields appear on all prospect forms.

## Activity Tracking

### Automatic Activities

FieldFlow automatically logs:
- Status changes
- Meetings scheduled
- Visits completed
- Follow-ups created

### Manual Activities

Add notes or activities:
1. Open prospect detail
2. Scroll to Activity section
3. Click **Add Activity**
4. Enter details and save

## Follow-ups

### Scheduling Follow-ups

1. Open prospect detail
2. Click **Schedule Follow-up**
3. Set date and time
4. Add notes (optional)
5. Save

### Follow-up Reminders

- Email reminders sent at scheduled time
- Overdue follow-ups appear on dashboard
- Snooze option to postpone

### Recurring Follow-ups

For regular check-ins:
1. Create follow-up
2. Enable "Recurring"
3. Set frequency (Weekly, Monthly)
4. Set end date (optional)

## Duplicate Detection

FieldFlow detects potential duplicates based on:
- Company name similarity
- Email address
- Phone number

### Merging Duplicates

1. Go to **Prospects → Duplicates**
2. Review suggested matches
3. Select the primary record
4. Click **Merge**
5. Data from both records is combined

## Exporting Data

### CSV Export

1. Click **Export** button
2. All prospects (or filtered set) export to CSV
3. File downloads automatically

### Included Fields

- All standard fields
- Custom fields
- Tags
- Status
- Timestamps

## Best Practices

1. **Complete Profiles**: Fill in as much information as possible
2. **Use Tags**: Organize prospects for easy filtering
3. **Update Regularly**: Keep status current after interactions
4. **Set Follow-ups**: Never let a prospect go cold
5. **Add Location**: Enable route planning by adding addresses

## Related Guides

- [Meeting Recording Guide](./MEETING_RECORDING_GUIDE.md) - Log meetings with prospects
- [CRM Integration Guide](./CRM_INTEGRATION_GUIDE.md) - Sync with external CRMs
