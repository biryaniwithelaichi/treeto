import { SpeechSegment } from "../segmentBuilder";

export interface ASRTranscriptChunk {
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
}

export interface ASRResult {
  segmentId: string;
  transcript: string;
  chunks?: ASRTranscriptChunk[];
  language?: string;
  confidence?: number;
}

export interface PartialTranscript {
  segmentId: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
  confidence?: number;
}

export interface ASRProvider {
  name: string;
  transcribeSegment(segment: SpeechSegment): Promise<ASRResult>;
}

export interface StreamingASRProvider extends ASRProvider {
  supportsStreaming: true;
  transcribeSegmentStreaming(
    segment: SpeechSegment,
    onPartial: (partial: PartialTranscript) => void
  ): Promise<ASRResult>;
}