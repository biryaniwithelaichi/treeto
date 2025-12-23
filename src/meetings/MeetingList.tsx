import { Meeting } from '../meetings/types';

type MeetingListProps = {
  meetings: Meeting[];
  activeMeetingId: string | null;
  onSelectMeeting: (meeting: Meeting) => void;
};

type DateBucket = 'Today' | 'Yesterday' | 'Earlier';

export function MeetingList({ meetings, activeMeetingId, onSelectMeeting }: MeetingListProps) {
  const groupedMeetings = groupMeetingsByDate(meetings);

  return (
    <div style={{
      width: '280px',
      height: '100vh',
      backgroundColor: 'var(--bg-primary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--spacing-lg) var(--spacing-md)',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <h2 style={{
          margin: 0,
          fontSize: 'var(--font-size-base)',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}>
          Meetings
        </h2>
      </div>

      {/* Meeting List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--spacing-sm)',
      }}>
        {meetings.length === 0 ? (
          <div style={{
            padding: 'var(--spacing-xl)',
            textAlign: 'center',
            color: 'var(--text-tertiary)',
            fontSize: 'var(--font-size-sm)',
          }}>
            No meetings yet
          </div>
        ) : (
          <>
            {(['Today', 'Yesterday', 'Earlier'] as DateBucket[]).map(bucket => {
              const bucketMeetings = groupedMeetings[bucket];
              if (bucketMeetings.length === 0) return null;

              return (
                <div key={bucket} style={{ marginBottom: 'var(--spacing-lg)' }}>
                  {/* Date Bucket Header */}
                  <div style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '0 var(--spacing-sm)',
                    marginBottom: 'var(--spacing-xs)',
                  }}>
                    {bucket}
                  </div>

                  {/* Meeting Items */}
                  {bucketMeetings.map(meeting => (
                    <MeetingListItem
                      key={meeting.meeting_id}
                      meeting={meeting}
                      isActive={meeting.meeting_id === activeMeetingId}
                      onClick={() => onSelectMeeting(meeting)}
                    />
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

type MeetingListItemProps = {
  meeting: Meeting;
  isActive: boolean;
  onClick: () => void;
};

function MeetingListItem({ meeting, isActive, onClick }: MeetingListItemProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color var(--transition-fast)',
        marginBottom: 'var(--spacing-xs)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {/* Active Indicator */}
      {isActive && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '3px',
          height: '60%',
          backgroundColor: 'var(--accent-recording)',
          borderRadius: '0 2px 2px 0',
        }} />
      )}

      {/* Meeting Title */}
      <div style={{
        fontSize: 'var(--font-size-sm)',
        fontWeight: isActive ? 600 : 500,
        color: 'var(--text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {meeting.title}
      </div>

      {/* Meeting Time */}
      <div style={{
        fontSize: 'var(--font-size-xs)',
        color: 'var(--text-tertiary)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-xs)',
      }}>
        <span>{formatMeetingTime(meeting)}</span>
        {meeting.source === 'calendar' && (
          <span style={{ opacity: 0.6 }}>📅</span>
        )}
      </div>
    </button>
  );
}

/**
 * Group meetings by date buckets
 */
function groupMeetingsByDate(meetings: Meeting[]): Record<DateBucket, Meeting[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<DateBucket, Meeting[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  meetings.forEach(meeting => {
    const meetingDate = new Date(meeting.startTime);
    meetingDate.setHours(0, 0, 0, 0);

    if (meetingDate.getTime() === today.getTime()) {
      groups.Today.push(meeting);
    } else if (meetingDate.getTime() === yesterday.getTime()) {
      groups.Yesterday.push(meeting);
    } else {
      groups.Earlier.push(meeting);
    }
  });

  return groups;
}

/**
 * Format meeting time for display
 */
function formatMeetingTime(meeting: Meeting): string {
  const date = new Date(meeting.startTime);
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // If not today, include date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const meetingDate = new Date(meeting.startTime);
  meetingDate.setHours(0, 0, 0, 0);

  if (meetingDate.getTime() !== today.getTime()) {
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return `${dateStr} • ${timeStr}`;
  }

  return timeStr;
}
