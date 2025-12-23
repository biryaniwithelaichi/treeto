import { useEffect, useState } from 'react';

type TranscriptBubbleProps = {
  id: string;
  text: string;
  source: 'mic' | 'system';
  isPartial?: boolean;
  timestamp: Date;
};

export function TranscriptBubble({ text, source, isPartial, timestamp }: TranscriptBubbleProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const isMic = source === 'mic';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMic ? 'flex-end' : 'flex-start',
        marginBottom: 'var(--spacing-md)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'all 0.2s ease-out',
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          marginBottom: '4px',
          marginLeft: isMic ? 0 : 'var(--spacing-md)',
          marginRight: isMic ? 'var(--spacing-md)' : 0,
        }}
      >
        {isMic ? 'You' : 'Meeting'} • {formatTime(timestamp)}
      </div>

      {/* Bubble */}
      <div
        style={{
          maxWidth: '80%',
          padding: 'var(--spacing-md) var(--spacing-lg)',
          borderRadius: '12px',
          backgroundColor: isMic ? 'var(--bg-elevated)' : 'var(--bg-secondary)',
          border: `1px solid ${isMic ? 'var(--border-color)' : 'transparent'}`,
          color: 'var(--text-primary)',
          fontSize: 'var(--font-size-base)',
          lineHeight: 'var(--line-height-relaxed)',
          position: 'relative',
          marginLeft: isMic ? 'auto' : 0,
          marginRight: isMic ? 0 : 'auto',
        }}
      >
        {/* Partial indicator */}
        {isPartial && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-callout)',
              animation: 'pulse 1.5s infinite',
            }}
          />
        )}
        
        <div style={{ opacity: isPartial ? 0.8 : 1 }}>
          {text || '…'}
        </div>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
