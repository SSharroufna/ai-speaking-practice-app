import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PROMPTS_BY_TOPIC, TOPICS, PRACTICE_TYPES, IMAGE_PROMPTS, SCENARIO_PROMPTS } from '../constants';
import { useGeminiLive, SessionState } from '../hooks/useGeminiLive';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import MicIcon from '../components/icons/MicIcon';
import StopCircleIcon from '../components/icons/StopCircleIcon';
import RefreshIcon from '../components/icons/RefreshIcon';
import { SessionLog, PracticeType, Prompt } from '../types';

interface HomePageProps {
  saveSessionLog: (log: SessionLog) => void;
}

const HomePage: React.FC<HomePageProps> = ({ saveSessionLog }) => {
  const { sessionState, startSession, stopSession, transcript, error } = useGeminiLive();
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>(TOPICS[0]);
  const [practiceType, setPracticeType] = useState<PracticeType>('conversation');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const generateNewPrompt = useCallback((type: PracticeType, topic: string) => {
    setCurrentPrompt(current => {
      let promptList: any[] = [];
      if (type === 'conversation') {
        promptList = PROMPTS_BY_TOPIC[topic] || [];
      } else if (type === 'image') {
        promptList = IMAGE_PROMPTS;
      } else if (type === 'scenario') {
        promptList = SCENARIO_PROMPTS;
      }

      if (promptList.length === 0) return null;
      
      if (promptList.length === 1) {
        const item = promptList[0];
        if (type === 'conversation') return { type, content: item };
        return { type, ...item };
      }

      let newPrompt: Prompt | null = null;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const randomIndex = Math.floor(Math.random() * promptList.length);
        const randomItem = promptList[randomIndex];
        const content = (type === 'conversation') ? randomItem : randomItem.content;
        
        if (content !== current?.content) {
          if (type === 'conversation') {
            newPrompt = { type, content };
          } else {
            newPrompt = { type, ...randomItem };
          }
          break; // Exit the loop
        }
        attempts++;
      }
      
      // Fallback if a new prompt wasn't found (e.g., all prompts are the same, or bad luck)
      if (!newPrompt) {
        const randomItem = promptList[Math.floor(Math.random() * promptList.length)];
        if (type === 'conversation') {
          newPrompt = { type, content: randomItem };
        } else {
          newPrompt = { type, ...randomItem };
        }
      }

      return newPrompt;
    });
  }, []);

  useEffect(() => {
    // Generate initial prompt when component mounts
    generateNewPrompt(practiceType, selectedTopic);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [transcript]);
  
  const handlePracticeTypeChange = (type: PracticeType) => {
    setPracticeType(type);
    generateNewPrompt(type, selectedTopic);
  };

  const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTopic = e.target.value;
    setSelectedTopic(newTopic);
    generateNewPrompt(practiceType, newTopic);
  };

  const handleStartSession = () => {
    if (!currentPrompt) return;
    let systemInstruction = "You are a friendly and patient language practice partner. Keep your responses very short, ideally 1-2 sentences, to keep the conversation flowing. Be encouraging and natural, like in a real, fast-paced chat.";
    if (currentPrompt.type === 'scenario' && currentPrompt.aiRole) {
      systemInstruction = `You are acting as ${currentPrompt.aiRole}. Respond to the user naturally within that role, keeping your responses very short (1-2 sentences). Begin the conversation.`;
    }
    startSession(systemInstruction);
  };
  
  const handleStopSession = useCallback(async () => {
    await stopSession();
    if (currentPrompt && transcript.length > 0) {
      const newLog: SessionLog = {
        id: new Date().toISOString(),
        prompt: currentPrompt,
        transcript,
        timestamp: new Date().toISOString(),
      };
      saveSessionLog(newLog);
    }
  }, [stopSession, currentPrompt, transcript, saveSessionLog]);

  const isSessionActive = sessionState === SessionState.CONNECTING || sessionState === SessionState.CONNECTED;

  const renderPrompt = () => {
    if (!currentPrompt) {
      return <p className="text-muted-foreground">Select a practice type to get started.</p>;
    }
    switch (currentPrompt.type) {
      case 'image':
        return (
          <div className="space-y-4">
            <p className="text-lg">{currentPrompt.content}</p>
            <div className="rounded-lg overflow-hidden border">
              <img src={currentPrompt.imageUrl} alt="Practice prompt" className="w-full h-auto object-cover"/>
            </div>
          </div>
        );
      case 'scenario':
        return (
          <div>
            <p className="text-sm font-semibold text-primary">{currentPrompt.title}</p>
            <p className="text-lg">{currentPrompt.content}</p>
          </div>
        );
      case 'conversation':
      default:
        return <p className="text-lg">{currentPrompt.content}</p>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-muted-foreground">Type:</span>
            {PRACTICE_TYPES.map(pt => (
              <Button 
                key={pt.id} 
                variant={practiceType === pt.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePracticeTypeChange(pt.id)}
                disabled={isSessionActive}
              >
                {pt.name}
              </Button>
            ))}
          </div>
          {practiceType === 'conversation' && (
            <div className="flex items-center gap-2">
              <label htmlFor="topic-select" className="font-medium text-sm text-muted-foreground">Topic:</label>
              <select 
                id="topic-select"
                value={selectedTopic} 
                onChange={handleTopicChange}
                disabled={isSessionActive}
                className="bg-background border border-input rounded-md px-3 py-1.5 text-sm h-9"
              >
                {TOPICS.map(topic => <option key={topic} value={topic}>{topic}</option>)}
              </select>
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => generateNewPrompt(practiceType, selectedTopic)}
            disabled={isSessionActive}
            className="sm:ml-auto"
          >
            <RefreshIcon className="h-4 w-4 mr-2" />
            New Prompt
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Practice Prompt</CardTitle>
          <CardDescription>Use this prompt to start your conversation.</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[100px]">
          {renderPrompt()}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-4">
          <div 
            ref={chatContainerRef}
            className={`w-full h-64 border rounded-md p-4 overflow-y-auto space-y-4 bg-muted/50 ${isSessionActive || transcript.length > 0 ? '' : 'flex items-center justify-center'}`}
          >
            {(isSessionActive || transcript.length > 0) ? (
              transcript.map((msg, index) => (
                <div key={index} className={`flex items-start gap-2 ${msg.speaker === 'user' ? 'justify-end' : ''}`}>
                  {msg.speaker === 'ai' && <div className="w-7 h-7 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center font-bold text-xs">AI</div>}
                  <div className={`p-2 px-3 rounded-lg max-w-sm text-sm ${ msg.speaker === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground' }`}>
                    {msg.text}
                  </div>
                  {msg.speaker === 'user' && <div className="w-7 h-7 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center font-bold text-xs">You</div>}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center">Your conversation will appear here.</p>
            )}
            {sessionState === SessionState.CONNECTING && (
                <div className="text-center text-muted-foreground">Connecting...</div>
            )}
          </div>

          {error && <p className="text-center text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}

          <Button 
            onClick={isSessionActive ? handleStopSession : handleStartSession}
            size="lg"
            className="w-full"
            disabled={!currentPrompt || (isSessionActive && sessionState !== SessionState.CONNECTED)}
          >
            {isSessionActive ? (
              <>
                <StopCircleIcon className="h-5 w-5 mr-2" />
                Stop Practice
              </>
            ) : (
              <>
                <MicIcon className="h-5 w-5 mr-2" />
                Start Practice
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default HomePage;
