import { CalendarProvider, CalendarMeeting, CalendarProviderStatus } from './types';

/**
 * CalendarManager orchestrates one or more calendar providers.
 * Phase 1: Single Google Calendar provider.
 * Future: Support multiple providers (Google, Outlook, Apple).
 */
export class CalendarManager {
  private provider: CalendarProvider | null = null;
  private selectedMeeting: CalendarMeeting | null = null;

  constructor(provider?: CalendarProvider) {
    this.provider = provider || null;
  }

  setProvider(provider: CalendarProvider) {
    this.provider = provider;
  }

  async signIn(): Promise<void> {
    if (!this.provider) {
      throw new Error('No calendar provider configured');
    }
    await this.provider.signIn();
  }

  async signOut(): Promise<void> {
    if (!this.provider) {
      throw new Error('No calendar provider configured');
    }
    await this.provider.signOut();
    this.selectedMeeting = null;
  }

  async getStatus(): Promise<CalendarProviderStatus> {
    if (!this.provider) {
      return { connected: false };
    }
    return this.provider.getStatus();
  }

  async fetchTodaysMeetings(): Promise<CalendarMeeting[]> {
    if (!this.provider) {
      throw new Error('No calendar provider configured');
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    return this.provider.fetchEvents(startOfDay, endOfDay);
  }

  async getCurrentOrNextMeeting(): Promise<CalendarMeeting | null> {
    if (!this.provider) {
      throw new Error('No calendar provider configured');
    }
    return this.provider.getCurrentOrNextMeeting();
  }

  async refreshAndSelectMeeting(): Promise<CalendarMeeting | null> {
    const meeting = await this.getCurrentOrNextMeeting();
    this.selectedMeeting = meeting;
    
    // Persist to localStorage for reload recovery
    if (meeting) {
      localStorage.setItem('selectedMeeting', JSON.stringify({
        ...meeting,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
      }));
    } else {
      localStorage.removeItem('selectedMeeting');
    }
    
    return meeting;
  }

  getSelectedMeeting(): CalendarMeeting | null {
    return this.selectedMeeting;
  }

  setSelectedMeeting(meeting: CalendarMeeting | null) {
    this.selectedMeeting = meeting;
    
    if (meeting) {
      localStorage.setItem('selectedMeeting', JSON.stringify({
        ...meeting,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
      }));
    } else {
      localStorage.removeItem('selectedMeeting');
    }
  }

  loadSelectedMeetingFromStorage(): CalendarMeeting | null {
    try {
      const stored = localStorage.getItem('selectedMeeting');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.selectedMeeting = {
          ...parsed,
          startTime: new Date(parsed.startTime),
          endTime: new Date(parsed.endTime),
        };
        return this.selectedMeeting;
      }
    } catch (e) {
      console.warn('[calendar-manager] Failed to load selected meeting:', e);
    }
    return null;
  }

  clearSelectedMeeting() {
    this.selectedMeeting = null;
    localStorage.removeItem('selectedMeeting');
  }
}
