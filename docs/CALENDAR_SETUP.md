# Google Calendar Integration Setup

This guide explains how to set up Google Calendar OAuth for Treeto's meeting-based recording feature.

## Overview

Treeto integrates with Google Calendar to:
- Fetch today's meetings
- Automatically suggest current or next meeting
- Require meeting selection before recording
- Display meeting title, time, and attendees

## Google Cloud Console Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your Project ID

### 2. Enable Google Calendar API

1. In your project, go to **APIs & Services > Library**
2. Search for "Google Calendar API"
3. Click **Enable**

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Select **External** user type (or Internal if using Google Workspace)
3. Fill in required fields:
   - **App name**: Treeto
   - **User support email**: your email
   - **Developer contact**: your email
4. Click **Save and Continue**
5. On **Scopes** page:
   - Click **Add or Remove Scopes**
   - Search for `calendar.readonly`
   - Select `https://www.googleapis.com/auth/calendar.readonly`
   - Click **Update** and **Save and Continue**
6. On **Test users** page (for External apps):
   - Add your email as a test user
   - Click **Save and Continue**

### 4. Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Select **Application type: Web application**
4. Configure:
   - **Name**: Treeto Dev Client
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (for Vite dev server)
     - Add production URL when deploying
   - **Authorized redirect URIs**:
     - `http://localhost:5173` (for Vite dev server)
     - Add production URL when deploying
5. Click **Create**
6. Copy the **Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)

## Treeto Configuration

### 1. Add Client ID to Environment Variables

Edit your `.env` file:

```bash
VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

### 2. Restart Development Server

```bash
npm run dev
```

## Usage

### First Time Setup

1. Launch Treeto
2. In the top section, click **"Connect Google Calendar"**
3. Sign in with your Google account
4. Grant calendar read-only permissions
5. Today's meetings will appear in the dropdown

### Selecting a Meeting

1. Click the meeting selector to expand
2. Current or next meeting is auto-selected
3. You can manually select any other meeting from today
4. Click the refresh button (↻) to reload meetings

### Recording a Meeting

1. A meeting **must be selected** before recording
2. Click **"Start Meeting"** to begin
3. The selected meeting title and time are displayed at the top
4. Audio and transcriptions will be associated with this meeting

## Troubleshooting

### "Google Identity Services not loaded"

The Google OAuth library loads asynchronously. Wait a moment and try again.

### "Failed to sign in to Google Calendar"

- Verify your Client ID is correct in `.env`
- Check that JavaScript origins and redirect URIs match your dev server URL
- Ensure you've added your email as a test user (for External apps)
- Try opening Developer Tools console to see detailed error messages

### "No meetings today"

- Verify you have events on your Google Calendar for today
- Try clicking the refresh button (↻)
- Check that the Calendar API is enabled in Google Cloud Console

### Token expired

If you see authentication errors after some time:
1. Sign out (future feature)
2. Sign in again to get a fresh token

Tokens are cached in localStorage and automatically refreshed.

## Development Notes

### Architecture

- **Provider Pattern**: `CalendarProvider` interface allows adding Outlook, Apple Calendar in future
- **CalendarManager**: Orchestrates providers and manages selected meeting state
- **GoogleCalendarProvider**: Uses Google Identity Services (PKCE OAuth flow)
- **MeetingSelector**: React component for calendar connection and meeting selection

### Files Added

- `src/calendar/types.ts` - Types and interfaces
- `src/calendar/providers/googleCalendar.ts` - Google Calendar implementation
- `src/calendar/calendarManager.ts` - Manager class
- `src/calendar/MeetingSelector.tsx` - UI component

### Storage

- **localStorage keys**:
  - `google_calendar_token` - OAuth access token
  - `google_calendar_token_expires` - Token expiration timestamp
  - `google_calendar_user_email` - Signed-in user email
  - `selectedMeeting` - Current selected meeting (persisted across reloads)

### Future Enhancements (Not Implemented Yet)

- Outlook Calendar provider
- Apple Calendar provider
- Manual meeting creation (no calendar)
- Meeting history and past recordings
- Calendar sign-out UI
- Multiple calendar accounts
