/**
 * Core Meeting model - backend-style architecture
 * meeting_id is internal only, never exposed in UI
 */

export interface Meeting {
  meeting_id: string;           // UUID, internal only
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

export type MeetingCreateParams = 
  | {
      source: 'adhoc';
      title?: string;
    }
  | {
      source: 'calendar';
      title: string;
      provider: 'google' | 'outlook' | 'apple';
      eventId: string;
      scheduledStart: number;
      scheduledEnd: number;
      attendees?: string[];
    };
