import { ASRResult, PartialTranscript } from "../asr/types";

export interface Callout {
  id: string;
  segmentId: string;
  text: string;
  confidence: number;
  timestamp: number;
  isPartial?: boolean;
}

export class CalloutDetector {
  private calloutCounter = 0;
  private partialCallouts = new Map<string, { confidence: number; text: string }>();
  private readonly confidenceThreshold = 0.7;

  private readonly calloutPatterns = [
    { pattern: /\b(urgent|emergency|critical|important)\b/i, confidence: 0.9 },
    { pattern: /\b(asap|immediately|right away|right now)\b/i, confidence: 0.85 },
    { pattern: /\b(must|need to|have to|required)\b/i, confidence: 0.7 },
    { pattern: /\b(deadline|due date|overdue)\b/i, confidence: 0.8 },
    { pattern: /\b(alert|warning|attention|notice)\b/i, confidence: 0.75 },
    { pattern: /\b(problem|issue|blocker|stuck)\b/i, confidence: 0.7 },
    { pattern: /\b(help|support|assist)\b/i, confidence: 0.65 }
  ];

  detectCallout(result: ASRResult): Callout | null {
    const transcript = result.transcript.toLowerCase();

    for (const { pattern, confidence } of this.calloutPatterns) {
      if (pattern.test(transcript)) {
        const callout: Callout = {
          id: `callout_${++this.calloutCounter}`,
          segmentId: result.segmentId,
          text: result.transcript,
          confidence,
          timestamp: Date.now(),
          isPartial: false
        };

        console.log(`[callout] Detected: "${result.transcript}" (confidence: ${confidence.toFixed(2)})`);

        // Clean up any partial callout for this segment
        this.partialCallouts.delete(result.segmentId);

        return callout;
      }
    }

    return null;
  }

  detectCalloutFromPartial(partial: PartialTranscript): Callout | null {
    const transcript = partial.text.toLowerCase();
    const segmentId = partial.segmentId;

    // Get existing partial callout data
    const existing = this.partialCallouts.get(segmentId);

    for (const { pattern, confidence } of this.calloutPatterns) {
      if (pattern.test(transcript)) {
        // Rolling confidence update
        const rollingConfidence = existing 
          ? (existing.confidence * 0.7 + confidence * 0.3)
          : confidence;

        // Store/update partial callout
        this.partialCallouts.set(segmentId, {
          confidence: rollingConfidence,
          text: partial.text
        });

        // Only emit if confidence crosses threshold and hasn't been emitted before
        if (rollingConfidence >= this.confidenceThreshold && (!existing || existing.confidence < this.confidenceThreshold)) {
          const callout: Callout = {
            id: `callout_${++this.calloutCounter}`,
            segmentId,
            text: partial.text,
            confidence: rollingConfidence,
            timestamp: Date.now(),
            isPartial: true
          };

          console.log(`[callout] Early detection (partial): "${partial.text}" (confidence: ${rollingConfidence.toFixed(2)})`);

          return callout;
        }

        return null;
      }
    }

    // No pattern match - clear any partial callout
    this.partialCallouts.delete(segmentId);
    return null;
  }

  clearPartialCallout(segmentId: string): void {
    this.partialCallouts.delete(segmentId);
  }
}