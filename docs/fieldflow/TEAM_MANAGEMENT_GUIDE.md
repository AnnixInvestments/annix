# FieldFlow Team Management Guide (Admin)

This guide covers team and organization management features in FieldFlow for administrators and managers.

## Overview

FieldFlow's team features enable:
- Organization and team structure
- Role-based access control
- Territory management
- Prospect ownership and handoffs
- Team performance tracking

## Organization Setup

### Creating an Organization

1. Go to **Settings → Team**
2. Click **Create Organization**
3. Enter organization details:
   - **Name**: Company/team name
   - **Industry**: Your industry sector
4. Click **Create**

You become the organization owner with full admin rights.

### Organization Settings

As owner/admin, configure:
- **Name**: Update organization name
- **Default Settings**: Timezone, currency
- **Branding**: Logo (optional)

## Team Roles

### Role Hierarchy

| Role | Description | Permissions |
|------|-------------|-------------|
| **Owner** | Organization creator | Full access, cannot be removed |
| **Admin** | Organization administrator | Full access except delete org |
| **Manager** | Team/territory manager | Manage assigned team members |
| **Rep** | Sales representative | Own prospects and meetings only |

### Role Permissions

| Action | Owner | Admin | Manager | Rep |
|--------|-------|-------|---------|-----|
| Invite members | ✅ | ✅ | ✅ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| Change roles | ✅ | ✅ | ❌ | ❌ |
| Create territories | ✅ | ✅ | ✅ | ❌ |
| Assign territories | ✅ | ✅ | ✅ | ❌ |
| View all prospects | ✅ | ✅ | Team only | Own only |
| View all meetings | ✅ | ✅ | Team only | Own only |
| View analytics | ✅ | ✅ | Team only | Own only |
| Edit settings | ✅ | ✅ | ❌ | ❌ |

## Managing Team Members

### Inviting Members

1. Go to **Settings → Team**
2. Click **Invite Member**
3. Enter email address
4. Select role (Rep, Manager, Admin)
5. Assign territory (optional)
6. Click **Send Invitation**

The invitee receives an email with a join link.

### Invitation Management

View pending invitations:
1. Go to **Settings → Team → Invitations**
2. See pending, accepted, and expired invites
3. Actions:
   - **Resend**: Send invitation again
   - **Cancel**: Revoke invitation

### Accepting Invitations

Invitees:
1. Click link in invitation email
2. Create account or sign in
3. Automatically join the organization

### Updating Member Roles

1. Go to **Settings → Team**
2. Find the member
3. Click **Edit**
4. Select new role
5. Save changes

### Removing Members

1. Go to **Settings → Team**
2. Find the member
3. Click **Remove**
4. Choose what happens to their data:
   - Reassign prospects to another rep
   - Keep prospects unassigned
5. Confirm removal

## Reporting Structure

### Setting Up Reports-To

Define who reports to whom:

1. Go to **Settings → Team**
2. Select a team member
3. Click **Set Reports To**
4. Select their manager
5. Save

### Viewing Hierarchy

1. Go to **Settings → Team → Hierarchy**
2. See organization chart
3. Expand/collapse branches
4. Click members to view details

## Territory Management

### Creating Territories

1. Go to **Settings → Territories**
2. Click **Create Territory**
3. Configure:
   - **Name**: Territory identifier (e.g., "Gauteng North")
   - **Description**: Area details
   - **Geographic Bounds**: Provinces, cities, or custom polygon
4. Save

### Assigning Territories

Assign reps to territories:

1. Open the territory
2. Click **Assign Rep**
3. Select team member(s)
4. Save

Or from the team member:
1. Edit team member
2. Select territories
3. Save

### Territory Rules

- Reps can have multiple territories
- Territories can overlap
- Prospects auto-assign based on location (if enabled)

### Territory Performance

View territory metrics:
1. Go to **Manager Dashboard**
2. Click **Territory Performance**
3. See:
   - Prospects per territory
   - Meetings per territory
   - Revenue by territory

## Prospect Ownership

### Automatic Assignment

Configure auto-assignment rules:
1. Go to **Settings → Territories**
2. Enable **Auto-assign by location**
3. Prospects are assigned based on their address

### Manual Assignment

Assign prospects to reps:
1. Open a prospect
2. Click **Assign**
3. Select team member
4. Save

### Bulk Assignment

1. Go to **Prospects**
2. Enable selection mode
3. Select prospects
4. Click **Assign**
5. Select rep
6. Confirm

## Prospect Handoffs

Transfer prospects between reps:

### Initiating Handoff

1. Open the prospect
2. Click **Handoff**
3. Select recipient rep
4. Add handoff notes
5. Click **Transfer**

### Handoff Notifications

- Recipient receives notification
- Email with prospect details
- Activity logged on prospect

### Handoff History

View transfer history:
1. Open prospect
2. Go to **Activity** tab
3. See handoff events with notes

### Bulk Handoff

For territory changes or departures:
1. Go to **Manager Dashboard**
2. Click **Bulk Handoff**
3. Select source rep
4. Select destination rep
5. Choose prospects to transfer
6. Confirm

## Manager Dashboard

Managers see additional views:

### Team Overview

1. Go to **Manager Dashboard**
2. See:
   - Total team prospects
   - Team meetings this week
   - Pipeline value
   - Activity summary

### Team Performance

Compare rep performance:
- Meetings completed
- Prospects converted
- Revenue closed
- Activity levels

### Leaderboard

View rankings:
1. Go to **Manager Dashboard → Leaderboard**
2. Select metric (meetings, conversions, revenue)
3. Select period (week, month, quarter)
4. See ranked list

### Activity Feed

Monitor team activity:
1. Go to **Manager Dashboard → Activity**
2. See real-time feed:
   - Meetings completed
   - Prospects updated
   - Deals won
3. Filter by rep or date

### Overdue Follow-ups

Track missed follow-ups:
1. Go to **Manager Dashboard → Follow-ups**
2. See overdue items by rep
3. Click to see details
4. Optionally reassign

## Goals and Targets

### Setting Team Goals

1. Go to **Settings → Goals**
2. Click **Create Goal**
3. Configure:
   - **Type**: Meetings, Revenue, Conversions
   - **Target**: Number or amount
   - **Period**: Weekly, Monthly, Quarterly
   - **Assign To**: Team or specific rep
4. Save

### Tracking Progress

1. Go to **Manager Dashboard**
2. View goal progress bars
3. Click for detailed breakdown

### Rep-Level Goals

Individual targets:
1. Edit team member
2. Go to **Goals** tab
3. Set individual targets
4. These override team defaults

## Reports

### Team Reports

Generate team reports:
1. Go to **Reports**
2. Select report type:
   - Weekly Activity Summary
   - Monthly Performance
   - Territory Coverage
3. Select team/reps to include
4. Choose date range
5. Generate report

### Exporting Reports

1. Generate the report
2. Click **Export PDF**
3. Download or email

## Best Practices

### For Admins

1. **Clear Territories**: Define non-overlapping territories
2. **Role Clarity**: Use roles appropriately
3. **Regular Check-ins**: Review team activity weekly
4. **Goal Setting**: Set achievable, measurable goals
5. **Data Hygiene**: Encourage complete prospect records

### For Managers

1. **Monitor Dashboard**: Check daily
2. **Address Overdue**: Follow up on missed activities
3. **Celebrate Wins**: Recognize achievements
4. **Coach Underperformers**: Use data for coaching
5. **Fair Distribution**: Balance prospect assignments

### For Reps

1. **Update Promptly**: Keep prospect status current
2. **Log Activities**: Record all interactions
3. **Follow Up**: Don't let prospects go cold
4. **Use Tags**: Organize for easy filtering
5. **Check Goals**: Stay aware of targets

## Troubleshooting

### Can't See Team Members

- Verify your role (Admin or Manager required)
- Check you're viewing correct organization

### Invitation Not Received

- Check spam folder
- Verify email address
- Resend invitation
- Try different email

### Can't Assign Prospects

- Verify you have Manager or Admin role
- Check prospect isn't locked
- Ensure target rep is active

### Territory Not Matching

- Verify prospect has location set
- Check territory boundaries
- Auto-assign may be disabled

## Related Guides

- [Setup Guide](./SETUP_GUIDE.md)
- [Prospect Management Guide](./PROSPECT_MANAGEMENT_GUIDE.md)
- [CRM Integration Guide](./CRM_INTEGRATION_GUIDE.md)
