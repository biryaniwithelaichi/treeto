import { PcmChunk } from "./pcmChunker";
import { NoiseEstimator } from "./noiseEstimator";

export type AudioState = "speech" | "silence";

export interface ClassifiedChunk {
  chunk: PcmChunk;
  state: AudioState;
  rms: number;
  speechConfidence: number;
}

export class SilenceDetector {
  private readonly absoluteMinThreshold: number;
  private readonly noiseMultiplier: number;
  private lastThresholdLog: number = 0;
  private readonly thresholdLogThrottleMs: number = 10000; // Log threshold changes every 10s

  constructor(
    private noiseEstimator: NoiseEstimator,
    absoluteMinThreshold: number = 0.012,
    noiseMultiplier: number = 2.5
  ) {
    this.absoluteMinThreshold = absoluteMinThreshold;
    this.noiseMultiplier = noiseMultiplier;
  }

  classifyChunk(chunk: PcmChunk): ClassifiedChunk {
    // Calculate RMS from the PCM samples
    let sum = 0;
    for (let i = 0; i < chunk.samples.length; i++) {
      sum += chunk.samples[i] * chunk.samples[i];
    }
    const rms = Math.sqrt(sum / chunk.samples.length);

    // Get adaptive threshold
    const adaptiveThreshold = this.noiseEstimator.getAdaptiveThreshold(
      this.absoluteMinThreshold,
      this.noiseMultiplier
    );

    // Log threshold changes (throttled)
    const now = Date.now();
    if (now - this.lastThresholdLog > this.thresholdLogThrottleMs) {
      console.log(`[silence] adaptive threshold: ${adaptiveThreshold.toFixed(4)}`);
      this.lastThresholdLog = now;
    }

    // Classify
    const state: AudioState = rms > adaptiveThreshold ? "speech" : "silence";

    // Update noise floor during silence
    if (state === "silence") {
      this.noiseEstimator.updateWithSilenceRms(rms);
    }

    // Calculate speech confidence
    const speechConfidence = state === "speech"
      ? Math.min(Math.max((rms - adaptiveThreshold) / adaptiveThreshold, 0), 1)
      : 0;

    return {
      chunk,
      state,
      rms,
      speechConfidence
    };
  }
}