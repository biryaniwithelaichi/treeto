import { useState, useEffect } from 'react';
import { CalendarMeeting } from '../calendar/types';

type MeetingSelectorProps = {
  selectedMeeting: CalendarMeeting | null;
  onMeetingSelect: (meeting: CalendarMeeting | null) => void;
  onCreateAdHoc: (title: string) => void;
  onSignIn: () => void;
  onRefresh: () => void;
  isConnected: boolean;
  userEmail?: string;
  meetings: CalendarMeeting[];
  loading: boolean;
};

export function MeetingSelector({
  selectedMeeting,
  onMeetingSelect,
  onCreateAdHoc,
  onSignIn,
  onRefresh,
  isConnected,
  userEmail,
  meetings,
  loading,
}: MeetingSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');

  // Auto-collapse after selection
  useEffect(() => {
    if (selectedMeeting) {
      setExpanded(false);
      setCreatingNew(false);
    }
  }, [selectedMeeting]);

  const handleCreateNew = () => {
    if (newMeetingTitle.trim()) {
      onCreateAdHoc(newMeetingTitle.trim());
      setNewMeetingTitle('');
      setCreatingNew(false);
    }
  };

  // Not connected: show option to connect OR create ad-hoc
  if (!isConnected) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-sm)',
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
      }}>
        {creatingNew ? (
          // New meeting form
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <input
              type="text"
              value={newMeetingTitle}
              onChange={(e) => setNewMeetingTitle(e.target.value)}
              placeholder="Meeting name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateNew();
                if (e.key === 'Escape') setCreatingNew(false);
              }}
              style={{
                padding: 'var(--spacing-sm)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-sm)',
              }}
            />
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <button
                onClick={handleCreateNew}
                disabled={!newMeetingTitle.trim()}
                style={{
                  flex: 1,
                  backgroundColor: newMeetingTitle.trim() ? 'var(--accent-action)' : 'var(--bg-secondary)',
                  color: newMeetingTitle.trim() ? 'white' : 'var(--text-tertiary)',
                  border: 'none',
                  padding: 'var(--spacing-sm)',
                  borderRadius: '6px',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 500,
                  cursor: newMeetingTitle.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Create
              </button>
              <button
                onClick={() => setCreatingNew(false)}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  borderRadius: '6px',
                  fontSize: 'var(--font-size-sm)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          // Initial state: New Meeting primary, Connect Calendar secondary
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <button
              onClick={() => setCreatingNew(true)}
              style={{
                backgroundColor: 'var(--accent-recording)',
                color: 'white',
                border: 'none',
                padding: 'var(--spacing-md)',
                borderRadius: '6px',
                fontSize: 'var(--font-size-base)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--spacing-xs)',
              }}
            >
              + New Meeting
            </button>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--spacing-sm)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-tertiary)',
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
              <span>or</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
            </div>
            <button
              onClick={onSignIn}
              style={{
                backgroundColor: 'var(--bg-hover)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: '6px',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--spacing-xs)',
              }}
            >
              📅 Connect Google Calendar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-sm)',
      backgroundColor: 'var(--bg-elevated)',
      borderRadius: '8px',
      border: '1px solid var(--border-color)',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)' }}>📅</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {selectedMeeting ? (
              <>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedMeeting.title}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {formatMeetingTime(selectedMeeting)}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
                No meeting selected
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            disabled={loading}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              padding: '4px',
              opacity: loading ? 0.5 : 0.7,
              transition: 'opacity var(--transition-fast)',
            }}
            onMouseEnter={e => !loading && (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => !loading && (e.currentTarget.style.opacity = '0.7')}
          >
            {loading ? '⟳' : '↻'}
          </button>
          <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {/* Expanded: Meeting List */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--border-color)',
          padding: 'var(--spacing-sm)',
          maxHeight: '300px',
          overflowY: 'auto',
        }}>
          {userEmail && (
            <div style={{
              fontSize: '11px',
              color: 'var(--text-tertiary)',
              padding: '0 var(--spacing-sm) var(--spacing-sm)',
            }}>
              Connected as {userEmail}
            </div>
          )}

          {creatingNew ? (
            // New meeting form
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)' }}>
              <input
                type="text"
                value={newMeetingTitle}
                onChange={(e) => setNewMeetingTitle(e.target.value)}
                placeholder="Meeting name..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNew();
                  if (e.key === 'Escape') setCreatingNew(false);
                }}
                style={{
                  padding: 'var(--spacing-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-sm)',
                }}
              />
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <button
                  onClick={handleCreateNew}
                  disabled={!newMeetingTitle.trim()}
                  style={{
                    flex: 1,
                    backgroundColor: newMeetingTitle.trim() ? 'var(--accent-action)' : 'var(--bg-secondary)',
                    color: newMeetingTitle.trim() ? 'white' : 'var(--text-tertiary)',
                    border: 'none',
                    padding: 'var(--spacing-sm)',
                    borderRadius: '6px',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 500,
                    cursor: newMeetingTitle.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Create
                </button>
                <button
                  onClick={() => setCreatingNew(false)}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    border: 'none',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderRadius: '6px',
                    fontSize: 'var(--font-size-sm)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* New Meeting button */}
              <button
                onClick={() => setCreatingNew(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--spacing-xs)',
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  backgroundColor: 'var(--accent-recording)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 500,
                  margin: '0 var(--spacing-sm) var(--spacing-sm)',
                }}
              >
                + New Meeting
              </button>

              {meetings.length === 0 ? (
                <div style={{
                  padding: 'var(--spacing-md)',
                  textAlign: 'center',
                  color: 'var(--text-tertiary)',
                  fontSize: 'var(--font-size-sm)',
                }}>
                  No calendar meetings today
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                  {meetings.map((meeting) => (
                    <button
                      key={meeting.id}
                      onClick={() => onMeetingSelect(meeting)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        backgroundColor: selectedMeeting?.id === meeting.id ? 'var(--bg-hover)' : 'transparent',
                        border: selectedMeeting?.id === meeting.id ? '1px solid var(--accent-action)' : '1px solid transparent',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all var(--transition-fast)',
                      }}
                      onMouseEnter={e => {
                        if (selectedMeeting?.id !== meeting.id) {
                          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (selectedMeeting?.id !== meeting.id) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {meeting.title}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {formatMeetingTime(meeting)}
                        {meeting.attendees && meeting.attendees.length > 0 && (
                          <> • {meeting.attendees.length} attendee{meeting.attendees.length > 1 ? 's' : ''}</>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatMeetingTime(meeting: CalendarMeeting): string {
  const now = new Date();
  const isToday = meeting.startTime.toDateString() === now.toDateString();
  
  const timeFormat: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  const startStr = meeting.startTime.toLocaleTimeString('en-US', timeFormat);
  const endStr = meeting.endTime.toLocaleTimeString('en-US', timeFormat);

  if (now >= meeting.startTime && now <= meeting.endTime) {
    return `Now • ${startStr} - ${endStr}`;
  }

  if (isToday) {
    return `${startStr} - ${endStr}`;
  }

  return `${meeting.startTime.toLocaleDateString()} ${startStr} - ${endStr}`;
}
