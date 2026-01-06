/**
 * Calendar types and provider interface for extensibility.
 * Phase 1: Google Calendar
 * Future: Outlook, Apple Calendar, etc.
 */

export type CalendarMeeting = {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[]; // email addresses
  provider: 'google' | 'outlook' | 'apple' | 'adhoc';
  rawData?: any; // provider-specific data
};

export type CalendarProviderStatus = {
  connected: boolean;
  userEmail?: string;
  error?: string;
};

export interface CalendarProvider {
  /** Provider name for display */
  readonly name: string;

  /** Sign in and authorize */
  signIn(): Promise<void>;

  /** Sign out */
  signOut(): Promise<void>;

  /** Get connection status */
  getStatus(): Promise<CalendarProviderStatus>;

  /** Fetch events for a given date range */
  fetchEvents(start: Date, end: Date): Promise<CalendarMeeting[]>;

  /** Get current or next meeting from today's events */
  getCurrentOrNextMeeting(): Promise<CalendarMeeting | null>;
}
