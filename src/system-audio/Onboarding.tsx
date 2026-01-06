import { useEffect, useState } from "react";

type SystemAudioStatus = {
  platform: string;
  isMac: boolean;
  installed: boolean;
  inputs: Array<{ name: string; uid: string; isAggregate?: boolean }>;
  pkgPath?: string;
};

type VerificationStatus = {
  driverInstalled: boolean;
  micPermissionGranted: boolean;
  systemAudioDevicePresent: boolean;
  aggregateInputPresent: boolean;
  allChecksPass: boolean;
};

export function SystemAudioOnboarding(props: {
  onComplete: () => void;
}) {
  const [status, setStatus] = useState<SystemAudioStatus | null>(null);
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [busy, setBusy] = useState(false);
  
  const isMac = status?.isMac;

  // Poll verification status every 1.5 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const s = await (window as any).electronAPI?.systemAudio?.getStatus?.();
        if (s) setStatus(s);
        
        const v = await (window as any).electronAPI?.systemAudio?.verifySetup?.();
        if (v) setVerification(v);
      } catch (e) {
        console.warn('[onboarding] polling failed', e);
      }
    };

    poll(); // Initial
    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleInstall = async () => {
    if (!isMac) return;
    setBusy(true);
    try {
      await (window as any).electronAPI?.systemAudio?.install?.();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const openMicPrefs = async () => {
    await (window as any).electronAPI?.systemAudio?.openPrefs?.('microphone');
  };

  const openAMSetup = async () => {
    await (window as any).electronAPI?.systemAudio?.openAudioMidiSetup?.();
  };

  const allChecksPass = verification?.allChecksPass || false;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        width: 640, maxWidth: '90vw', background: 'var(--bg-secondary)',
        color: 'var(--text-primary)', border: '1px solid var(--border-color)',
        borderRadius: 12, boxShadow: '0 16px 64px rgba(0,0,0,0.6)', padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Complete Audio Setup</h2>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Required</span>
        </div>

        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          To capture complete meeting audio including other participants, we'll install a virtual audio driver. This is required before you can use the app.
        </div>

        {!isMac && (
          <div style={{ 
            marginTop: 16, padding: 12, background: 'var(--bg-elevated)', 
            borderRadius: 8, color: 'var(--text-secondary)', border: '1px solid var(--border-color)' 
          }}>
            <strong>Note:</strong> System audio capture requires macOS. On other platforms, close this app and run it on a Mac.
          </div>
        )}

        <div style={{ marginTop: 20, display: 'grid', gap: 12 }}>
          {/* Step 1: Install driver */}
          <StepCard
            number={1}
            title="Install virtual audio driver"
            description={`Bundled installer: ${status?.pkgPath || 'audio/blackhole-2ch.pkg'}`}
            status={getStepStatus(verification?.driverInstalled, busy)}
            action={
              <button 
                disabled={!isMac || busy || verification?.driverInstalled} 
                onClick={handleInstall} 
                style={{
                  background: verification?.driverInstalled ? 'var(--bg-elevated)' : 'var(--accent-action)',
                  color: verification?.driverInstalled ? 'var(--text-tertiary)' : 'white',
                  padding: '8px 12px', 
                  borderRadius: 8,
                  border: 'none',
                  cursor: (!isMac || busy || verification?.driverInstalled) ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  fontSize: 13,
                }}
              >
                {verification?.driverInstalled ? 'Installed' : busy ? 'Installing…' : 'Install'}
              </button>
            }
          />

          {/* Step 2: Grant permissions */}
          <StepCard
            number={2}
            title="Grant microphone access"
            description="Approve in System Settings → Privacy & Security → Microphone"
            status={getStepStatus(verification?.micPermissionGranted)}
            action={
              <button 
                onClick={openMicPrefs} 
                style={{ 
                  background: 'var(--bg-hover)', 
                  color: 'var(--text-primary)', 
                  padding: '8px 12px', 
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 13,
                }}
              >
                Open Settings
              </button>
            }
          />

          {/* Step 3: Verify system audio device */}
          <StepCard
            number={3}
            title="System audio device detected"
            description="BlackHole virtual device must be present"
            status={getStepStatus(verification?.systemAudioDevicePresent)}
            action={null}
          />

          {/* Step 4: Create Aggregate / Multi-Output */}
          <StepCard
            number={4}
            title="Configure aggregate audio device"
            description="Create Aggregate Input (Mic + BlackHole) in Audio MIDI Setup"
            status={getStepStatus(verification?.aggregateInputPresent)}
            action={
              <button 
                onClick={openAMSetup} 
                style={{ 
                  background: 'var(--bg-hover)', 
                  color: 'var(--text-primary)', 
                  padding: '8px 12px', 
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 13,
                }}
              >
                Open Audio MIDI
              </button>
            }
          />
        </div>

        <div style={{ 
          marginTop: 20, 
          padding: 12, 
          background: 'var(--bg-elevated)', 
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--text-tertiary)',
          textAlign: 'center'
        }}>
          {allChecksPass 
            ? '✓ All checks passed. You can continue.' 
            : '⏳ We will automatically detect when setup is complete.'}
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            disabled={!allChecksPass}
            onClick={() => {
              localStorage.setItem('systemAudioSetupComplete', 'true');
              props.onComplete();
            }} 
            style={{ 
              background: allChecksPass ? 'var(--accent-recording)' : 'var(--bg-elevated)', 
              color: allChecksPass ? 'white' : 'var(--text-tertiary)', 
              padding: '10px 20px', 
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              border: 'none',
              cursor: allChecksPass ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function StepCard({ number, title, description, status, action }: {
  number: number;
  title: string;
  description: string;
  status: 'ready' | 'waiting' | 'not-ready';
  action: React.ReactNode;
}) {
  const icon = status === 'ready' ? '✅' : status === 'waiting' ? '⏳' : '❌';
  const borderColor = status === 'ready' ? 'var(--accent-callout)' : 'var(--border-color)';

  return (
    <div style={{ 
      padding: 14, 
      borderRadius: 8, 
      background: 'var(--bg-elevated)',
      border: `1px solid ${borderColor}`,
      transition: 'border-color 0.3s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{number}. {title}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 24 }}>
            {description}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

function getStepStatus(isReady?: boolean, isWaiting?: boolean): 'ready' | 'waiting' | 'not-ready' {
  if (isWaiting) return 'waiting';
  if (isReady) return 'ready';
  return 'not-ready';
}
