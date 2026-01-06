import { SpeechSegment } from "./segmentBuilder";
import { ASRResult } from "./asr/types";
import { ActionItemExtractor, ActionItem } from "./actions/actionItemExtractor";
import { NotesBuilder, MeetingNotes } from "./notes/notesBuilder";

export type MeetingState = "idle" | "active" | "ended";

export interface MeetingResult {
  meeting_id: string;
  segments: SpeechSegment[];
  transcriptions: Map<string, ASRResult>;
  actionItems: ActionItem[];
  notes: MeetingNotes;
  notesMarkdown: string;
}

export class MeetingManager {
  private state: MeetingState = "idle";
  private activeMeetingId: string | null = null;
  private segments: SpeechSegment[] = [];
  private transcriptions: Map<string, ASRResult> = new Map();
  private actionExtractor = new ActionItemExtractor();
  private notesBuilder = new NotesBuilder();

  startMeeting(meeting_id: string): void {
    if (this.state === "active") {
      console.warn("[meeting] Meeting already active");
      return;
    }

    this.state = "active";
    this.activeMeetingId = meeting_id;
    this.segments = [];
    this.transcriptions = new Map();
    // Note: meeting_id is internal only, not logged to user
    console.log("[meeting] Meeting started");
  }

  getActiveMeetingId(): string | null {
    return this.activeMeetingId;
  }

  addSegment(segment: SpeechSegment): void {
    if (this.state === "active") {
      this.segments.push(segment);
    }
  }

  addTranscription(result: ASRResult): void {
    if (this.state === "active") {
      this.transcriptions.set(result.segmentId, result);
    }
  }

  endMeeting(): MeetingResult | null {
    if (this.state !== "active") {
      console.warn("[meeting] No active meeting to end");
      return null;
    }

    if (!this.activeMeetingId) {
      console.error("[meeting] No active meeting_id found");
      return null;
    }

    console.log("[meeting] Ending meeting and generating notes...");

    // Extract action items from all transcriptions
    const transcriptionResults = Array.from(this.transcriptions.values());
    const actionItems = this.actionExtractor.extractFromResults(transcriptionResults);

    console.log(`[meeting] Extracted ${actionItems.length} action items`);

    // Build meeting notes
    const notes = this.notesBuilder.buildNotes(
      this.segments,
      this.transcriptions,
      actionItems
    );

    const notesMarkdown = this.notesBuilder.formatAsMarkdown(notes);

    console.log("[meeting] Meeting ended, notes generated");

    const meeting_id = this.activeMeetingId;
    this.state = "ended";
    this.activeMeetingId = null;

    return {
      meeting_id,
      segments: this.segments,
      transcriptions: this.transcriptions,
      actionItems,
      notes,
      notesMarkdown
    };
  }

  getState(): MeetingState {
    return this.state;
  }

  reset(): void {
    this.state = "idle";
    this.segments = [];
    this.transcriptions = new Map();
    console.log("[meeting] Meeting manager reset");
  }
}