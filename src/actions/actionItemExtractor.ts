import { ASRResult } from "../asr/types";

export interface ActionItem {
  id: string;
  text: string;
  owner?: string;
  segmentId: string;
  confidence: number;
}

export class ActionItemExtractor {
  private actionCounter = 0;

  private readonly actionIndicators = [
    { pattern: /\b(we should|we need to|we must)\b/i, confidence: 0.8 },
    { pattern: /\b(let's|lets)\b/i, confidence: 0.7 },
    { pattern: /\b(can you|could you|would you)\b/i, confidence: 0.9, hasOwner: true },
    { pattern: /\b(I'll|I will|I'm going to)\b/i, confidence: 0.85, hasOwner: true },
    { pattern: /\b(follow up|reach out|get back)\b/i, confidence: 0.75 },
    { pattern: /\b(next steps?|action items?)\b/i, confidence: 0.7 },
    { pattern: /\b(please|make sure to|don't forget)\b/i, confidence: 0.65 },
    { pattern: /\b(todo|to do|task)\b/i, confidence: 0.6 }
  ];

  extractFromResults(results: ASRResult[]): ActionItem[] {
    const actionItems: ActionItem[] = [];

    for (const result of results) {
      const items = this.extractFromResult(result);
      actionItems.push(...items);
    }

    return actionItems;
  }

  private extractFromResult(result: ASRResult): ActionItem[] {
    const actionItems: ActionItem[] = [];
    const transcript = result.transcript;

    // Split into sentences
    const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);

    for (const sentence of sentences) {
      const action = this.detectAction(sentence, result.segmentId);
      if (action) {
        actionItems.push(action);
      }
    }

    return actionItems;
  }

  private detectAction(sentence: string, segmentId: string): ActionItem | null {
    for (const indicator of this.actionIndicators) {
      if (indicator.pattern.test(sentence)) {
        const owner = indicator.hasOwner ? this.extractOwner(sentence) : undefined;
        
        return {
          id: `action_${++this.actionCounter}`,
          text: sentence,
          owner,
          segmentId,
          confidence: indicator.confidence
        };
      }
    }

    return null;
  }

  private extractOwner(sentence: string): string | undefined {
    // Simple heuristics for owner extraction
    if (/\bcan you\b/i.test(sentence) || /\bcould you\b/i.test(sentence)) {
      return "assigned";
    }
    if (/\bI'll\b/i.test(sentence) || /\bI will\b/i.test(sentence)) {
      return "speaker";
    }
    return undefined;
  }
}