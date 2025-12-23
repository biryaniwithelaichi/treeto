// AudioWorklet global types
declare const AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
};

interface AudioWorkletProcessor {
  port: MessagePort;
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
}

declare function registerProcessor(name: string, processorCtor: new (options?: AudioWorkletNodeOptions) => AudioWorkletProcessor): void;

class PcmWorklet extends AudioWorkletProcessor {
  process(inputs: Float32Array[][]) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sum / channelData.length);

    const pcm = channelData.slice();

    this.port.postMessage({ type: "audio", rms, pcm }, [pcm.buffer]);

    return true;
  }
}

registerProcessor("pcm-worklet", PcmWorklet);