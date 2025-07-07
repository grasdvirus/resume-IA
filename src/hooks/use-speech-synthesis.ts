
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { TargetLanguage } from '@/app/actions';

// Maps our app's language codes to the BCP 47 language tags required by the Web Speech API.
const langMap: Record<TargetLanguage, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-PT',
  ja: 'ja-JP',
  ko: 'ko-KR',
};

export const useSpeechSynthesis = (textToSpeak: string, lang: TargetLanguage) => {
  const { toast } = useToast();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [isSupported, setIsSupported] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Memoized handlers to avoid re-creating functions on every render
  const handleEnd = useCallback(() => {
    setIsSpeaking(false);
  }, []);

  const handleError = useCallback((event: SpeechSynthesisErrorEvent) => {
    // The 'canceled' error is expected when the user stops the speech manually.
    // We don't want to show an error message in this case.
    if (event.error === 'canceled') {
      setIsSpeaking(false);
      return;
    }
    
    setIsSpeaking(false);
    toast({
      title: "Erreur de lecture vocale",
      description: `Une erreur est survenue: ${event.error}`,
      variant: "destructive",
    });
  }, [toast]);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      const synth = window.speechSynthesis;
      
      // Cleanup on component unmount
      return () => {
        if (utteranceRef.current) {
          utteranceRef.current.removeEventListener('end', handleEnd);
          utteranceRef.current.removeEventListener('error', handleError);
        }
        // Cancel any ongoing speech when the component unmounts
        if (synth.speaking) {
          synth.cancel();
        }
      };
    }
  }, [handleEnd, handleError]);

  const speak = useCallback(() => {
    if (!isSupported || !textToSpeak.trim()) {
       if (!textToSpeak.trim()) toast({ title: "Aucun texte à lire", description: "Le contenu du résumé est vide.", variant: "destructive" });
       return;
    }
    
    // Ensure any previous speech is stopped before starting a new one
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = langMap[lang] || 'fr-FR'; // Fallback to French
    utterance.rate = speechRate;
    
    utterance.addEventListener('end', handleEnd);
    utterance.addEventListener('error', handleError);
    utteranceRef.current = utterance;

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [isSupported, textToSpeak, lang, speechRate, handleEnd, handleError, toast]);

  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);
  
  const toggleSpeech = () => {
      if (isSpeaking) {
          cancel();
      } else {
          speak();
      }
  };
  
  // Effect to apply the new speech rate immediately if changed during playback
  useEffect(() => {
    if (isSpeaking && utteranceRef.current) {
        utteranceRef.current.rate = speechRate;
    }
  }, [speechRate, isSpeaking]);


  // Effect to stop speech if the text to speak changes
  useEffect(() => {
      cancel();
  }, [textToSpeak, cancel]);

  return { isSupported, isSpeaking, speechRate, setSpeechRate, toggleSpeech, cancel };
};
