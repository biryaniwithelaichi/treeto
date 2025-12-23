import { StreamingASRProvider, ASRResult, PartialTranscript, ASRTranscriptChunk } from "../types";
import { SpeechSegment } from "../../segmentBuilder";

interface DeepgramStreamResponse {
  type: string;
  channel_index?: number[];
  duration?: number;
  start?: number;
  is_final?: boolean;
  speech_final?: boolean;
  channel?: {
    alternatives?: Array<{
      transcript: string;
      confidence: number;
      words?: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
      }>;
    }>;
  };
}

export class DeepgramStreamingProvider implements StreamingASRProvider {
  name = "Deepgram-Streaming";
  supportsStreaming = true as const;
  private apiKey: string;
  private baseUrl = "wss://api.deepgram.com/v1/listen";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Fallback batch method (required by interface)
  async transcribeSegment(segment: SpeechSegment): Promise<ASRResult> {
    console.log(`[deepgram-stream] Using streaming for segment ${segment.id}`);
    let finalResult: ASRResult | null = null;
    
    await this.transcribeSegmentStreaming(segment, () => {
      // Ignore partials in batch mode
    });
    
    if (finalResult) {
      return finalResult;
    }
    
    throw new Error("Streaming transcription failed to produce final result");
  }

  async transcribeSegmentStreaming(
    segment: SpeechSegment,
    onPartial: (partial: PartialTranscript) => void
  ): Promise<ASRResult> {
    const startTime = Date.now();
    console.log(`[deepgram-stream] Starting streaming transcription for segment ${segment.id}`);

    return new Promise((resolve, reject) => {
      const wsUrl = `${this.baseUrl}?model=nova-2&language=en&punctuate=true&smart_format=true&interim_results=true&encoding=linear16&sample_rate=16000`;
      const ws = new WebSocket(wsUrl, ["token", this.apiKey]);

      let finalTranscript = "";
      let finalConfidence = 0;
      const chunks: ASRTranscriptChunk[] = [];

      ws.onopen = () => {
        console.log(`[deepgram-stream] WebSocket connected for segment ${segment.id}`);

        // Send all PCM data
        for (const chunk of segment.chunks) {
          const int16Data = this.convertToInt16(chunk.samples);
          ws.send(int16Data);
        }

        // Signal end of audio
        ws.send(JSON.stringify({ type: "CloseStream" }));
      };

      ws.onmessage = (event) => {
        try {
          const response: DeepgramStreamResponse = JSON.parse(event.data);

          if (response.type === "Results") {
            const alternative = response.channel?.alternatives?.[0];
            if (!alternative) return;

            const transcript = alternative.transcript;
            const confidence = alternative.confidence;
            const isFinal = response.is_final || response.speech_final || false;

            if (transcript && transcript.length > 0) {
              // Emit partial transcript
              onPartial({
                segmentId: segment.id,
                text: transcript,
                isFinal,
                timestamp: Date.now(),
                confidence
              });

              if (isFinal) {
                finalTranscript = transcript;
                finalConfidence = confidence;

                // Store word-level chunks if available
                if (alternative.words) {
                  alternative.words.forEach(word => {
                    chunks.push({
                      text: word.word,
                      startTime: segment.startTime + (word.start * 1000),
                      endTime: segment.startTime + (word.end * 1000),
                      confidence: word.confidence
                    });
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error(`[deepgram-stream] Error parsing message:`, error);
        }
      };

      ws.onerror = (error) => {
        console.error(`[deepgram-stream] WebSocket error for segment ${segment.id}:`, error);
        reject(new Error("WebSocket connection error"));
      };

      ws.onclose = () => {
        const latency = Date.now() - startTime;
        console.log(`[deepgram-stream] Completed segment ${segment.id} in ${latency}ms`);

        if (finalTranscript) {
          resolve({
            segmentId: segment.id,
            transcript: finalTranscript,
            chunks: chunks.length > 0 ? chunks : undefined,
            confidence: finalConfidence,
            language: "en"
          });
        } else {
          reject(new Error("No final transcript received"));
        }
      };
    });
  }

  private convertToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    return int16Array;
  }
}