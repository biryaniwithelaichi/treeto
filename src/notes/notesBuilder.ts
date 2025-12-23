import { ASRResult } from "../asr/types";
import { SpeechSegment } from "../segmentBuilder";
import { ActionItem } from "../actions/actionItemExtractor";

export interface MeetingNotes {
  discussion: string[];
  decisions: string[];
  actionItems: string[];
  metadata: {
    totalSegments: number;
    totalDuration: number;
    generatedAt: number;
  };
}

export class NotesBuilder {
  buildNotes(
    segments: SpeechSegment[],
    transcriptions: Map<string, ASRResult>,
    actionItems: ActionItem[]
  ): MeetingNotes {
    const discussion: string[] = [];
    const decisions: string[] = [];
    const actionItemTexts: string[] = [];

    // Process segments chronologically
    const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);

    for (const segment of sortedSegments) {
      const transcription = transcriptions.get(segment.id);
      if (!transcription) continue;

      const text = transcription.transcript;

      // Categorize based on content heuristics
      if (this.isDecision(text)) {
        decisions.push(text);
      } else {
        discussion.push(text);
      }
    }

    // Format action items
    for (const action of actionItems) {
      const ownerPrefix = action.owner ? `[${action.owner}] ` : "";
      actionItemTexts.push(`${ownerPrefix}${action.text}`);
    }

    // Calculate total duration
    const totalDuration = sortedSegments.reduce((sum, seg) => sum + seg.durationMs, 0);

    return {
      discussion,
      decisions,
      actionItems: actionItemTexts,
      metadata: {
        totalSegments: segments.length,
        totalDuration,
        generatedAt: Date.now()
      }
    };
  }

  formatAsMarkdown(notes: MeetingNotes): string {
    let markdown = "# Meeting Notes\n\n";

    const date = new Date(notes.metadata.generatedAt);
    markdown += `**Date:** ${date.toLocaleString()}\n`;
    markdown += `**Duration:** ${(notes.metadata.totalDuration / 1000 / 60).toFixed(1)} minutes\n`;
    markdown += `**Segments:** ${notes.metadata.totalSegments}\n\n`;

    markdown += "## Discussion\n\n";
    if (notes.discussion.length > 0) {
      notes.discussion.forEach(item => {
        markdown += `- ${item}\n`;
      });
    } else {
      markdown += "*No discussion items captured*\n";
    }
    markdown += "\n";

    if (notes.decisions.length > 0) {
      markdown += "## Decisions\n\n";
      notes.decisions.forEach(item => {
        markdown += `- ${item}\n`;
      });
      markdown += "\n";
    }

    if (notes.actionItems.length > 0) {
      markdown += "## Action Items\n\n";
      notes.actionItems.forEach(item => {
        markdown += `- [ ] ${item}\n`;
      });
      markdown += "\n";
    }

    return markdown;
  }

  private isDecision(text: string): boolean {
    const decisionPatterns = [
      /\b(decided|agreed|concluded|determined)\b/i,
      /\b(we will|we'll|let's go with)\b/i,
      /\b(final|approved|confirmed)\b/i
    ];

    return decisionPatterns.some(pattern => pattern.test(text));
  }
}