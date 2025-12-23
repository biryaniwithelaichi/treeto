import { useEffect, useRef } from 'react';
import { TranscriptBubble } from './TranscriptBubble';

export type LiveTranscriptItem = {
  id: string;
  text: string;
  source: 'mic' | 'system';
  isPartial: boolean;
  timestamp: Date;
};

type LiveTranscriptFeedProps = {
  transcripts: LiveTranscriptItem[];
};

export function LiveTranscriptFeed({ transcripts }: LiveTranscriptFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    // Auto-scroll to bottom when new transcripts arrive
    if (transcripts.length > prevCountRef.current && containerRef.current) {
      const container = containerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom || prevCountRef.current === 0) {
        // Smooth scroll to bottom
        setTimeout(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth',
          });
        }, 50);
      }
    }
    prevCountRef.current = transcripts.length;
  }, [transcripts.length]);

  if (transcripts.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--text-tertiary)',
          gap: 'var(--spacing-md)',
        }}
      >
        <div style={{ fontSize: '32px', opacity: 0.5 }}>💬</div>
        <div style={{ fontSize: 'var(--font-size-sm)' }}>Listening for speech…</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: 'var(--spacing-lg) var(--spacing-xl)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {transcripts.map((item) => (
        <TranscriptBubble
          key={item.id}
          id={item.id}
          text={item.text}
          source={item.source}
          isPartial={item.isPartial}
          timestamp={item.timestamp}
        />
      ))}
    </div>
  );
}
