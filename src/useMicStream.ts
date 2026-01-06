import { useRef } from "react";

export function useMicStream(
  onRmsUpdate: (rms: number) => void,
  onPcmUpdate: (pcm: Float32Array, sampleRate: number) => void
) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<AudioNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStartedRef = useRef(false);
  const isStartingRef = useRef(false);
  const gainRef = useRef<GainNode | null>(null);
  const isContextReadyRef = useRef(false);

  const start = async () => {
    if (isStartingRef.current) return;

    console.log("[mic] startMic entering");
    isStartingRef.current = true;

    console.log("[mic] startMic called");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[mic] getUserMedia success");

      streamRef.current = stream;
    console.log("[mic] yielding event loop before audio graph");
    await new Promise(resolve => setTimeout(resolve, 0));

    console.log("[mic] audio context + graph initialized");

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
      let lastLog = 0;
      workletNode.port.onmessage = (event) => {
        try {
          if (event.data.type === "audio") {
            const { rms, pcm } = event.data;
            if (Date.now() - lastLog > 100) {
              console.log(`[mic] RMS: ${rms.toFixed(4)}`);
              lastLog = Date.now();
            }
            if (Date.now() - lastUpdate > 100) {
              onRmsUpdate(rms);
              lastUpdate = Date.now();
            }
            onPcmUpdate(pcm, audioContext.sampleRate);
          }
        } catch (error) {
          console.error("[mic] Error in onmessage:", error);
        }
      };

      source.connect(workletNode);
      workletNode.connect(gain);
      gain.connect(audioContext.destination);

      isStartedRef.current = true;
      console.log("[mic] startMic fully active");
      isStartingRef.current = false;
    } catch (error) {
      console.error("[mic] Error starting mic:", error);
      isStartingRef.current = false;
    }
  };

  const stop = () => {
    if (isStartingRef.current) {
      console.log("[mic] stopMic ignored (startup in progress)");
      return;
    }

    console.log("[mic] stopMic called");

    isStartedRef.current = false;

    if (gainRef.current) {
      gainRef.current.disconnect();
      gainRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      isContextReadyRef.current = false;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      streamRef.current = null;
    }
  };

  return { start, stop };
}