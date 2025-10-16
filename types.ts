export type PracticeType = 'conversation' | 'image' | 'scenario';

export type Level = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Prompt {
  type: PracticeType;
  content: string; // Text for conversation, description for image/scenario
  imageUrl?: string; // For image type
  title?: string; // For scenario type
  aiRole?: string; // For scenario type
  level: Level;
}

export interface PronunciationFeedback {
  word: string;
  feedback: string;
}

export interface Feedback {
  grammar: string[];
  vocabulary: string[];
  clarity: string[];
  pronunciation: PronunciationFeedback[];
  improvedVersion: string;
}

export interface TranscriptMessage {
  speaker: 'user' | 'ai';
  text: string;
  feedback?: Feedback;
}

export interface SessionLog {
  id: string;
  prompt: Prompt;
  transcript: TranscriptMessage[];
  timestamp: string;
  vocabularyGenerated?: boolean;
}

export interface SavedVocabItem {
  id: string; // composite key: `${sessionId}-${word}`
  word: string;
  definition: string;
  exampleSentence: string;
  sessionId: string;
}