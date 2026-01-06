import { useRef } from "react";

export type SystemAudioSourcePreference = 'blackhole' | 'aggregate' | 'auto';

async function findSystemAudioDeviceId(pref: SystemAudioSourcePreference): Promise<string | undefined> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter(d => d.kind === 'audioinput');

  const byName = (name: string) => inputs.find(d => (d.label || '').toLowerCase().includes(name.toLowerCase()))?.deviceId;

  if (pref === 'blackhole' || pref === 'auto') {
    const id = byName('blackhole');
    if (id) return id;
  }
  if (pref === 'aggregate' || pref === 'auto') {
    const id = byName('aggregate');
    if (id) return id;
  }
  return undefined;
}

export function useSystemAudioStream(
  onRmsUpdate: (rms: number) => void,
  onPcmUpdate: (pcm: Float32Array, sampleRate: number) => void,
  preference: SystemAudioSourcePreference = 'auto'
) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<AudioNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStartingRef = useRef(false);
  const gainRef = useRef<GainNode | null>(null);
  const isContextReadyRef = useRef(false);

  const start = async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    try {
      // Ensure permissions granted (labels require it)
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const deviceId = await findSystemAudioDeviceId(preference);

      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (!isContextReadyRef.current) {
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        await audioContext.resume();
        await audioContext.audioWorklet.addModule('/pcm-worklet.js');
        isContextReadyRef.current = true;
      }

      const audioContext = audioContextRef.current!;
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      const workletNode = new AudioWorkletNode(audioContext, 'pcm-worklet');
      processorRef.current = workletNode;

      const gain = audioContext.createGain();
      gain.gain.value = 0;
      gainRef.current = gain;

      let lastUpdate = 0;
      workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio') {
          const { rms, pcm } = event.data;
          const now = Date.now();
          if (now - lastUpdate > 100) {
            onRmsUpdate(rms);
            lastUpdate = now;
          }
          onPcmUpdate(pcm, audioContext.sampleRate);
        }
      };

      source.connect(workletNode);
      workletNode.connect(gain);
      gain.connect(audioContext.destination);

    } catch (error) {
      console.error('[system-audio] Error starting system audio stream:', error);
    } finally {
      isStartingRef.current = false;
    }
  };

  const stop = () => {
    if (gainRef.current) { gainRef.current.disconnect(); gainRef.current = null; }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; isContextReadyRef.current = false; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  return { start, stop };
}
