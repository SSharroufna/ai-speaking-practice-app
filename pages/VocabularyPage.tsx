import React from 'react';
import { SavedVocabItem } from '../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import SpeakerIcon from '../components/icons/SpeakerIcon';
import TrashIcon from '../components/icons/TrashIcon';

interface VocabularyPageProps {
  savedVocabulary: SavedVocabItem[];
  removeVocabItem: (itemId: string) => void;
}

const VocabularyPage: React.FC<VocabularyPageProps> = ({ savedVocabulary, removeVocabItem }) => {

  const handlePlayPronunciation = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
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
        <h1 className="text-3xl font-bold tracking-tight">My Vocabulary</h1>
        <p className="text-muted-foreground">AI-curated words and phrases from your practice sessions to help you improve.</p>
      </div>

      {savedVocabulary.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">You haven't generated any vocabulary yet.</p>
          <p className="text-sm text-muted-foreground">Go to the 'History' page and use the 'Analyze Session' button to automatically build your vocabulary list.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {savedVocabulary.slice().reverse().map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{item.word}</CardTitle>
                  <CardDescription className="italic">{item.definition}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeVocabItem(item.id)} aria-label="Remove from vocabulary">
                  <TrashIcon className="h-5 w-5 text-muted-foreground hover:text-destructive" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-md bg-muted/50 border">
                  <div className="flex items-center gap-2 mb-1">
                     <p className="text-sm font-medium">Example sentence:</p>
                     <Button size="sm" variant="outline" className="p-2 h-auto" onClick={() => handlePlayPronunciation(item.exampleSentence)} aria-label={`Listen to example sentence`}>
                      <SpeakerIcon className="h-4 w-4"/>
                    </Button>
                  </div>
                  <p className="font-semibold text-base">"{item.exampleSentence}"</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VocabularyPage;