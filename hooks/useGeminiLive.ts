import { useState, useRef, useCallback } from 'react';
// FIX: The `LiveSession` type is not exported from @google/genai. It has been removed from imports.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { TranscriptMessage } from '../types';
import { encode, decode, decodeAudioData } from '../utils/audio';

// FIX: Export SessionState enum to be used in other components.
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

  // FIX: Using `any` for the session promise because `LiveSession` is not an exported type.
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
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

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // FIX: Cast window to `any` to support `webkitAudioContext` for broader browser compatibility without TypeScript errors.
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      // FIX: Cast window to `any` to support `webkitAudioContext` for broader browser compatibility without TypeScript errors.
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

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
            const inputCtx = inputAudioContextRef.current;
            if (!inputCtx || !mediaStreamRef.current) return;

            const source = inputCtx.createMediaStreamSource(mediaStreamRef.current);
            mediaStreamSourceRef.current = source;

            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle transcriptions
            if (message.serverContent?.inputTranscription) {
                currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
                currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
            }
            if(message.serverContent?.turnComplete) {
                const userInput = currentInputTranscriptionRef.current.trim();
                const aiResponse = currentOutputTranscriptionRef.current.trim();
                setTranscript(prev => {
                    const newTranscript = [...prev];
                    if(userInput) newTranscript.push({ speaker: 'user', text: userInput });
                    if(aiResponse) newTranscript.push({ speaker: 'ai', text: aiResponse });
                    return newTranscript;
                });
                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
            }

            // Handle audio playback
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const outputCtx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => audioPlaybackSourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioPlaybackSourcesRef.current.add(source);
            }
          },
          onclose: () => {
             // Handled in stopSession
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
    sessionPromiseRef.current?.then((session) => session.close());
    sessionPromiseRef.current = null;
    
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current?.disconnect();
    mediaStreamSourceRef.current = null;

    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    
    audioPlaybackSourcesRef.current.forEach(source => source.stop());
    audioPlaybackSourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    setSessionState(SessionState.IDLE);
  }, []);

  return { sessionState, startSession, stopSession, transcript, error };
}