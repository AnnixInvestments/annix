# FieldFlow CRM Integration Guide

This guide explains how to connect FieldFlow to external CRM systems for bidirectional data synchronization.

## Supported CRMs

FieldFlow integrates with:
- **Salesforce** - Leads, Contacts, Activities
- **HubSpot** - Contacts, Deals, Meetings
- **Pipedrive** - Persons, Deals, Activities

## Benefits of CRM Integration

- **Single Source of Truth**: Data stays consistent across systems
- **Eliminate Duplicate Entry**: Update once, sync everywhere
- **Complete Activity History**: All interactions in both systems
- **Team Visibility**: Managers see field activity in CRM
- **Automated Updates**: Changes sync automatically

## Connecting Your CRM

### General Steps

1. Go to **Settings → CRM**
2. Click **Connect CRM**
3. Select your CRM platform
4. Sign in with your CRM credentials
5. Authorize FieldFlow access
6. Configure sync settings

### Salesforce Setup

**Prerequisites:**
- Salesforce account with API access
- System Administrator or appropriate permissions

**Connection Steps:**
1. Click **Connect Salesforce**
2. Sign in to Salesforce
3. Click **Allow** to authorize
4. Select objects to sync:
   - Leads
   - Contacts
   - Accounts
   - Events/Tasks

**Field Mapping:**
| FieldFlow | Salesforce |
|-----------|------------|
| Company Name | Account Name / Lead Company |
| Contact Name | Contact Name / Lead Name |
| Email | Email |
| Phone | Phone |
| Status | Lead Status / Stage |
| Notes | Description |

### HubSpot Setup

**Prerequisites:**
- HubSpot account with CRM access
- Super Admin or Marketing/Sales permissions

**Connection Steps:**
1. Click **Connect HubSpot**
2. Sign in to HubSpot
3. Select your HubSpot account
4. Click **Connect app**
5. Choose objects to sync:
   - Contacts
   - Companies
   - Deals
   - Meetings

**Field Mapping:**
| FieldFlow | HubSpot |
|-----------|---------|
| Company Name | Company Name |
| Contact Name | Contact Name |
| Email | Email |
| Phone | Phone Number |
| Status | Deal Stage |
| Estimated Value | Deal Amount |

### Pipedrive Setup

**Prerequisites:**
- Pipedrive account
- Admin access recommended

**Connection Steps:**
1. Click **Connect Pipedrive**
2. Sign in to Pipedrive
3. Authorize FieldFlow access
4. Select sync options:
   - Persons
   - Organizations
   - Deals
   - Activities

**Field Mapping:**
| FieldFlow | Pipedrive |
|-----------|-----------|
| Company Name | Organization Name |
| Contact Name | Person Name |
| Email | Email |
| Phone | Phone |
| Status | Deal Stage |
| Meetings | Activities |

## Sync Configuration

### Sync Direction

**Bidirectional (Recommended):**
- Changes in FieldFlow update CRM
- Changes in CRM update FieldFlow
- Best for teams using both systems

**FieldFlow → CRM Only:**
- Field activity syncs to CRM
- CRM changes don't affect FieldFlow
- Use when CRM is master system

**CRM → FieldFlow Only:**
- Import data from CRM
- FieldFlow changes stay local
- Use for read-only CRM access

### Conflict Resolution

When data conflicts occur, choose a strategy:

**Newest Wins:**
- Most recently modified record takes precedence
- Good for active editing in both systems

**FieldFlow Wins:**
- FieldFlow data always overwrites CRM
- Use when field reps are primary data owners

**CRM Wins:**
- CRM data always overwrites FieldFlow
- Use when back-office maintains master data

### Sync Frequency

- **Real-time**: Changes sync within minutes
- **Hourly**: Batch sync every hour
- **Manual**: Sync only when you click refresh

## Managing Field Mappings

### Default Mappings

FieldFlow automatically maps common fields:
- Name → Name
- Email → Email
- Phone → Phone
- Company → Company/Account

### Custom Field Mapping

1. Go to **Settings → CRM → Field Mappings**
2. Click **Add Mapping**
3. Select FieldFlow field
4. Select corresponding CRM field
5. Save mapping

### Mapping Tips

- Map custom fields for industry-specific data
- Ensure field types match (text to text, number to number)
- Test mappings with a single record first

## Sync Operations

### Manual Sync

Force an immediate sync:
1. Go to **Settings → CRM**
2. Click **Sync Now**
3. Watch progress indicator
4. Review sync results

### Selective Sync

Sync specific records:
1. Open a prospect
2. Click **Sync to CRM**
3. Confirm the sync
4. Record updates in CRM

### Bulk Sync

Sync all prospects:
1. Go to **Settings → CRM**
2. Click **Sync All Prospects**
3. Confirm (this may take time for large datasets)

## Sync Status Dashboard

Monitor your integration:

1. Go to **Settings → CRM**
2. View dashboard showing:
   - **Last Sync**: When data was last synced
   - **Records Synced**: Count by type
   - **Pending Changes**: Queued updates
   - **Errors**: Failed sync items

### Understanding Sync Status

| Status | Meaning |
|--------|---------|
| ✅ Synced | Data matches in both systems |
| 🔄 Pending | Changes queued for sync |
| ⚠️ Conflict | Data differs, needs resolution |
| ❌ Error | Sync failed, see details |

## Viewing Sync Logs

For detailed sync history:

1. Go to **Settings → CRM → [Your CRM] → Sync Logs**
2. View chronological sync events
3. Filter by:
   - Date range
   - Record type
   - Status (success/error)
4. Click entries for details

## Handling Errors

### Common Errors

**Authentication Expired:**
- Click **Reconnect** to refresh credentials
- Sign in again to your CRM

**Field Validation Error:**
- CRM rejected data (e.g., required field missing)
- Check the record and fix issues
- Retry sync

**Rate Limit Exceeded:**
- Too many API calls
- Wait and retry
- Consider reducing sync frequency

**Record Not Found:**
- CRM record was deleted
- Remove mapping or recreate in CRM

### Error Resolution

1. Go to **Settings → CRM → Errors**
2. Review failed sync items
3. Click each to see error details
4. Fix the issue in FieldFlow or CRM
5. Click **Retry**

## Activity Sync

### Meetings → CRM

When meetings complete:
- Event/Activity created in CRM
- Linked to Contact/Lead record
- Includes: Date, duration, notes, outcome

### Meeting Summaries → CRM

AI summaries can sync to CRM:
1. Generate summary in FieldFlow
2. Click **Sync to CRM**
3. Summary added to CRM record notes

## Best Practices

1. **Start Small**: Test with a few records first
2. **Match Fields Carefully**: Incorrect mappings cause data issues
3. **Choose One Primary**: Decide which system is the master
4. **Regular Monitoring**: Check sync logs weekly
5. **Clean Data First**: Fix duplicates before enabling sync

## Disconnecting CRM

To remove integration:

1. Go to **Settings → CRM**
2. Click **Disconnect** next to your CRM
3. Confirm disconnection

**Note:**
- Existing data remains in both systems
- No new syncing occurs
- You can reconnect at any time

## Troubleshooting

### Data Not Syncing

1. Check connection status
2. Verify field mappings exist
3. Review sync logs for errors
4. Try manual sync

### Wrong Data Syncing

1. Review field mappings
2. Check conflict resolution settings
3. Verify you're editing the right record

### Duplicate Records

1. Run duplicate detection in both systems
2. Merge duplicates before syncing
3. Enable duplicate prevention in CRM

## Related Guides

- [Setup Guide](./SETUP_GUIDE.md)
- [Prospect Management Guide](./PROSPECT_MANAGEMENT_GUIDE.md)
- [API Documentation](./API_DOCUMENTATION.md)
