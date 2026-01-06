import { useState, useEffect, useRef } from "react";
import { useMicStream } from "./useMicStream";
import { useSystemAudioStream } from "./useSystemAudioStream";
import { PcmChunker, PcmChunk } from "./pcmChunker";
import { SegmentBuilder, SpeechSegment } from "./segmentBuilder";
import { ASRManager } from "./asr/asrManager";
import { MockASRProvider } from "./asr/providers/mockASR";
import { DeepgramASRProvider } from "./asr/providers/deepgramASR";
import { DeepgramStreamingProvider } from "./asr/providers/deepgramStreamingASR";
import { ASRResult, ASRProvider, PartialTranscript } from "./asr/types";
import { MeetingManager, MeetingResult } from "./meetingManager";
import { CalloutDetector, Callout } from "./callouts/calloutDetector";
import "./theme.css";
import { SystemAudioOnboarding } from "./system-audio/Onboarding";
import { DevSystemAudioDiagnostics } from "./dev/SystemAudioDiagnostics";
import { CalendarManager } from "./calendar/calendarManager";
import { GoogleCalendarProvider } from "./calendar/providers/googleCalendar";
import { CalendarMeeting } from "./calendar/types";
import { MeetingSelector } from "./calendar/MeetingSelector";
import { LiveTranscriptFeed, LiveTranscriptItem } from "./transcripts/LiveTranscriptFeed";
import { Meeting } from "./meetings/types";
import { MeetingStore } from "./meetings/meetingStore";
import { MeetingList } from "./meetings/MeetingList";

export default function App() {
  const [micRunning, setMicRunning] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [meetingResult, setMeetingResult] = useState<MeetingResult | null>(null);
  const [activeCallout, setActiveCallout] = useState<Callout | null>(null);
  // Dev diagnostics metrics
  const [micRms, setMicRms] = useState(0);
  const [systemRms, setSystemRms] = useState(0);
  const [micSegmentCount, setMicSegmentCount] = useState(0);
  const [systemSegmentCount, setSystemSegmentCount] = useState(0);
  const [micAsrLastLatency, setMicAsrLastLatency] = useState<number | null>(null);
  const [systemAsrLastLatency, setSystemAsrLastLatency] = useState<number | null>(null);
  const [micAsrAvgLatency, setMicAsrAvgLatency] = useState<number | null>(null);
  const [systemAsrAvgLatency, setSystemAsrAvgLatency] = useState<number | null>(null);
  // Calendar state
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarUserEmail, setCalendarUserEmail] = useState<string | undefined>(undefined);
  const [todaysMeetings, setTodaysMeetings] = useState<CalendarMeeting[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  // Meeting state - using Meeting model
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  // Live transcripts for feed
  const [liveTranscripts, setLiveTranscripts] = useState<LiveTranscriptItem[]>([]);

  const chunkerRef = useRef<PcmChunker | null>(null);
  const builderRef = useRef<SegmentBuilder | null>(null);
  const asrManagerRef = useRef<ASRManager | null>(null);
  const meetingManagerRef = useRef<MeetingManager | null>(null);
  const calloutDetectorRef = useRef<CalloutDetector | null>(null);
  const calloutTimeoutRef = useRef<number | null>(null);
  const segStartTsRef = useRef<Map<string, number>>(new Map());
  const micLatencyStatsRef = useRef<{ sum: number; count: number }>({ sum: 0, count: 0 });
  const systemLatencyStatsRef = useRef<{ sum: number; count: number }>({ sum: 0, count: 0 });
  const calendarManagerRef = useRef<CalendarManager | null>(null);
  const meetingStoreRef = useRef<MeetingStore | null>(null);

  // System audio pipeline refs (separate from mic)
  const chunkerSysRef = useRef<PcmChunker | null>(null);
  const builderSysRef = useRef<SegmentBuilder | null>(null);
  const asrManagerSysRef = useRef<ASRManager | null>(null);
  // Segment source tagging
  const segmentSourceMapRef = useRef<Map<string, 'mic' | 'system'>>(new Map());

  if (!chunkerRef.current) {
    chunkerRef.current = new PcmChunker((chunk: PcmChunk) => {
      if (builderRef.current) {
        // Stream raw chunks directly (no VAD - ASR model handles it)
        builderRef.current.processChunk(chunk);
      }
    });
  }

  if (!chunkerSysRef.current) {
    chunkerSysRef.current = new PcmChunker((chunk: PcmChunk) => {
      if (builderSysRef.current) {
        // Stream raw chunks directly (no VAD - ASR model handles it)
        builderSysRef.current.processChunk(chunk);
      }
    });
  }

  if (!meetingManagerRef.current) {
    meetingManagerRef.current = new MeetingManager();
  }

  if (!calloutDetectorRef.current) {
    calloutDetectorRef.current = new CalloutDetector();
  }

  if (!meetingStoreRef.current) {
    meetingStoreRef.current = new MeetingStore();
  }

  if (!calendarManagerRef.current) {
    // Get Google Client ID from environment variable
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (googleClientId) {
      const googleProvider = new GoogleCalendarProvider(googleClientId);
      calendarManagerRef.current = new CalendarManager(googleProvider);
    } else {
      console.warn('[app] VITE_GOOGLE_CLIENT_ID not set, calendar features disabled');
      calendarManagerRef.current = new CalendarManager();
    }
  }

  if (!asrManagerRef.current) {
    // Feature flag for ASR provider selection
    const ASR_PROVIDER = import.meta.env.VITE_ASR_PROVIDER || "mock";
    const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;
    const USE_STREAMING = import.meta.env.VITE_USE_STREAMING === "true";

    let provider: ASRProvider;
    
    if (ASR_PROVIDER === "deepgram" && DEEPGRAM_API_KEY) {
      if (USE_STREAMING) {
        console.log("[app] Using Deepgram Streaming ASR provider");
        provider = new DeepgramStreamingProvider(DEEPGRAM_API_KEY);
      } else {
        console.log("[app] Using Deepgram ASR provider");
        provider = new DeepgramASRProvider(DEEPGRAM_API_KEY);
      }
    } else {
      if (ASR_PROVIDER === "deepgram" && !DEEPGRAM_API_KEY) {
        console.warn("[app] Deepgram selected but API key missing, falling back to Mock ASR");
      }
      console.log("[app] Using Mock ASR provider");
      provider = new MockASRProvider();
    }
    
    asrManagerRef.current = new ASRManager(provider);
    
    // Set callback for partial transcripts (streaming only)
    asrManagerRef.current.setOnPartialCallback((partial: PartialTranscript) => {
      // Get source for this segment
      const src = segmentSourceMapRef.current.get(partial.segmentId) || 'mic';
      
      // Update or add partial transcript to feed
      setLiveTranscripts(prev => {
        const existingIndex = prev.findIndex(t => t.id === partial.segmentId);
        const item: LiveTranscriptItem = {
          id: partial.segmentId,
          text: partial.text,
          source: src,
          isPartial: !partial.isFinal,
          timestamp: new Date(partial.timestamp),
        };
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = item;
          return updated;
        }
        return [...prev, item];
      });
      
      // Check for callouts in partial transcripts
      const callout = calloutDetectorRef.current?.detectCalloutFromPartial(partial);
      if (callout) {
        // Clear existing timeout if any
        if (calloutTimeoutRef.current) {
          clearTimeout(calloutTimeoutRef.current);
        }
        
        // Show callout
        setActiveCallout(callout);
        
        // Auto-dismiss after 5 seconds
        calloutTimeoutRef.current = window.setTimeout(() => {
          setActiveCallout(null);
          calloutTimeoutRef.current = null;
        }, 5000);
      }
    });
    
    // Set callback for final results
    asrManagerRef.current.setOnResultCallback((result: ASRResult) => {
      meetingManagerRef.current?.addTranscription(result);
      // Optionally, result.source can be mapped from segmentId
      const src = segmentSourceMapRef.current.get(result.segmentId);
      if (src) {
        // @ts-ignore enrich at runtime for UI/analytics
        (result as any).source = src;
      }
      
      // Update live transcript feed with final result
      setLiveTranscripts(prev => {
        const existingIndex = prev.findIndex(t => t.id === result.segmentId);
        const item: LiveTranscriptItem = {
          id: result.segmentId,
          text: result.transcript,
          source: src || 'mic',
          isPartial: false,
          timestamp: new Date(),
        };
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = item;
          return updated;
        }
        return [...prev, item];
      });
      
      // Diagnostics: ASR latency per stream
      const startedAt = segStartTsRef.current.get(result.segmentId);
      if (startedAt) {
        const latency = Date.now() - startedAt;
        if (src === 'mic') {
          setMicAsrLastLatency(latency);
          micLatencyStatsRef.current.sum += latency;
          micLatencyStatsRef.current.count += 1;
          setMicAsrAvgLatency(
            micLatencyStatsRef.current.count > 0
              ? Math.round(micLatencyStatsRef.current.sum / micLatencyStatsRef.current.count)
              : null
          );
        } else if (src === 'system') {
          setSystemAsrLastLatency(latency);
          systemLatencyStatsRef.current.sum += latency;
          systemLatencyStatsRef.current.count += 1;
          setSystemAsrAvgLatency(
            systemLatencyStatsRef.current.count > 0
              ? Math.round(systemLatencyStatsRef.current.sum / systemLatencyStatsRef.current.count)
              : null
          );
        }
        segStartTsRef.current.delete(result.segmentId);
      }
      
      // Check for callouts in real-time
      const callout = calloutDetectorRef.current?.detectCallout(result);
      if (callout) {
        // Clear existing timeout if any
        if (calloutTimeoutRef.current) {
          clearTimeout(calloutTimeoutRef.current);
        }
        
        // Show callout
        setActiveCallout(callout);
        
        // Auto-dismiss after 5 seconds
        calloutTimeoutRef.current = window.setTimeout(() => {
          setActiveCallout(null);
          calloutTimeoutRef.current = null;
        }, 5000);
      }
    });
  }

  if (!asrManagerSysRef.current) {
    // Mirror provider selection for system stream
    const ASR_PROVIDER = import.meta.env.VITE_ASR_PROVIDER || "mock";
    const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;
    const USE_STREAMING = import.meta.env.VITE_USE_STREAMING === "true";
    let provider: ASRProvider;
    if (ASR_PROVIDER === "deepgram" && DEEPGRAM_API_KEY) {
      provider = USE_STREAMING ? new DeepgramStreamingProvider(DEEPGRAM_API_KEY) : new DeepgramASRProvider(DEEPGRAM_API_KEY);
    } else {
      provider = new MockASRProvider();
    }
    asrManagerSysRef.current = new ASRManager(provider);
    asrManagerSysRef.current.setOnPartialCallback((partial: PartialTranscript) => {
      // Get source for this segment
      const src = segmentSourceMapRef.current.get(partial.segmentId) || 'system';
      
      // Update or add partial transcript to feed
      setLiveTranscripts(prev => {
        const existingIndex = prev.findIndex(t => t.id === partial.segmentId);
        const item: LiveTranscriptItem = {
          id: partial.segmentId,
          text: partial.text,
          source: src,
          isPartial: !partial.isFinal,
          timestamp: new Date(partial.timestamp),
        };
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = item;
          return updated;
        }
        return [...prev, item];
      });
      
      const callout = calloutDetectorRef.current?.detectCalloutFromPartial(partial);
      if (callout) {
        if (calloutTimeoutRef.current) clearTimeout(calloutTimeoutRef.current);
        setActiveCallout(callout);
        calloutTimeoutRef.current = window.setTimeout(() => {
          setActiveCallout(null);
          calloutTimeoutRef.current = null;
        }, 5000);
      }
    });
    asrManagerSysRef.current.setOnResultCallback((result: ASRResult) => {
      meetingManagerRef.current?.addTranscription(result);
      const src = segmentSourceMapRef.current.get(result.segmentId);
      if (src) {
        // @ts-ignore
        (result as any).source = src;
      }
      
      // Update live transcript feed with final result
      setLiveTranscripts(prev => {
        const existingIndex = prev.findIndex(t => t.id === result.segmentId);
        const item: LiveTranscriptItem = {
          id: result.segmentId,
          text: result.transcript,
          source: src || 'system',
          isPartial: false,
          timestamp: new Date(),
        };
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = item;
          return updated;
        }
        return [...prev, item];
      });
      
      // Diagnostics: ASR latency per stream
      const startedAt = segStartTsRef.current.get(result.segmentId);
      if (startedAt) {
        const latency = Date.now() - startedAt;
        if (src === 'mic') {
          setMicAsrLastLatency(latency);
          micLatencyStatsRef.current.sum += latency;
          micLatencyStatsRef.current.count += 1;
          setMicAsrAvgLatency(
            micLatencyStatsRef.current.count > 0
              ? Math.round(micLatencyStatsRef.current.sum / micLatencyStatsRef.current.count)
              : null
          );
        } else if (src === 'system') {
          setSystemAsrLastLatency(latency);
          systemLatencyStatsRef.current.sum += latency;
          systemLatencyStatsRef.current.count += 1;
          setSystemAsrAvgLatency(
            systemLatencyStatsRef.current.count > 0
              ? Math.round(systemLatencyStatsRef.current.sum / systemLatencyStatsRef.current.count)
              : null
          );
        }
        segStartTsRef.current.delete(result.segmentId);
      }
      const callout = calloutDetectorRef.current?.detectCallout(result);
      if (callout) {
        if (calloutTimeoutRef.current) clearTimeout(calloutTimeoutRef.current);
        setActiveCallout(callout);
        calloutTimeoutRef.current = window.setTimeout(() => {
          setActiveCallout(null);
          calloutTimeoutRef.current = null;
        }, 5000);
      }
    });
  }

  if (!builderRef.current) {
    builderRef.current = new SegmentBuilder(
      (segment: SpeechSegment) => {
        meetingManagerRef.current?.addSegment(segment);
        segmentSourceMapRef.current.set(segment.id, 'mic');
        // Diagnostics: record segment start for latency metrics
        segStartTsRef.current.set(segment.id, Date.now());
        setMicSegmentCount(v => v + 1);
        // Send to ASR (non-blocking)
        asrManagerRef.current?.enqueueSegment(segment);
      },
      () => {
        // State changes no longer used in UI
      }
    );
  }

  if (!builderSysRef.current) {
    builderSysRef.current = new SegmentBuilder(
      (segment: SpeechSegment) => {
        // Tag and forward to ASR
        segmentSourceMapRef.current.set(segment.id, 'system');
        meetingManagerRef.current?.addSegment(segment);
        // Diagnostics: record segment start and count
        segStartTsRef.current.set(segment.id, Date.now());
        setSystemSegmentCount(v => v + 1);
        asrManagerSysRef.current?.enqueueSegment(segment);
      }
    );
  }

  const { start, stop } = useMicStream(
    (rms: number) => {
      setMicRms(rms);
    },
    (pcm: Float32Array, sampleRate: number) => {
      chunkerRef.current?.addFrame(pcm, sampleRate);
    }
  );

  const { start: startSystem, stop: stopSystem } = useSystemAudioStream(
    (rms: number) => {
      setSystemRms(rms);
    },
    (pcm: Float32Array, sampleRate: number) => {
      chunkerSysRef.current?.addFrame(pcm, sampleRate);
    },
    'auto'
  );

  const handleStart = () => {
    if (!micRunning) {
      // Require an active meeting (calendar or ad-hoc)
      if (!activeMeeting) {
        alert('Please create or select a meeting before starting.');
        return;
      }
      
      start();
      setMicRunning(true);
      setMeetingResult(null);
      setLiveTranscripts([]);
      // Reset diagnostics for a fresh session
      setMicSegmentCount(0);
      setSystemSegmentCount(0);
      setMicAsrLastLatency(null);
      setSystemAsrLastLatency(null);
      setMicAsrAvgLatency(null);
      setSystemAsrAvgLatency(null);
      micLatencyStatsRef.current = { sum: 0, count: 0 };
      systemLatencyStatsRef.current = { sum: 0, count: 0 };
      segStartTsRef.current.clear();
      // Start meeting with meeting_id
      meetingManagerRef.current?.startMeeting(activeMeeting.meeting_id);
      // System audio is always enabled (mandatory)
      startSystem();
    }
  };

  const handleStop = () => {
    if (micRunning) {
      stop();
      // System audio is always enabled (mandatory)
      stopSystem();
      setMicRunning(false);
      builderRef.current?.finalizePendingSegment();
      builderSysRef.current?.finalizePendingSegment?.();
      
      // Clear live transcripts and callout
      setLiveTranscripts([]);
      if (calloutTimeoutRef.current) {
        clearTimeout(calloutTimeoutRef.current);
        calloutTimeoutRef.current = null;
      }
      setActiveCallout(null);
      
      // Set meeting endTime
      if (activeMeeting) {
        meetingStoreRef.current?.updateMeeting(activeMeeting.meeting_id, {
          endTime: Date.now()
        });
      }
      
      // Wait a bit for final transcriptions, then end meeting
      setTimeout(() => {
        const result = meetingManagerRef.current?.endMeeting();
        if (result) {
          setMeetingResult(result);
        }
      }, 500);
    }
  };

  const copyNotesToClipboard = () => {
    if (meetingResult?.notesMarkdown) {
      navigator.clipboard.writeText(meetingResult.notesMarkdown)
        .then(() => console.log("[app] Notes copied to clipboard"))
        .catch(err => console.error("[app] Failed to copy notes:", err));
    }
  };

  const handleCalendarSignIn = async () => {
    try {
      setCalendarLoading(true);
      await calendarManagerRef.current?.signIn();
      const status = await calendarManagerRef.current?.getStatus();
      if (status?.connected) {
        setCalendarConnected(true);
        setCalendarUserEmail(status.userEmail);
        await handleCalendarRefresh();
      }
    } catch (error) {
      console.error('[app] Calendar sign-in failed:', error);
      alert('Failed to sign in to Google Calendar. Please try again.');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleCalendarRefresh = async () => {
    try {
      setCalendarLoading(true);
      const meetings = await calendarManagerRef.current?.fetchTodaysMeetings();
      setTodaysMeetings(meetings || []);
      
      // Auto-select current or next meeting
      const suggested = await calendarManagerRef.current?.getCurrentOrNextMeeting();
      if (suggested) {
        handleMeetingSelect(suggested);
      }
    } catch (error) {
      console.error('[app] Failed to refresh calendar:', error);
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleMeetingSelect = (calendarMeeting: CalendarMeeting | null) => {
    if (!calendarMeeting) {
      setActiveMeeting(null);
      meetingStoreRef.current?.setActiveMeeting(null);
      return;
    }

    // Create Meeting from CalendarMeeting
    const meeting = meetingStoreRef.current?.createMeeting({
      source: 'calendar',
      title: calendarMeeting.title,
      provider: calendarMeeting.provider as 'google' | 'outlook' | 'apple',
      eventId: calendarMeeting.id,
      scheduledStart: calendarMeeting.startTime.getTime(),
      scheduledEnd: calendarMeeting.endTime.getTime(),
      attendees: calendarMeeting.attendees,
    });

    if (meeting) {
      setActiveMeeting(meeting);
      meetingStoreRef.current?.setActiveMeeting(meeting.meeting_id);
      // Update meeting list
      setAllMeetings(meetingStoreRef.current?.getAllMeetings() || []);
    }
  };

  const handleCreateAdHoc = (title: string) => {
    // Create ad-hoc meeting
    const meeting = meetingStoreRef.current?.createMeeting({
      source: 'adhoc',
      title: title || 'Untitled meeting',
    });
    
    if (meeting) {
      setActiveMeeting(meeting);
      meetingStoreRef.current?.setActiveMeeting(meeting.meeting_id);
      // Update meeting list
      setAllMeetings(meetingStoreRef.current?.getAllMeetings() || []);
    }
  };

  const handleLoadMeeting = (meeting: Meeting) => {
    // Don't restart recording if already recording
    if (micRunning) {
      console.warn('[app] Cannot switch meetings while recording');
      return;
    }

    // Load the meeting
    setActiveMeeting(meeting);
    meetingStoreRef.current?.setActiveMeeting(meeting.meeting_id);
    
    // Clear any previous meeting result
    setMeetingResult(null);
  };

  useEffect(() => {
    // Initialize meeting list from store
    setAllMeetings(meetingStoreRef.current?.getAllMeetings() || []);

    // On first load, check if system audio setup is complete
    const setupComplete = localStorage.getItem('systemAudioSetupComplete') === 'true';
    
    if (!setupComplete) {
      // Force onboarding if setup not complete
      (async () => {
        try {
          const s = await (window as any).electronAPI?.systemAudio?.getStatus?.();
          // Show onboarding for macOS users or if we can't determine platform
          if (!s || s.isMac || s.platform === 'darwin') {
            setShowOnboarding(true);
          } else {
            // Non-macOS: still show onboarding to inform user
            setShowOnboarding(true);
          }
        } catch {
          setShowOnboarding(true);
        }
      })();
    } else {
      // No need to restore system audio preference - it's always enabled
    }

    // Initialize calendar status
    (async () => {
      try {
        const status = await calendarManagerRef.current?.getStatus();
        if (status?.connected) {
          setCalendarConnected(true);
          setCalendarUserEmail(status.userEmail);
          
          // Load selected meeting from storage
          const stored = calendarManagerRef.current?.loadSelectedMeetingFromStorage();
          if (stored) {
            handleMeetingSelect(stored);
          }
          
          // Refresh meetings in background
          handleCalendarRefresh();
        }
      } catch (e) {
        console.warn('[app] Calendar initialization failed:', e);
      }
    })();
    
    return () => {
      builderRef.current?.finalizePendingSegment();
      chunkerRef.current?.destroy();
      builderSysRef.current?.finalizePendingSegment?.();
      chunkerSysRef.current?.destroy?.();
      if (calloutTimeoutRef.current) {
        clearTimeout(calloutTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      backgroundColor: "var(--bg-primary)",
      color: "var(--text-primary)",
      fontFamily: "var(--font-family)",
      overflow: "hidden"
    }}>
      {/* Left Sidebar - Meeting List */}
      <MeetingList
        meetings={allMeetings}
        activeMeetingId={activeMeeting?.meeting_id || null}
        onSelectMeeting={handleLoadMeeting}
      />

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        {/* Top App Bar */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-color)",
          flexShrink: 0
        }}>
          {/* Top Row: App Title + Status + Settings */}
          <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--spacing-lg) var(--spacing-xl)",
          minHeight: "60px",
        }}>
          {/* App Title + Mic Status */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-lg)" }}>
            <div>
              <h1 style={{ 
                margin: 0,
                fontSize: "var(--font-size-xl)",
                fontWeight: 600,
                letterSpacing: "-0.5px"
              }}>
                Treeto
              </h1>
            </div>
            
            {/* Mic Status Badge */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-sm)",
              padding: "var(--spacing-sm) var(--spacing-md)",
              backgroundColor: micRunning ? "var(--bg-hover)" : "var(--bg-elevated)",
              borderRadius: "20px",
              border: `1px solid ${micRunning ? "var(--accent-recording)" : "var(--border-color)"}`,
              fontSize: "var(--font-size-sm)",
              fontWeight: 500,
              color: micRunning ? "var(--accent-recording)" : "var(--text-tertiary)"
            }}>
              <div style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: micRunning ? "var(--accent-recording)" : "var(--text-tertiary)",
                animation: micRunning ? "pulse 2s infinite" : "none"
              }} />
              {micRunning ? "LIVE" : "PAUSED"}
            </div>
          </div>

          {/* Settings Icon */}
          <button style={{
            background: "transparent",
            color: "var(--text-secondary)",
            padding: "var(--spacing-sm)",
            fontSize: "18px",
            cursor: "pointer",
            opacity: 0.7,
            transition: "all var(--transition-fast)"
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
          onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
          >
            ⚙️
          </button>
        </div>

        {/* Meeting Info Row */}
        <div style={{
          padding: "0 var(--spacing-xl) var(--spacing-lg) var(--spacing-xl)",
        }}>
          <MeetingSelector
            selectedMeeting={activeMeeting ? {
              id: activeMeeting.meeting_id,
              title: activeMeeting.title,
              startTime: new Date(activeMeeting.startTime),
              endTime: new Date(activeMeeting.startTime + 3600000), // dummy endTime
              provider: activeMeeting.source === 'adhoc' ? 'adhoc' : activeMeeting.calendarMeta?.provider || 'google',
            } : null}
            onMeetingSelect={handleMeetingSelect}
            onCreateAdHoc={handleCreateAdHoc}
            onSignIn={handleCalendarSignIn}
            onRefresh={handleCalendarRefresh}
            isConnected={calendarConnected}
            userEmail={calendarUserEmail}
            meetings={todaysMeetings}
            loading={calendarLoading}
          />
        </div>
      </div>

      {/* Content Panel - Transcript / Notes */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        {/* Transcript / Notes Panel */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--spacing-xl) var(--spacing-2xl)",
          backgroundColor: "var(--bg-primary)",
          display: "flex",
          flexDirection: "column"
        }}>
          {meetingResult ? (
            // Post-meeting: Show notes
            <div style={{ animation: "slideUp var(--transition-base)" }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                marginBottom: "var(--spacing-2xl)"
              }}>
                <div>
                  <h2 style={{
                    margin: 0,
                    fontSize: "var(--font-size-lg)",
                    fontWeight: 600,
                    color: "var(--text-primary)"
                  }}>
                    Meeting Notes
                  </h2>
                  {activeMeeting && (
                    <p style={{
                      margin: "var(--spacing-xs) 0 0 0",
                      fontSize: "var(--font-size-sm)",
                      color: "var(--text-secondary)"
                    }}>
                      {activeMeeting.title}
                    </p>
                  )}
                </div>
                <button 
                  onClick={copyNotesToClipboard}
                  style={{
                    backgroundColor: "var(--accent-action)",
                    color: "white",
                    border: "none",
                    padding: "var(--spacing-sm) var(--spacing-md)",
                    borderRadius: "6px",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all var(--transition-fast)"
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  Copy Markdown
                </button>
              </div>

              {/* Rendered Notes with Semantic HTML */}
              <div style={{
                fontSize: "var(--font-size-base)",
                lineHeight: "var(--line-height-relaxed)",
                color: "var(--text-primary)",
                maxWidth: "800px"
              }}>
                {meetingResult.notesMarkdown.split('\n').map((line, idx) => {
                  if (line.startsWith('# ')) {
                    return (
                      <h2 key={idx} style={{
                        fontSize: "var(--font-size-2xl)",
                        fontWeight: 700,
                        margin: "var(--spacing-2xl) 0 var(--spacing-lg) 0",
                        color: "var(--text-primary)"
                      }}>
                        {line.replace(/^# /, '')}
                      </h2>
                    );
                  } else if (line.startsWith('## ')) {
                    return (
                      <h3 key={idx} style={{
                        fontSize: "var(--font-size-md)",
                        fontWeight: 600,
                        margin: "var(--spacing-lg) 0 var(--spacing-md) 0",
                        color: "var(--text-primary)"
                      }}>
                        {line.replace(/^## /, '')}
                      </h3>
                    );
                  } else if (line.startsWith('- [ ] ')) {
                    return (
                      <div key={idx} style={{
                        margin: "var(--spacing-md) 0",
                        display: "flex",
                        gap: "var(--spacing-md)",
                        alignItems: "flex-start",
                        padding: "var(--spacing-md)",
                        backgroundColor: "var(--bg-secondary)",
                        borderRadius: "6px",
                        borderLeft: "3px solid var(--accent-action)"
                      }}>
                        <input 
                          type="checkbox" 
                          style={{
                            marginTop: "2px",
                            cursor: "pointer",
                            accentColor: "var(--accent-action)"
                          }}
                        />
                        <span>{line.replace(/^- \[ \] /, '')}</span>
                      </div>
                    );
                  } else if (line.startsWith('- ')) {
                    return (
                      <div key={idx} style={{
                        margin: "var(--spacing-sm) 0",
                        paddingLeft: "var(--spacing-lg)",
                        position: "relative",
                        color: "var(--text-primary)"
                      }}>
                        <span style={{
                          position: "absolute",
                          left: 0,
                          color: "var(--accent-callout)"
                        }}>
                          •
                        </span>
                        {line.replace(/^- /, '')}
                      </div>
                    );
                  } else if (line.trim() === '') {
                    return <div key={idx} style={{ height: "var(--spacing-md)" }} />;
                  } else {
                    return (
                      <p key={idx} style={{
                        margin: "var(--spacing-sm) 0",
                        color: "var(--text-primary)"
                      }}>
                        {line}
                      </p>
                    );
                  }
                })}
              </div>
            </div>
          ) : micRunning ? (
            // During meeting: Live transcript feed
            <LiveTranscriptFeed transcripts={liveTranscripts} />
          ) : (
            // Idle: Show prompt
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              color: "var(--text-tertiary)"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "var(--spacing-lg)" }}>🎤</div>
              <h2 style={{
                fontSize: "var(--font-size-lg)",
                fontWeight: 600,
                margin: "0 0 var(--spacing-md) 0",
                color: "var(--text-secondary)"
              }}>
                Ready to capture
              </h2>
              <p style={{
                margin: 0,
                fontSize: "var(--font-size-base)",
                color: "var(--text-tertiary)"
              }}>
                Start a meeting to begin recording
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--spacing-lg) var(--spacing-xl)",
        backgroundColor: "var(--bg-secondary)",
        borderTop: "1px solid var(--border-color)",
        height: "70px",
        flexShrink: 0,
        gap: "var(--spacing-lg)"
      }}>
        {/* Control Buttons */}
        <div style={{ display: "flex", gap: "var(--spacing-md)" }}>
          <button
            onClick={handleStart}
            disabled={micRunning}
            style={{
              backgroundColor: micRunning ? "var(--bg-elevated)" : "var(--accent-recording)",
              color: micRunning ? "var(--text-tertiary)" : "white",
              padding: "var(--spacing-md) var(--spacing-lg)",
              borderRadius: "8px",
              border: "none",
              fontWeight: 600,
              fontSize: "var(--font-size-base)",
              cursor: micRunning ? "not-allowed" : "pointer",
              transition: "all var(--transition-fast)"
            }}
            onMouseEnter={e => !micRunning && (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={e => !micRunning && (e.currentTarget.style.opacity = "1")}
          >
            ▶ Start Meeting
          </button>
          <button
            onClick={handleStop}
            disabled={!micRunning}
            style={{
              backgroundColor: !micRunning ? "var(--bg-elevated)" : "var(--accent-danger)",
              color: !micRunning ? "var(--text-tertiary)" : "white",
              padding: "var(--spacing-md) var(--spacing-lg)",
              borderRadius: "8px",
              border: "none",
              fontWeight: 600,
              fontSize: "var(--font-size-base)",
              cursor: !micRunning ? "not-allowed" : "pointer",
              transition: "all var(--transition-fast)"
            }}
            onMouseEnter={e => micRunning && (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={e => micRunning && (e.currentTarget.style.opacity = "1")}
          >
            ⏹ End Meeting
          </button>
        </div>

        {/* Audio Level Indicator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-md)",
          flex: 1,
          maxWidth: "200px"
        }}>
          <div style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--text-tertiary)",
            whiteSpace: "nowrap"
          }}>
            Audio Level
          </div>
          <div style={{
            flex: 1,
            height: "4px",
            backgroundColor: "var(--bg-elevated)",
            borderRadius: "2px",
            overflow: "hidden"
          }}>
            <div style={{
              height: "100%",
              backgroundColor: "var(--accent-recording)",
              width: "45%",
              transition: "width 0.1s linear",
              borderRadius: "2px"
            }} />
          </div>
        </div>
      </div>
      {showOnboarding && (
        <SystemAudioOnboarding 
          onComplete={() => setShowOnboarding(false)}
        />
      )}
      {import.meta.env.DEV && (
        // Dev-only diagnostics panel
        <DevSystemAudioDiagnostics
          mic={{
            rms: micRms,
            segments: micSegmentCount,
            lastLatencyMs: micAsrLastLatency ?? undefined,
            avgLatencyMs: micAsrAvgLatency ?? undefined,
            running: micRunning,
          }}
          system={{
            rms: systemRms,
            segments: systemSegmentCount,
            lastLatencyMs: systemAsrLastLatency ?? undefined,
            avgLatencyMs: systemAsrAvgLatency ?? undefined,
            enabled: true,
            running: micRunning,
          }}
        />
      )}
      
      {/* Callout Overlay (appears above transcript feed during recording) */}
      {micRunning && activeCallout && (
        <div style={{
          position: 'fixed',
          top: 'var(--spacing-2xl)',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 40,
          maxWidth: '600px',
          width: '90%',
          animation: 'slideUp var(--transition-base)',
        }}>
          <div style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--bg-elevated)',
            border: `2px solid var(--accent-callout)`,
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-sm)',
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: activeCallout.isPartial ? 'var(--accent-callout)' : 'var(--accent-recording)',
                animation: activeCallout.isPartial ? 'pulse 1.5s infinite' : 'none',
              }} />
              <span style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                color: activeCallout.isPartial ? 'var(--accent-callout)' : 'var(--accent-recording)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {activeCallout.isPartial ? '🔶 Action Item Forming' : '✓ Action Item'}
              </span>
            </div>
            <p style={{
              margin: 0,
              fontSize: 'var(--font-size-base)',
              lineHeight: 'var(--line-height-normal)',
              color: 'var(--text-primary)',
            }}>
              {activeCallout.text}
            </p>
          </div>
        </div>
      )}
      
      {import.meta.env.DEV && (
        // Dev-only diagnostics panel
        <DevSystemAudioDiagnostics
          mic={{
            rms: micRms,
            segments: micSegmentCount,
            lastLatencyMs: micAsrLastLatency ?? undefined,
            avgLatencyMs: micAsrAvgLatency ?? undefined,
            running: micRunning,
          }}
          system={{
            rms: systemRms,
            segments: systemSegmentCount,
            lastLatencyMs: systemAsrLastLatency ?? undefined,
            avgLatencyMs: systemAsrAvgLatency ?? undefined,
            enabled: true,
            running: micRunning,
          }}
        />
      )}
      </div>
      {/* End Main Content Area */}
    </div>
  );
}