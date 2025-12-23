export interface PcmChunk {
  samples: Float32Array;
  timestampStart: number;
  timestampEnd: number;
}

export class PcmChunker {
  private buffer: Float32Array[] = [];
  private totalSamples: number = 0;
  private readonly targetSampleRate = 16000;
  private readonly chunkDurationMs = 1000;
  private readonly targetSamplesPerChunk = this.targetSampleRate * (this.chunkDurationMs / 1000);
  private chunkStartTime: number = Date.now();

  constructor(private onChunk: (chunk: PcmChunk) => void) {}

  addFrame(pcm: Float32Array, inputSampleRate: number): void {
    // Resample to 16kHz
    const resampled = this.resamplePcm(pcm, inputSampleRate, this.targetSampleRate);
    this.buffer.push(resampled);
    this.totalSamples += resampled.length;

    // Emit chunks when we have enough samples
    while (this.totalSamples >= this.targetSamplesPerChunk) {
      this.emitChunk();
    }
  }

  private resamplePcm(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
    if (inputRate === outputRate) {
      return input.slice();
    }

    const ratio = inputRate / outputRate;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const inputIndex = i * ratio;
      const index = Math.floor(inputIndex);
      const fraction = inputIndex - index;

      if (index + 1 < input.length) {
        // Linear interpolation
        output[i] = input[index] * (1 - fraction) + input[index + 1] * fraction;
      } else {
        output[i] = input[index];
      }
    }

    return output;
  }

  private emitChunk(): void {
    if (this.totalSamples < this.targetSamplesPerChunk) return;

    // Take exactly targetSamplesPerChunk samples
    const chunkSamples = new Float32Array(this.targetSamplesPerChunk);
    let samplesTaken = 0;
    const newBuffer: Float32Array[] = [];

    for (const frame of this.buffer) {
      const remaining = this.targetSamplesPerChunk - samplesTaken;
      if (remaining <= 0) {
        newBuffer.push(frame);
        continue;
      }

      if (frame.length <= remaining) {
        chunkSamples.set(frame, samplesTaken);
        samplesTaken += frame.length;
      } else {
        chunkSamples.set(frame.subarray(0, remaining), samplesTaken);
        samplesTaken += remaining;
        newBuffer.push(frame.subarray(remaining));
      }

      if (samplesTaken >= this.targetSamplesPerChunk) break;
    }

    this.buffer = newBuffer;
    this.totalSamples -= this.targetSamplesPerChunk;

    const timestampStart = this.chunkStartTime;
    const timestampEnd = Date.now();
    this.chunkStartTime = timestampEnd;

    const chunk: PcmChunk = {
      samples: chunkSamples,
      timestampStart,
      timestampEnd
    };

    this.onChunk(chunk);
    console.log(`[chunk] PCM chunk emitted (${((timestampEnd - timestampStart) / 1000).toFixed(2)}s, ${chunkSamples.length} samples)`);
  }

  destroy(): void {
    // Clear any remaining buffered data
    this.buffer = [];
    this.totalSamples = 0;
  }
}