import { Meeting, MeetingCreateParams } from './types';

/**
 * MeetingStore - in-memory meeting storage
 * Backend-style abstraction, ready for IndexedDB/API later
 */
export class MeetingStore {
  private meetings: Map<string, Meeting> = new Map();
  private activeMeetingId: string | null = null;

  /**
   * Create a new meeting with generated UUID
   */
  createMeeting(params: MeetingCreateParams): Meeting {
    const meeting_id = this.generateUUID();
    const now = Date.now();

    let meeting: Meeting;

    if (params.source === 'adhoc') {
      meeting = {
        meeting_id,
        title: params.title || 'Untitled meeting',
        startTime: now,
        source: 'adhoc',
      };
    } else {
      meeting = {
        meeting_id,
        title: params.title,
        startTime: now,
        source: 'calendar',
        calendarMeta: {
          provider: params.provider,
          eventId: params.eventId,
          attendees: params.attendees,
        },
      };
    }

    this.meetings.set(meeting_id, meeting);
    console.log(`[MeetingStore] Created meeting ${meeting_id}: "${meeting.title}"`);
    return meeting;
  }

  /**
   * Get meeting by ID
   */
  getMeeting(meeting_id: string): Meeting | undefined {
    return this.meetings.get(meeting_id);
  }

  /**
   * Get all meetings, sorted by startTime DESC
   */
  getAllMeetings(): Meeting[] {
    return Array.from(this.meetings.values())
      .sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Set the currently active meeting
   */
  setActiveMeeting(meeting_id: string | null): void {
    if (meeting_id && !this.meetings.has(meeting_id)) {
      throw new Error(`Meeting ${meeting_id} not found`);
    }
    this.activeMeetingId = meeting_id;
  }

  /**
   * Get the currently active meeting
   */
  getActiveMeeting(): Meeting | null {
    if (!this.activeMeetingId) return null;
    return this.meetings.get(this.activeMeetingId) || null;
  }

  /**
   * Update a meeting (e.g., set endTime)
   */
  updateMeeting(meeting_id: string, updates: Partial<Meeting>): void {
    const meeting = this.meetings.get(meeting_id);
    if (!meeting) {
      throw new Error(`Meeting ${meeting_id} not found`);
    }
    Object.assign(meeting, updates);
  }

  /**
   * Delete a meeting
   */
  deleteMeeting(meeting_id: string): void {
    this.meetings.delete(meeting_id);
    if (this.activeMeetingId === meeting_id) {
      this.activeMeetingId = null;
    }
  }

  /**
   * Clear all meetings (for testing)
   */
  clear(): void {
    this.meetings.clear();
    this.activeMeetingId = null;
  }

  /**
   * Generate a UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
