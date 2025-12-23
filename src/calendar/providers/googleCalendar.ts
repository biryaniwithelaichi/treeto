import { CalendarProvider, CalendarMeeting, CalendarProviderStatus } from '../types';

/**
 * Google Calendar provider using OAuth 2.0 PKCE flow.
 * Uses browser-based OAuth with Google's JS library.
 */
export class GoogleCalendarProvider implements CalendarProvider {
  readonly name = 'Google Calendar';
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private clientId: string;

  constructor(clientId: string) {
    this.clientId = clientId;
    this.loadGoogleScript();
  }

  private loadGoogleScript() {
    // Load Google Identity Services library
    if (!(window as any).google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  async signIn(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const google = (window as any).google;
        if (!google?.accounts?.oauth2) {
          reject(new Error('Google Identity Services not loaded'));
          return;
        }

        // Initialize token client with PKCE
        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: 'https://www.googleapis.com/auth/calendar.readonly',
          callback: (response: any) => {
            if (response.error) {
              reject(new Error(response.error));
              return;
            }
            this.accessToken = response.access_token;
            localStorage.setItem('google_calendar_token', response.access_token);
            localStorage.setItem('google_calendar_token_expires', 
              String(Date.now() + (response.expires_in * 1000)));
            resolve();
          },
        });

        // Request access token
        this.tokenClient.requestAccessToken();
      } catch (error) {
        reject(error);
      }
    });
  }

  async signOut(): Promise<void> {
    if (this.accessToken) {
      // Revoke token
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${this.accessToken}`, {
          method: 'POST',
        });
      } catch (e) {
        console.warn('[google-calendar] Token revocation failed:', e);
      }
    }
    this.accessToken = null;
    localStorage.removeItem('google_calendar_token');
    localStorage.removeItem('google_calendar_token_expires');
    localStorage.removeItem('google_calendar_user_email');
  }

  async getStatus(): Promise<CalendarProviderStatus> {
    // Check for existing valid token
    const token = localStorage.getItem('google_calendar_token');
    const expires = localStorage.getItem('google_calendar_token_expires');
    const userEmail = localStorage.getItem('google_calendar_user_email');

    if (token && expires && Date.now() < parseInt(expires)) {
      this.accessToken = token;
      return {
        connected: true,
        userEmail: userEmail || undefined,
      };
    }

    return { connected: false };
  }

  async fetchEvents(start: Date, end: Date): Promise<CalendarMeeting[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      const timeMin = start.toISOString();
      const timeMax = end.toISOString();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&` +
        `timeMax=${encodeURIComponent(timeMax)}&` +
        `singleEvents=true&` +
        `orderBy=startTime&` +
        `maxResults=50`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const data = await response.json();

      // Cache user email if available
      if (data.summary && !localStorage.getItem('google_calendar_user_email')) {
        // Try to get user info
        this.fetchUserEmail();
      }

      return (data.items || []).map((item: any) => this.convertToMeeting(item));
    } catch (error) {
      console.error('[google-calendar] Failed to fetch events:', error);
      throw error;
    }
  }

  private async fetchUserEmail() {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.email) {
          localStorage.setItem('google_calendar_user_email', data.email);
        }
      }
    } catch (e) {
      // Ignore, not critical
    }
  }

  async getCurrentOrNextMeeting(): Promise<CalendarMeeting | null> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const events = await this.fetchEvents(startOfDay, endOfDay);
    
    if (events.length === 0) {
      return null;
    }

    // Find current meeting (now is between start and end)
    const currentMeeting = events.find(
      event => now >= event.startTime && now <= event.endTime
    );

    if (currentMeeting) {
      return currentMeeting;
    }

    // Find next upcoming meeting
    const upcomingMeetings = events.filter(event => event.startTime > now);
    return upcomingMeetings.length > 0 ? upcomingMeetings[0] : null;
  }

  private convertToMeeting(googleEvent: any): CalendarMeeting {
    // Parse start/end times (handle both dateTime and date-only events)
    const startTime = googleEvent.start.dateTime 
      ? new Date(googleEvent.start.dateTime)
      : new Date(googleEvent.start.date);
    
    const endTime = googleEvent.end.dateTime
      ? new Date(googleEvent.end.dateTime)
      : new Date(googleEvent.end.date);

    // Extract attendee emails
    const attendees = (googleEvent.attendees || [])
      .map((a: any) => a.email)
      .filter(Boolean);

    return {
      id: googleEvent.id,
      title: googleEvent.summary || '(No title)',
      startTime,
      endTime,
      attendees: attendees.length > 0 ? attendees : undefined,
      provider: 'google',
      rawData: googleEvent,
    };
  }
}
