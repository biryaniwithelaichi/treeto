import { ASRProvider, ASRResult, ASRTranscriptChunk } from "../types";
import { SpeechSegment } from "../../segmentBuilder";

interface DeepgramResponse {
  results?: {
    channels?: Array<{
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
    }>;
  };
}

export class DeepgramASRProvider implements ASRProvider {
  name = "Deepgram";
  private apiKey: string;
  private baseUrl = "https://api.deepgram.com/v1/listen";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribeSegment(segment: SpeechSegment): Promise<ASRResult> {
    const startTime = Date.now();
    console.log(`[deepgram] Starting transcription for segment ${segment.id} (${(segment.durationMs / 1000).toFixed(1)}s)`);

    try {
      // Convert PCM chunks to WAV
      const wavBlob = this.convertToWav(segment);

      // Call Deepgram API
      const response = await fetch(`${this.baseUrl}?model=nova-2&language=en&punctuate=true&smart_format=true`, {
        method: "POST",
        headers: {
          "Authorization": `Token ${this.apiKey}`,
          "Content-Type": "audio/wav"
        },
        body: wavBlob
      });

      if (!response.ok) {
        throw new Error(`Deepgram API error: ${response.status} ${response.statusText}`);
      }

      const data: DeepgramResponse = await response.json();
      const latency = Date.now() - startTime;
      
      console.log(`[deepgram] Completed segment ${segment.id} in ${latency}ms`);

      return this.normalizeResponse(data, segment);
    } catch (error) {
      console.error(`[deepgram] Error transcribing segment ${segment.id}:`, error);
      throw error;
    }
  }

  private convertToWav(segment: SpeechSegment): Blob {
    // Concatenate all PCM chunks
    const totalSamples = segment.chunks.reduce((sum, chunk) => sum + chunk.samples.length, 0);
    const allSamples = new Float32Array(totalSamples);
    let offset = 0;
    
    for (const chunk of segment.chunks) {
      allSamples.set(chunk.samples, offset);
      offset += chunk.samples.length;
    }

    // Convert Float32 to Int16
    const int16Samples = new Int16Array(allSamples.length);
    for (let i = 0; i < allSamples.length; i++) {
      const sample = Math.max(-1, Math.min(1, allSamples[i]));
      int16Samples[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }

    // Create WAV header
    const sampleRate = 16000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = int16Samples.length * 2;
    const headerSize = 44;

    const buffer = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    this.writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, "WAVE");

    // fmt chunk
    this.writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    this.writeString(view, 36, "data");
    view.setUint32(40, dataSize, true);

    // Write audio data
    const audioData = new Int16Array(buffer, headerSize);
    audioData.set(int16Samples);

    return new Blob([buffer], { type: "audio/wav" });
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  private normalizeResponse(data: DeepgramResponse, segment: SpeechSegment): ASRResult {
    const channel = data.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    if (!alternative) {
      throw new Error("No transcription results from Deepgram");
    }

    const transcript = alternative.transcript;
    const confidence = alternative.confidence;

    // Map words to chunks if available
    const chunks: ASRTranscriptChunk[] | undefined = alternative.words?.map(word => ({
      text: word.word,
      startTime: segment.startTime + (word.start * 1000),
      endTime: segment.startTime + (word.end * 1000),
      confidence: word.confidence
    }));

    return {
      segmentId: segment.id,
      transcript,
      chunks,
      confidence,
      language: "en"
    };
  }
}