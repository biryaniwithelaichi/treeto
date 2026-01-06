import { ASRProvider, ASRResult, StreamingASRProvider, PartialTranscript } from "./types";
import { SpeechSegment } from "../segmentBuilder";

export class ASRManager {
  private queue: SpeechSegment[] = [];
  private isProcessing = false;
  private onResultCallback?: (result: ASRResult) => void;
  private onPartialCallback?: (partial: PartialTranscript) => void;

  constructor(private provider: ASRProvider) {}

  setOnResultCallback(callback: (result: ASRResult) => void): void {
    this.onResultCallback = callback;
  }

  setOnPartialCallback(callback: (partial: PartialTranscript) => void): void {
    this.onPartialCallback = callback;
  }

  enqueueSegment(segment: SpeechSegment): void {
    this.queue.push(segment);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const segment = this.queue.shift()!;
      try {
        console.log(`[asr] transcribing segment ${segment.id} (${(segment.durationMs / 1000).toFixed(1)}s) using ${this.provider.name}`);
        
        // Check if provider supports streaming
        let result: ASRResult;
        if (this.isStreamingProvider(this.provider) && this.onPartialCallback) {
          result = await this.provider.transcribeSegmentStreaming(
            segment,
            this.onPartialCallback
          );
        } else {
          result = await this.provider.transcribeSegment(segment);
        }
        
        console.log(`[asr] completed segment ${segment.id}: "${result.transcript}"`);

        this.onResultCallback?.(result);
      } catch (error) {
        console.error(`[asr] failed to transcribe segment ${segment.id}:`, error);
        // Continue processing other segments even if one fails
      }
    }

    this.isProcessing = false;
  }

  private isStreamingProvider(provider: ASRProvider): provider is StreamingASRProvider {
    return 'supportsStreaming' in provider && provider.supportsStreaming === true && 'transcribeSegmentStreaming' in provider;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}