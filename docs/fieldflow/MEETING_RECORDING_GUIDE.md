# FieldFlow Meeting Recording Guide

This guide explains how to schedule, record, and manage meetings in FieldFlow, including transcription and AI-powered summaries.

## Meeting Types

FieldFlow supports three meeting types:

| Type | Icon | Description |
|------|------|-------------|
| **In Person** | 📍 | Face-to-face meetings at a location |
| **Phone** | 📞 | Phone calls with prospects |
| **Video** | 🎥 | Video conference meetings |

## Scheduling Meetings

### Quick Schedule

1. Navigate to **Meetings**
2. Click **New Meeting**
3. Fill in the form:
   - **Title**: Meeting subject
   - **Type**: In Person, Phone, or Video
   - **Start**: Date and time
   - **End**: Date and time
   - **Location**: Meeting place (for in-person)
   - **Description**: Agenda or notes
4. Click **Create Meeting**

### From a Prospect

1. Open the prospect detail
2. Click **Schedule Meeting**
3. The prospect is automatically linked
4. Complete the meeting details

### From Calendar

1. Go to **Schedule → Calendar View**
2. Click on a time slot
3. Fill in meeting details
4. The meeting appears on your calendar

## Recurring Meetings

For regular meetings:

1. Create a new meeting
2. Enable **Make this a recurring meeting**
3. Configure recurrence:
   - **Frequency**: Daily, Weekly, Monthly
   - **Interval**: Every 1, 2, 3... weeks/months
   - **Days**: Which days (for weekly)
   - **End**: After X occurrences or by date
4. Click **Create Recurring Meeting**

### Managing Recurring Meetings

- **Edit This Instance**: Changes only the selected meeting
- **Edit Series**: Updates all future meetings
- **Cancel This Instance**: Removes only the selected meeting
- **Cancel Series**: Removes all remaining meetings

## Recording Meetings

FieldFlow's recording feature captures audio for transcription and summary generation.

### Starting a Recording

**From Meeting Detail:**
1. Open the meeting
2. Click **Start Recording**
3. Allow microphone access
4. Recording begins

**Quick Record:**
1. Go to **Meetings**
2. Click **Start Recording**
3. Select or create a meeting
4. Recording begins

### During Recording

The recording interface shows:
- **Timer**: Current recording duration
- **Waveform**: Audio level visualization
- **Pause/Resume**: Temporarily pause recording
- **Stop**: End the recording

### Best Practices for Recording

1. **Get Consent**: Always inform participants they're being recorded
2. **Quiet Environment**: Minimize background noise
3. **Position Device**: Keep microphone close to speakers
4. **Test First**: Do a short test recording to check levels
5. **Battery**: Ensure device is charged or plugged in

## Transcription

After recording stops, transcription begins automatically using Whisper AI.

### Transcription Process

1. Audio is uploaded securely
2. AI processes the audio (2-5 minutes typically)
3. Transcript appears on the meeting page
4. Speaker labels are auto-detected

### Viewing Transcripts

1. Open the meeting
2. Go to **Transcript** tab
3. View timestamped text with speaker labels

### Transcript Features

**Timestamp Navigation:**
- Click any timestamp to jump to that point in the audio
- Audio player syncs with transcript position

**Speaker Labels:**
- AI detects different speakers
- Click speaker name to rename (e.g., "Speaker 1" → "John Smith")

**Search:**
- Use the search bar to find specific words
- Results highlight in the transcript

### Editing Transcripts

1. Click **Edit** on the transcript page
2. Correct any errors in the text
3. Fix speaker assignments
4. Click **Save**

### Exporting Transcripts

1. Click **Export**
2. Choose format:
   - **TXT**: Plain text file
   - **JSON**: Structured data with timestamps
3. File downloads automatically

## AI Summaries

FieldFlow generates intelligent summaries from transcripts.

### Generating a Summary

1. Open a meeting with a completed transcript
2. Go to **Summary** tab
3. Summary generates automatically

### Summary Contents

- **Key Points**: Main discussion topics
- **Action Items**: Tasks and follow-ups identified
- **Decisions Made**: Agreements reached
- **Sentiment**: Overall meeting tone
- **Next Steps**: Recommended actions

### Editing Summaries

1. Click **Edit** on the summary
2. Modify text as needed
3. Add or remove action items
4. Click **Save**

### Summary Templates

Choose a format:
- **Formal**: Professional, detailed format
- **Casual**: Conversational, brief
- **Bullet Points**: Quick reference list

### Sending Summaries

**Email to Attendees:**
1. Click **Send Summary**
2. Select recipients
3. Choose template
4. Add personal message (optional)
5. Click **Send**

**Email to Prospect:**
1. Click **Send to Prospect**
2. Prospect's email is pre-filled
3. Customize message
4. Click **Send**

## Meeting Status

Meetings progress through statuses:

| Status | Description |
|--------|-------------|
| **Scheduled** | Future meeting |
| **In Progress** | Currently happening |
| **Completed** | Successfully finished |
| **Cancelled** | Meeting was cancelled |
| **No Show** | Attendee didn't appear |

### Updating Status

- **Automatic**: Starts → "In Progress", End meeting → "Completed"
- **Manual**: Click status badge to change

## Meeting Analytics

View insights on your meetings:

1. Go to **Analytics**
2. See meeting statistics:
   - Meetings this week/month
   - Average meeting duration
   - Outcome breakdown
   - Time spent per prospect

## Calendar Sync

Meetings sync with connected calendars:

- **Two-way Sync**: Create in FieldFlow or calendar app
- **Real-time Updates**: Changes reflect immediately
- **Conflict Detection**: Warns of scheduling conflicts

See [Calendar Integration Guide](./CALENDAR_INTEGRATION_GUIDE.md) for setup.

## Troubleshooting

### Recording won't start
- Check microphone permissions in browser settings
- Ensure microphone isn't being used by another app
- Try a different browser

### Transcription taking too long
- Large files take longer (1hr recording ≈ 5-10 min processing)
- Check internet connection
- Contact support if stuck over 30 minutes

### Poor transcription quality
- Improve audio quality for future recordings
- Manually edit transcript to correct errors
- Retranscribe if audio was processed incorrectly

### Summary not generating
- Ensure transcript is complete
- Transcript must have sufficient content
- Try regenerating the summary

## Privacy and Security

- Recordings are encrypted in transit and at rest
- Access is limited to the meeting owner and team
- Recordings can be deleted at any time
- Transcripts are processed securely

## Related Guides

- [Calendar Integration Guide](./CALENDAR_INTEGRATION_GUIDE.md)
- [Prospect Management Guide](./PROSPECT_MANAGEMENT_GUIDE.md)
