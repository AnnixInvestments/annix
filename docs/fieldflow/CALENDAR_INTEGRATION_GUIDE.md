# FieldFlow Calendar Integration Guide

This guide explains how to connect external calendars to FieldFlow for seamless meeting synchronization.

## Supported Calendars

FieldFlow integrates with:
- **Google Calendar** (Gmail, Google Workspace)
- **Microsoft Outlook** (Office 365, Outlook.com)

## Benefits of Calendar Integration

- **Two-Way Sync**: Meetings created in either app appear in both
- **Availability Detection**: Booking links show accurate free/busy times
- **Conflict Prevention**: Warnings when double-booking
- **External Events**: See all commitments in one view
- **Automatic Updates**: Changes sync in real-time

## Connecting Google Calendar

### Prerequisites
- A Google account with calendar access
- Permission to authorize third-party apps

### Connection Steps

1. Go to **Settings → Calendars**
2. Click **Connect Calendar**
3. Select **Google**
4. Sign in to your Google account
5. Review permissions and click **Allow**
6. You'll be redirected back to FieldFlow

### Google Permissions Explained

FieldFlow requests:
- **View calendar events**: See existing events
- **Create/edit events**: Add FieldFlow meetings to your calendar
- **View calendar settings**: Detect your time zone

### Selecting Calendars

After connection:
1. A list of your calendars appears
2. Toggle which calendars to sync
3. Enable **Primary** calendar at minimum
4. Consider enabling shared team calendars

## Connecting Microsoft Outlook

### Prerequisites
- Microsoft 365 or Outlook.com account
- Calendar access enabled

### Connection Steps

1. Go to **Settings → Calendars**
2. Click **Connect Calendar**
3. Select **Microsoft**
4. Sign in to your Microsoft account
5. Review permissions and click **Accept**
6. Return to FieldFlow

### Microsoft Permissions Explained

FieldFlow requests:
- **Read calendars**: View your events
- **Read and write calendars**: Create FieldFlow meetings
- **Read user profile**: Get your email for invites

### Selecting Calendars

1. Your calendars appear after connection
2. Toggle calendars to include in sync
3. Enable your main calendar
4. Add shared calendars if needed

## Calendar Sync Behavior

### From FieldFlow → External Calendar

When you create a meeting in FieldFlow:
- Event appears in your Google/Outlook calendar
- Includes: Title, time, location, description
- Prospect name in description (if linked)
- Updates sync automatically

### From External Calendar → FieldFlow

Events from your external calendar:
- Appear in FieldFlow calendar view (read-only)
- Block availability for booking links
- Show in schedule/route planner
- Cannot be edited in FieldFlow (edit in source app)

## Calendar Settings

### Sync Frequency

- **Real-time**: Changes sync within minutes
- **Manual Refresh**: Click sync icon to force update

### Default Calendar

Set which calendar new meetings are created in:
1. Go to **Settings → Calendars**
2. Select your connected calendar
3. Click **Set as Default**

### Calendar Colors

Customize how events display:
1. Go to **Settings → Colors**
2. Assign colors to:
   - FieldFlow meetings
   - External events
   - Different meeting types

## Conflict Detection

### How It Works

When scheduling, FieldFlow checks:
- All connected calendars
- Existing FieldFlow meetings
- Buffer times between meetings

### Conflict Warnings

If a conflict is detected:
- Warning message appears
- Shows conflicting event details
- Options: Schedule anyway or pick new time

### Viewing Conflicts

1. Go to **Settings → Calendars → Conflicts**
2. See all detected conflicts
3. Resolve each:
   - Keep both events
   - Reschedule one
   - Cancel one

## Booking Links

Calendar integration enables self-service booking:

### Creating a Booking Link

1. Go to **Settings → Booking Links**
2. Click **Create Booking Link**
3. Configure:
   - **Name**: Link identifier
   - **Duration**: Meeting length (15, 30, 60 min)
   - **Meeting Type**: In person, phone, video
   - **Buffer**: Time between bookings
   - **Availability**: Days and hours available

### How Availability Works

Your booking link shows free slots based on:
- Connected calendar events (busy times hidden)
- Your working hours settings
- Buffer time configuration
- Existing FieldFlow meetings

### Sharing Your Link

1. Copy the booking link URL
2. Share via email, website, or signature
3. Prospects pick an available time
4. Meeting is created automatically in FieldFlow and your calendar

## Troubleshooting

### Calendar Not Syncing

1. Check connection status in Settings → Calendars
2. Try disconnecting and reconnecting
3. Verify you have calendar access in Google/Microsoft
4. Check for browser pop-up blockers during OAuth

### Events Not Appearing

- Ensure the specific calendar is toggled on
- Check time zone settings match
- Wait a few minutes for sync to complete
- Click the refresh/sync button

### Duplicate Events

- Don't create events in both apps simultaneously
- Use FieldFlow as the primary source for sales meetings
- Duplicates can be manually removed

### Authorization Expired

1. You'll see a warning banner
2. Click **Reconnect Calendar**
3. Sign in again to refresh permissions

### Wrong Time Zone

1. Go to your profile settings
2. Verify time zone is correct
3. Check Google/Microsoft calendar time zone too
4. Events should display in your local time

## Multiple Calendars

### Managing Multiple Connections

You can connect:
- Multiple Google calendars
- Multiple Microsoft calendars
- Both Google and Microsoft simultaneously

### Best Practices

- Connect your primary work calendar
- Include shared team calendars for visibility
- Don't duplicate by connecting the same calendar twice

## Privacy Considerations

- FieldFlow only accesses calendar data you authorize
- Event details are used only for display and sync
- You can disconnect at any time
- Disconnecting removes FieldFlow's access

## Disconnecting a Calendar

1. Go to **Settings → Calendars**
2. Find the calendar connection
3. Click **Disconnect**
4. Confirm disconnection

**Note:** Disconnecting stops sync but doesn't delete existing meetings.

## Related Guides

- [Setup Guide](./SETUP_GUIDE.md)
- [Meeting Recording Guide](./MEETING_RECORDING_GUIDE.md)
