import { useEffect, useMemo, useState } from "react";

type StreamMetrics = {
  rms: number;
  segments: number;
  lastLatencyMs?: number;
  avgLatencyMs?: number;
  running?: boolean;
  enabled?: boolean;
};

export function DevSystemAudioDiagnostics({
  mic,
  system,
}: {
  mic: StreamMetrics;
  system: StreamMetrics;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [isMac, setIsMac] = useState<boolean | null>(null);
  const [driverInstalled, setDriverInstalled] = useState<boolean | null>(null);
  const [inputs, setInputs] = useState<MediaDeviceInfo[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now());

  const micActive = mic.running === true;
  const systemActive = system.running === true;

  const refreshDevices = async () => {
    try {
      // Ensure we have permission to read labels if not yet granted
      try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch {}
      const devices = await navigator.mediaDevices.enumerateDevices();
      setInputs(devices.filter(d => d.kind === 'audioinput'));
      setLastRefreshed(Date.now());
    } catch (e) {
      // ignore
    }
  };

  const refreshDriverStatus = async () => {
    try {
      const s = await (window as any).electronAPI?.systemAudio?.getStatus?.();
      if (s) {
        setIsMac(!!s.isMac);
        setDriverInstalled(!!s.installed);
      }
    } catch {
      setIsMac(null);
      setDriverInstalled(null);
    }
  };

  useEffect(() => {
    // Initial fetch on mount when panel is opened the first time
    if (!collapsed) {
      refreshDevices();
      refreshDriverStatus();
    }
  }, [collapsed]);

  const defaultMicLabel = useMemo(() => {
    const def = inputs.find(d => d.deviceId === 'default');
    return def?.label || inputs[0]?.label || 'Unknown';
  }, [inputs, lastRefreshed]);

  const systemPreferredLabel = useMemo(() => {
    const byName = (name: string) => inputs.find(d => (d.label || '').toLowerCase().includes(name))?.label;
    return byName('blackhole') || byName('aggregate') || 'None detected';
  }, [inputs, lastRefreshed]);

  const fmtMs = (v?: number) => (v == null ? '-' : `${v} ms`);
  const hasMicRms = mic.rms > 0.01;
  const hasSystemRms = system.rms > 0.01;

  return (
    <div style={{
      position: 'fixed',
      right: 16,
      bottom: 86, // above control bar
      zIndex: 50,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-color)',
      borderRadius: 8,
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      width: collapsed ? 220 : 420,
      color: 'var(--text-primary)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, opacity: 0.9 }}>Diagnostics</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>(dev only)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!collapsed && (
            <button
              onClick={() => { refreshDevices(); refreshDriverStatus(); }}
              style={{
                background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)',
                borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12
              }}
            >Refresh</button>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: 16 }}
            aria-label={collapsed ? 'Expand diagnostics' : 'Collapse diagnostics'}
          >{collapsed ? '▲' : '▼'}</button>
        </div>
      </div>

      {collapsed ? (
        <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <MiniStat label="Mic RMS" value={hasMicRms ? '•' : '–'} ok={hasMicRms} />
          <MiniStat label="Sys RMS" value={hasSystemRms ? '•' : '–'} ok={hasSystemRms} />
          <MiniStat label="Mic Segs" value={String(mic.segments)} />
          <MiniStat label="Sys Segs" value={String(system.segments)} />
        </div>
      ) : (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Driver Status */}
          <Section title="Driver Status">
            <Row label="Platform" value={isMac == null ? 'unknown' : (isMac ? 'macOS' : 'other')} />
            <Row label="Installed" value={driverInstalled == null ? 'unknown' : (driverInstalled ? 'yes' : 'no')} />
          </Section>

          {/* Devices */}
          <Section title="Active Devices">
            <Row label="Mic (default)" value={defaultMicLabel} />
            <Row label="System (pref)" value={systemPreferredLabel} />
            <Row label="Inputs" value={inputs.length ? `${inputs.length} detected` : 'none'} />
          </Section>

          {/* Mic Metrics */}
          <Section title="Mic Stream">
            <Row label="Running" value={micActive ? 'yes' : 'no'} />
            <Row label="RMS" value={mic.rms.toFixed(4)} ok={hasMicRms} />
            <Row label="Segments" value={String(mic.segments)} />
            <Row label="ASR Last" value={fmtMs(mic.lastLatencyMs)} />
            <Row label="ASR Avg" value={fmtMs(mic.avgLatencyMs)} />
          </Section>

          {/* System Metrics */}
          <Section title="System Stream">
            <Row label="Enabled" value={system.enabled ? 'yes' : 'no'} />
            <Row label="Running" value={systemActive ? 'yes' : 'no'} />
            <Row label="RMS" value={system.rms.toFixed(4)} ok={hasSystemRms} />
            <Row label="Segments" value={String(system.segments)} />
            <Row label="ASR Last" value={fmtMs(system.lastLatencyMs)} />
            <Row label="ASR Avg" value={fmtMs(system.avgLatencyMs)} />
          </Section>

          <div style={{ textAlign: 'right', color: 'var(--text-tertiary)', fontSize: 11 }}>
            updated {new Date(lastRefreshed).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 6 }}>
      <div style={{
        padding: '6px 8px', borderBottom: '1px solid var(--border-color)',
        fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)'
      }}>{title}</div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 12 }}>
        {ok === undefined ? null : (
          <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: 4,
            background: ok ? 'var(--accent-callout)' : 'var(--text-tertiary)', marginRight: 6
          }} />
        )}
        <span>{value}</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 8px', border: '1px solid var(--border-color)', borderRadius: 6,
      background: 'var(--bg-secondary)'
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600 }}>
        {ok === undefined ? null : (
          <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: 4,
            background: ok ? 'var(--accent-callout)' : 'var(--text-tertiary)', marginRight: 6
          }} />
        )}
        {value}
      </span>
    </div>
  );
}
