import { ClassifiedChunk, AudioState } from "./silenceDetector";
import { PcmChunk } from "./pcmChunker";

export interface SpeechSegment {
  id: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  chunks: PcmChunk[];
  averageConfidence: number;
}

export class SegmentBuilder {
  private currentSegment: SpeechSegment | null = null;
  private silenceStartTime: number | null = null;
  private readonly minSilenceDurationMs: number;
  private readonly minSegmentDurationMs: number;
  private readonly minAverageConfidence: number;
  private segmentCounter = 0;

  constructor(
    private onSegmentFinalized: (segment: SpeechSegment) => void,
    private onStateChange?: (state: AudioState) => void,
    minSilenceDurationMs: number = 800,
    minSegmentDurationMs: number = 500,
    minAverageConfidence: number = 0.2
  ) {
    this.minSilenceDurationMs = minSilenceDurationMs;
    this.minSegmentDurationMs = minSegmentDurationMs;
    this.minAverageConfidence = minAverageConfidence;
  }

  /**
   * Stream raw audio chunks directly (VAD handled by ASR model)
   * Used when streaming ASR provider handles voice activity detection
   */
  processChunk(chunk: PcmChunk): void {
    // Create or append to current segment
    if (!this.currentSegment) {
      this.currentSegment = {
        id: `segment-${this.segmentCounter++}`,
        startTime: chunk.timestampStart,
        endTime: chunk.timestampEnd,
        durationMs: chunk.timestampEnd - chunk.timestampStart,
        chunks: [],
        averageConfidence: 1.0, // Raw chunks, assume max confidence
      };
    }

    // Append chunk
    this.currentSegment.chunks.push(chunk);
    this.currentSegment.endTime = chunk.timestampEnd;
    this.currentSegment.durationMs = this.currentSegment.endTime - this.currentSegment.startTime;

    // Finalize segment after collecting enough audio (e.g., 10s)
    if (this.currentSegment.durationMs > 10000) {
      const segment = this.currentSegment;
      this.currentSegment = null;
      this.onSegmentFinalized(segment);
    }
  }

  processClassifiedChunk(classifiedChunk: ClassifiedChunk): void {
    const { chunk, state, speechConfidence } = classifiedChunk;

    if (state === "speech") {
      this.handleSpeechChunk(chunk, speechConfidence);
    } else {
      this.handleSilenceChunk(chunk);
    }
  }

  private handleSpeechChunk(chunk: PcmChunk, speechConfidence: number): void {
    // If we were in silence, reset silence tracking
    if (this.silenceStartTime !== null) {
      console.log("[segment] speech started (silence ended)");
      this.silenceStartTime = null;
      this.onStateChange?.("speech");
    }

    // Start or continue a segment
    if (!this.currentSegment) {
      this.startNewSegment(chunk, speechConfidence);
    } else {
      this.addChunkToSegment(chunk, speechConfidence);
    }
  }

  private handleSilenceChunk(chunk: PcmChunk): void {
    if (this.currentSegment) {
      // We have an active segment, check if silence duration threshold is met
      if (this.silenceStartTime === null) {
        // Start of silence period
        this.silenceStartTime = chunk.timestampStart;
        console.log("[segment] silence started");
        this.onStateChange?.("silence");
      } else {
        // Continuing silence, check if we've exceeded threshold
        const silenceDuration = chunk.timestampEnd - this.silenceStartTime;
        if (silenceDuration >= this.minSilenceDurationMs) {
          this.finalizeCurrentSegment();
        }
      }
    } else {
      // No active segment, just track silence state
      if (this.silenceStartTime === null) {
        this.silenceStartTime = chunk.timestampStart;
        this.onStateChange?.("silence");
      }
    }
  }

  private startNewSegment(firstChunk: PcmChunk, speechConfidence: number): void {
    this.currentSegment = {
      id: `segment_${++this.segmentCounter}`,
      startTime: firstChunk.timestampStart,
      endTime: firstChunk.timestampEnd,
      durationMs: firstChunk.timestampEnd - firstChunk.timestampStart,
      chunks: [firstChunk],
      averageConfidence: speechConfidence
    };
  }

  private addChunkToSegment(chunk: PcmChunk, speechConfidence: number): void {
    if (!this.currentSegment) return;

    this.currentSegment.chunks.push(chunk);
    this.currentSegment.endTime = chunk.timestampEnd;
    this.currentSegment.durationMs = this.currentSegment.endTime - this.currentSegment.startTime;

    // Update rolling average confidence
    const totalChunks = this.currentSegment.chunks.length;
    this.currentSegment.averageConfidence =
      (this.currentSegment.averageConfidence * (totalChunks - 1) + speechConfidence) / totalChunks;
  }

  private finalizeCurrentSegment(): void {
    if (!this.currentSegment) return;

    // Apply filtering criteria
    const shouldKeep =
      this.currentSegment.durationMs >= this.minSegmentDurationMs &&
      this.currentSegment.averageConfidence >= this.minAverageConfidence;

    if (shouldKeep) {
      this.onSegmentFinalized(this.currentSegment);
      console.log(`[segment] finalized: ${(this.currentSegment.durationMs / 1000).toFixed(1)}s, ${this.currentSegment.chunks.length} chunks, confidence ${(this.currentSegment.averageConfidence * 100).toFixed(0)}%`);
    } else {
      const reason = this.currentSegment.durationMs < this.minSegmentDurationMs ? "too short" : "low confidence";
      console.log(`[segment] dropped (${reason}): ${(this.currentSegment.durationMs / 1000).toFixed(1)}s, confidence ${(this.currentSegment.averageConfidence * 100).toFixed(0)}%`);
    }

    this.currentSegment = null;
    this.silenceStartTime = null;
  }

  // Call this when stopping to finalize any pending segment
  finalizePendingSegment(): void {
    if (this.currentSegment) {
      this.finalizeCurrentSegment();
    }
  }

  getCurrentState(): AudioState {
    if (this.currentSegment && this.silenceStartTime === null) {
      return "speech";
    }
    return "silence";
  }
}