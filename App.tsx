import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/PortfolioPage';
import VocabularyPage from './pages/VocabularyPage';
import { SessionLog, Feedback, SavedVocabItem } from './types';

type Page = 'home' | 'history' | 'vocabulary';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('home');
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [savedVocabulary, setSavedVocabulary] = useState<SavedVocabItem[]>([]);

  useEffect(() => {
    try {
      const storedLogs = localStorage.getItem('sessionLogs');
      if (storedLogs) {
        const parsedLogs = JSON.parse(storedLogs) as any[]; // Parse as any to handle old format
        const migratedLogs: SessionLog[] = parsedLogs.map(log => {
          // Add a default level to old session logs that don't have one
          if (log.prompt && !log.prompt.level) {
            return {
              ...log,
              prompt: { ...log.prompt, level: 'Intermediate' }
            };
          }
          return log;
        });
        setSessionLogs(migratedLogs);
      }
      const storedVocab = localStorage.getItem('savedVocabulary');
      if (storedVocab) {
        setSavedVocabulary(JSON.parse(storedVocab));
      }
    } catch (error) {
      console.error("Failed to load data from local storage:", error);
    }
  }, []);

  const saveSessionLog = useCallback((log: SessionLog) => {
    setSessionLogs(prevLogs => {
      const newLogs = [...prevLogs, log];
      try {
        localStorage.setItem('sessionLogs', JSON.stringify(newLogs));
      } catch (error) {
        console.error("Failed to save session logs to local storage:", error);
      }
      return newLogs;
    });
  }, []);

  const updateSessionLog = useCallback((sessionId: string, messageIndex: number, feedback: Feedback) => {
    setSessionLogs(prevLogs => {
      const newLogs = prevLogs.map(log => {
        if (log.id === sessionId) {
          const newTranscript = [...log.transcript];
          if (newTranscript[messageIndex] && newTranscript[messageIndex].speaker === 'user') {
            newTranscript[messageIndex] = { ...newTranscript[messageIndex], feedback };
            return { ...log, transcript: newTranscript };
          }
        }
        return log;
      });

      try {
        localStorage.setItem('sessionLogs', JSON.stringify(newLogs));
      } catch (error) {
        console.error("Failed to update session logs in local storage:", error);
      }
      return newLogs;
    });
  }, []);

  const addVocabItems = useCallback((items: SavedVocabItem[]) => {
    setSavedVocabulary(prevVocab => {
      const newItems = items.filter(item => !prevVocab.some(v => v.id === item.id));
      if (newItems.length === 0) return prevVocab;

      const newVocab = [...prevVocab, ...newItems];
      try {
        localStorage.setItem('savedVocabulary', JSON.stringify(newVocab));
      } catch (error) {
        console.error("Failed to save vocabulary to local storage:", error);
      }
      return newVocab;
    });
  }, []);

  const markVocabAsGenerated = useCallback((sessionId: string) => {
    setSessionLogs(prevLogs => {
      const newLogs = prevLogs.map(log => {
        if (log.id === sessionId) {
          return { ...log, vocabularyGenerated: true };
        }
        return log;
      });
      try {
        localStorage.setItem('sessionLogs', JSON.stringify(newLogs));
      } catch (error) {
        console.error("Failed to update session logs in local storage:", error);
      }
      return newLogs;
    });
  }, []);


  const removeVocabItem = useCallback((itemId: string) => {
    setSavedVocabulary(prevVocab => {
      const newVocab = prevVocab.filter(v => v.id !== itemId);
      try {
        localStorage.setItem('savedVocabulary', JSON.stringify(newVocab));
      } catch (error) {
        console.error("Failed to save vocabulary to local storage:", error);
      }
      return newVocab;
    });
  }, []);

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <HomePage saveSessionLog={saveSessionLog} />;
      case 'history':
        return (
            <HistoryPage
                sessionLogs={sessionLogs}
                updateSessionLog={updateSessionLog}
                addVocabItems={addVocabItems}
                markVocabAsGenerated={markVocabAsGenerated}
            />
        );
      case 'vocabulary':
        return (
            <VocabularyPage
                savedVocabulary={savedVocabulary}
                removeVocabItem={removeVocabItem}
            />
        );
      default:
        return <HomePage saveSessionLog={saveSessionLog} />;
    }
  };

  return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Header currentPage={page} setPage={setPage} />
        <main className="container mx-auto p-4 md:p-8">
          {renderPage()}
        </main>
      </div>
  );
};

export default App;