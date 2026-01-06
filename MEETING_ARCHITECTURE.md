# Meeting Model Architecture

## Overview
Implemented backend-style Meeting model with internal `meeting_id` for proper data architecture.

## Core Components

### 1. Meeting Type ([meetings/types.ts](src/meetings/types.ts))
```typescript
interface Meeting {
  meeting_id: string;           // UUID, internal only - NEVER exposed in UI
  title: string;                // User-facing title
  startTime: number;            // epoch ms
  endTime?: number;             // epoch ms, set when meeting ends
  source: 'calendar' | 'adhoc';
  calendarMeta?: {
    provider: 'google' | 'outlook' | 'apple';
    eventId: string;
    attendees?: string[];
  };
}
```

### 2. MeetingStore ([meetings/meetingStore.ts](src/meetings/meetingStore.ts))
- In-memory storage with Map<string, Meeting>
- UUID generation for meeting_id
- Active meeting tracking
- Ready for backend/IndexedDB migration

Key Methods:
- `createMeeting(params)` - Creates meeting with auto-generated meeting_id
- `getActiveMeeting()` - Returns currently active meeting
- `updateMeeting(meeting_id, updates)` - Updates meeting (e.g., endTime)
- `getAllMeetings()` - Returns all meetings sorted by startTime DESC

### 3. MeetingManager ([meetingManager.ts](src/meetingManager.ts))
Updated to require and track meeting_id:
- `startMeeting(meeting_id)` - Starts recording session for meeting
- `getActiveMeetingId()` - Returns active meeting_id
- `endMeeting()` - Returns MeetingResult with meeting_id

## Meeting Creation Flows

### Ad-hoc Meetings (Primary)
1. User clicks "+ New Meeting" button
2. Enters meeting title (or uses "Untitled meeting")
3. App calls `handleCreateAdHoc(title)`
4. Creates Meeting with:
   - source: 'adhoc'
   - meeting_id: auto-generated UUID
   - startTime: Date.now()
5. Sets as active meeting
6. User can immediately start recording

### Calendar Meetings (Optional Enhancement)
1. User connects Google Calendar
2. Selects event from today's meetings
3. App calls `handleMeetingSelect(calendarMeeting)`
4. Creates Meeting with:
   - source: 'calendar'
   - meeting_id: auto-generated UUID
   - calendarMeta: provider, eventId, attendees
5. Sets as active meeting
6. User can start recording

## Key Architectural Principles

### ✅ Implemented
- **meeting_id is internal only** - Never appears in UI or user-facing logs
- **Meeting creation decoupled from audio** - Can create meetings before system audio setup
- **Calendar is optional** - Ad-hoc meetings work without calendar integration
- **Backend-style storage** - MeetingStore is abstraction layer ready for API/DB
- **Audio/ASR references meeting_id** - All segments, transcripts, notes attached to meeting

### 🎯 Data Flow
```
User Action → Create Meeting (get meeting_id) → Set Active → Start Recording
                      ↓
           meeting_id flows through:
           - MeetingManager
           - Audio pipelines
           - ASR results
           - Transcripts
           - Notes
           - Action items
```

## UI Updates

### MeetingSelector Component
- **Not connected**: Shows large "+ New Meeting" button (primary), "Connect Calendar" (secondary)
- **Connected**: Shows "+ New Meeting" at top of meeting list, followed by calendar events
- Inline form for ad-hoc meeting creation
- Meeting displayed shows title and time (never meeting_id)

### App.tsx Integration
- `activeMeeting: Meeting | null` - Replaces old selectedMeeting
- `meetingStoreRef` - Store instance for meeting CRUD
- `handleCreateAdHoc(title)` - Creates ad-hoc meeting
- `handleMeetingSelect(calendarMeeting)` - Creates meeting from calendar event
- `handleStart()` - Requires activeMeeting, passes meeting_id to MeetingManager
- `handleStop()` - Sets meeting endTime

### Meeting Notes Display
- Shows meeting title in header
- meeting_id tracked internally but not displayed
- Notes attached to correct meeting via meeting_id in MeetingResult

## Future Backend Migration

Ready for backend integration with minimal changes:
1. Replace MeetingStore with API calls
2. Persist meetings to database
3. meeting_id becomes primary key
4. All references already flow through meeting_id
5. Audio/transcripts/notes already keyed by meeting_id

## Testing

Build verification: ✅ Passed
TypeScript compilation: ✅ No errors
Meeting creation: ✅ Both ad-hoc and calendar work
Audio integration: ✅ meeting_id flows through pipelines
