import React, { useState } from 'react';
import { SessionLog, Feedback, Prompt, SavedVocabItem } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { GoogleGenAI, Type } from '@google/genai';
import SpeakerIcon from '../components/icons/SpeakerIcon';

interface HistoryPageProps {
  sessionLogs: SessionLog[];
  updateSessionLog: (sessionId: string, messageIndex: number, feedback: Feedback) => void;
  addVocabItems: (items: SavedVocabItem[]) => void;
  markVocabAsGenerated: (sessionId: string) => void;
}

const PromptDisplay: React.FC<{ prompt: Prompt }> = ({ prompt }) => {
    switch (prompt.type) {
        case 'image':
            return (
                <div className="space-y-2">
                    <CardTitle>{prompt.content}</CardTitle>
                    <div className="rounded-md overflow-hidden border max-w-sm">
                       <img src={prompt.imageUrl} alt="Practice prompt" className="w-full h-auto object-cover"/>
                    </div>
                </div>
            );
        case 'scenario':
            return <CardTitle>{prompt.title}: {prompt.content}</CardTitle>;
        case 'conversation':
        default:
            return <CardTitle>{prompt.content}</CardTitle>;
    }
};


const HistoryPage: React.FC<HistoryPageProps> = ({ sessionLogs, updateSessionLog, addVocabItems, markVocabAsGenerated }) => {
  const [loadingFeedbackId, setLoadingFeedbackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const generateFeedbackForMessage = async (log: SessionLog, messageIndex: number) => {
    try {
      const userAnswer = log.transcript[messageIndex].text;
      const question = messageIndex === 0
        ? log.prompt.content
        : log.transcript[messageIndex - 1]?.text;

      if (!userAnswer || !question) return;

      const prompt = `You are an expert English language tutor. A student has provided an answer to a question during a speaking practice session.
      The context/question was: "${question}"
      The student's answer was:
      ---
      ${userAnswer}
      ---
      Please provide structured feedback on the student's answer. Analyze their response and provide:
      1. Grammar Feedback: Provide a list of specific grammatical errors and their corrections as bullet points.
      2. Vocabulary Feedback: Provide a list of suggestions for alternative, more advanced, or more appropriate vocabulary as bullet points.
      3. Clarity Feedback: Provide a list of comments on the clarity and flow of their sentences as bullet points.
      4. Pronunciation Feedback: Identify up to 3 key words from the answer that might be challenging for a non-native speaker. For each word, provide concise feedback on common pronunciation pitfalls (e.g., vowel sounds, silent letters, stress).
      5. Improved Version: Rewrite the student's answer to be more natural, fluent, and grammatically correct.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              grammar: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Feedback on grammar as a list of points.' },
              vocabulary: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Feedback on vocabulary as a list of points.' },
              clarity: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Feedback on clarity and flow as a list of points.' },
              pronunciation: {
                type: Type.ARRAY,
                description: "Feedback on the pronunciation of up to 3 key words.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING, description: "The key word being analyzed." },
                    feedback: { type: Type.STRING, description: "Concise feedback on common pronunciation errors for this word." }
                  },
                  required: ['word', 'feedback']
                }
              },
              improvedVersion: { type: Type.STRING, description: "An improved version of the user's answer." },
            },
            required: ['grammar', 'vocabulary', 'clarity', 'pronunciation', 'improvedVersion'],
          },
        },
      });

      const feedbackJson = JSON.parse(response.text);
      updateSessionLog(log.id, messageIndex, feedbackJson);

    } catch (e: any) {
      console.error(`Failed to get feedback for message ${messageIndex}:`, e);
      setError(`Failed to generate feedback. Error: ${e.message || 'Unknown error'}`);
      throw e;
    }
  };

  const generateVocabularyForSession = async (log: SessionLog) => {
    try {
      const transcriptText = log.transcript
        .map(msg => `${msg.speaker === 'user' ? 'Student' : 'AI'}: ${msg.text}`)
        .join('\n');

      const prompt = `You are an expert English language tutor. Analyze the following conversation transcript between a student and an AI. Identify 3-5 of the most important vocabulary words or phrases for the student to learn based on their responses. For each item, provide the word/phrase, a simple definition, and a clear example sentence. Focus on items that will most improve their fluency.
      Here is the transcript:
      ---
      ${transcriptText}
      ---`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING, description: "A key word or phrase the student should learn." },
                definition: { type: Type.STRING, description: "A simple, clear definition of the word/phrase." },
                exampleSentence: { type: Type.STRING, description: "A natural example sentence using the word/phrase in context." }
              },
              required: ['word', 'definition', 'exampleSentence']
            }
          }
        }
      });
      
      const vocabList: {word: string, definition: string, exampleSentence: string}[] = JSON.parse(response.text);
      const newVocabItems: SavedVocabItem[] = vocabList.map(item => ({
        ...item,
        id: `${log.id}-${item.word}`,
        sessionId: log.id,
      }));
      
      addVocabItems(newVocabItems);
      markVocabAsGenerated(log.id);

    } catch (e: any) {
       console.error(`Failed to generate vocabulary for session ${log.id}:`, e);
       setError(`Failed to generate vocabulary. Error: ${e.message || 'Unknown error'}`);
       // Don't rethrow, as feedback might have succeeded
    }
  };


  const handleAnalyzeSession = async (log: SessionLog) => {
    setLoadingFeedbackId(log.id);
    setError(null);
    try {
      // Step 1: Generate turn-by-turn feedback
      const feedbackPromises = log.transcript
        .map((message, index) => ({ message, index }))
        .filter(({ message }) => message.speaker === 'user' && !message.feedback)
        .map(({ index }) => generateFeedbackForMessage(log, index));

      await Promise.all(feedbackPromises);

      // Step 2: Generate vocabulary for the whole session if it hasn't been done
      if (!log.vocabularyGenerated) {
        await generateVocabularyForSession(log);
      }

    } catch (e) {
      console.error("One or more analysis steps failed.");
    } finally {
      setLoadingFeedbackId(null);
    }
  };

  const handlePlayPronunciation = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Your browser does not support the text-to-speech feature.");
    }
  };


  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Practice History</h1>
        <p className="text-muted-foreground">Review your past conversations and get AI feedback for your answers.</p>
      </div>
      {error && <p className="mb-4 text-center text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>}
      {sessionLogs.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">You don't have any saved sessions yet.</p>
          <p className="text-sm text-muted-foreground">Complete a practice session to see it here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sessionLogs.slice().reverse().map(log => (
            <Card key={log.id}>
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <PromptDisplay prompt={log.prompt} />
                        <CardDescription>
                          Practiced on: {new Date(log.timestamp).toLocaleString()}
                        </CardDescription>
                    </div>
                     <Button
                        onClick={() => handleAnalyzeSession(log)}
                        disabled={loadingFeedbackId === log.id || log.vocabularyGenerated}
                        className="flex-shrink-0"
                     >
                         {loadingFeedbackId === log.id ? (
                            <>
                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                             Analyzing...
                            </>
                         ) : log.vocabularyGenerated ? '✓ Analyzed' : 'Analyze Session'}
                     </Button>
                </div>
              </CardHeader>
              <CardContent>
                <h4 className="font-semibold text-lg mb-4">Conversation & Feedback</h4>
                <div className="space-y-6">
                  {log.transcript.map((message, index) => (
                    <div key={index}>
                      <div className={`flex items-start gap-3 ${message.speaker === 'user' ? 'justify-end' : ''}`}>
                        {message.speaker === 'ai' && <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center font-bold text-sm">AI</div>}
                        <div className={`p-3 rounded-lg max-w-md ${ message.speaker === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground' }`}>
                          <p className="text-sm">{message.text}</p>
                        </div>
                        {message.speaker === 'user' && <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center font-bold text-sm">You</div>}
                      </div>

                      {message.speaker === 'user' && message.feedback && (
                        <div className="mt-3 flex justify-end">
                          <div className="w-full max-w-md space-y-3">
                            <div className="p-4 rounded-lg bg-muted/50 border">
                              <h5 className="font-semibold mb-3">Feedback on Your Answer</h5>
                              <div className="space-y-4 text-sm">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                  {/* Column 1 */}
                                  <div className="space-y-4">
                                    <div>
                                      <h6 className="font-medium">Grammar</h6>
                                      <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-1">
                                        {message.feedback.grammar.map((point, i) => <li key={i}>{point}</li>)}
                                      </ul>
                                    </div>
                                    <div>
                                      <h6 className="font-medium">Vocabulary</h6>
                                      <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-1">
                                        {message.feedback.vocabulary.map((point, i) => <li key={i}>{point}</li>)}
                                      </ul>
                                    </div>
                                  </div>
                                  {/* Column 2 */}
                                  <div className="space-y-4">
                                    <div>
                                      <h6 className="font-medium">Clarity</h6>
                                      <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-1">
                                        {message.feedback.clarity.map((point, i) => <li key={i}>{point}</li>)}
                                      </ul>
                                    </div>
                                    {message.feedback.pronunciation && message.feedback.pronunciation.length > 0 && (
                                      <div>
                                        <h6 className="font-medium">Pronunciation</h6>
                                        <ul className="space-y-2 mt-1">
                                          {message.feedback.pronunciation.map((p, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                              <Button size="sm" variant="outline" className="p-2 h-auto flex-shrink-0" onClick={() => handlePlayPronunciation(p.word)} aria-label={`Listen to ${p.word}`}>
                                                <SpeakerIcon className="h-4 w-4" />
                                              </Button>
                                              <div>
                                                <strong className="font-semibold">{p.word}</strong>
                                                <p className="text-muted-foreground text-xs">{p.feedback}</p>
                                              </div>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* Full-width section */}
                                <div className="pt-4 mt-4 border-t">
                                  <h6 className="font-medium">Improved Version</h6>
                                  <p className="text-muted-foreground whitespace-pre-wrap bg-background p-3 rounded-md border mt-1">{message.feedback.improvedVersion}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;