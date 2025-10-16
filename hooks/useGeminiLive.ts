import { useState, useRef, useCallback } from 'react';
// FIX: The `LiveSession` type is not exported from @google/genai. It has been removed from imports.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { TranscriptMessage } from '../types';
import { encode, decode, decodeAudioData } from '../utils/audio';

export enum SessionState {
  IDLE,
  CONNECTING,
  CONNECTED,
  ERROR,
}

export function useGeminiLive() {
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.IDLE);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Using one AudioContext for both input and output to fix sample-rate mismatch
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const nextStartTimeRef = useRef(0);
  const audioPlaybackSourcesRef = useRef(new Set<AudioBufferSourceNode>());

  const startSession = useCallback(async (systemInstruction: string) => {
    setSessionState(SessionState.CONNECTING);
    setError(null);
    setTranscript([]);
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    nextStartTimeRef.current = 0;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY as string });

      // Create single AudioContext BEFORE requesting getUserMedia to ensure consistent sample rate
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      // Resume AudioContext if suspended (required after user interaction)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction,
        },
        callbacks: {
          onopen: () => {
            setSessionState(SessionState.CONNECTED);
            const ctx = audioContextRef.current;
            if (!ctx || !mediaStreamRef.current) return;

            try {
              // Create a separate AudioContext for the media stream at its native sample rate
              const mediaAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              const source = mediaAudioContext.createMediaStreamSource(mediaStreamRef.current);
              mediaStreamSourceRef.current = source;

              // Create script processor in the media context
              const scriptProcessor = mediaAudioContext.createScriptProcessor(4096, 1, 1);
              scriptProcessorRef.current = scriptProcessor;

              // Resample buffer for conversion between different sample rates
              let resampleBuffer: Float32Array = new Float32Array(0);

              scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);

                // Resample from media stream sample rate to 16000 Hz
                const resampleRatio = 24000 / mediaAudioContext.sampleRate;
                const resampledLength = Math.ceil(inputData.length * resampleRatio);
                const resampled = new Float32Array(resampledLength);

                for (let i = 0; i < resampledLength; i++) {
                  const srcIdx = i / resampleRatio;
                  const srcIdxFloor = Math.floor(srcIdx);
                  const srcIdxCeil = Math.min(srcIdxFloor + 1, inputData.length - 1);
                  const frac = srcIdx - srcIdxFloor;
                  resampled[i] = inputData[srcIdxFloor] * (1 - frac) + inputData[srcIdxCeil] * frac;
                }

                const pcmBlob: Blob = {
                  data: encode(new Uint8Array(new Int16Array(resampled.map(x => x * 32768)).buffer)),
                  mimeType: 'audio/pcm;rate=16000',
                };
                sessionPromiseRef.current?.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };

              source.connect(scriptProcessor);
              scriptProcessor.connect(mediaAudioContext.destination);
            } catch (e: any) {
              setError(`Failed to setup audio: ${e.message}`);
              setSessionState(SessionState.ERROR);
            }
          },

          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.turnComplete) {
              const userInput = currentInputTranscriptionRef.current.trim();
              const aiResponse = currentOutputTranscriptionRef.current.trim();
              setTranscript(prev => {
                const newTranscript = [...prev];
                if (userInput) newTranscript.push({ speaker: 'user', text: userInput });
                if (aiResponse) newTranscript.push({ speaker: 'ai', text: aiResponse });
                return newTranscript;
              });
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
            }

            // Playback audio using the same AudioContext
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            const ctx = audioContextRef.current;
            if (base64Audio && ctx) {
              try {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.addEventListener('ended', () => audioPlaybackSourcesRef.current.delete(source));
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioPlaybackSourcesRef.current.add(source);
              } catch (e: any) {
                console.error('Audio playback error:', e);
              }
            }
          },

          onclose: () => {
            // handled in stopSession
          },

          onerror: (e: ErrorEvent) => {
            setError(`Session error: ${e.message}`);
            setSessionState(SessionState.ERROR);
            stopSession();
          },
        },
      });

      await sessionPromiseRef.current;
    } catch (e: any) {
      setError(`Failed to start session: ${e.message}`);
      setSessionState(SessionState.ERROR);
    }
  }, []);

  const stopSession = useCallback(async () => {
    sessionPromiseRef.current?.then(session => session.close());
    sessionPromiseRef.current = null;

    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;

    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;

    mediaStreamSourceRef.current?.disconnect();
    mediaStreamSourceRef.current = null;

    audioPlaybackSourcesRef.current.forEach(source => source.stop());
    audioPlaybackSourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setSessionState(SessionState.IDLE);
  }, []);

  return { sessionState, startSession, stopSession, transcript, error };
}