import { ASRProvider, ASRResult } from "../types";
import { SpeechSegment } from "../../segmentBuilder";

export class MockASRProvider implements ASRProvider {
  name = "MockASR";

  async transcribeSegment(segment: SpeechSegment): Promise<ASRResult> {
    // Simulate processing time based on segment duration (realistic delay)
    const processingDelay = Math.min(segment.durationMs * 0.1, 2000); // Max 2s delay
    await new Promise(resolve => setTimeout(resolve, processingDelay));

    // Generate deterministic fake transcript based on segment properties
    const duration = (segment.durationMs / 1000).toFixed(1);
    const confidence = Math.round(segment.averageConfidence * 100);
    const chunkCount = segment.chunks.length;

    const transcript = `(mock) segment of ${duration} seconds with ${chunkCount} chunks at ${confidence}% confidence`;

    return {
      segmentId: segment.id,
      transcript,
      language: "en",
      chunks: [
        {
          text: transcript,
          startTime: segment.startTime,
          endTime: segment.endTime,
          confidence: segment.averageConfidence
        }
      ]
    };
  }
}