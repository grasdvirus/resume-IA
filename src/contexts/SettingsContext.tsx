
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type AppLanguage = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt' | 'ja' | 'ko';

export interface NotificationPreferences {
  downloadSuccess: boolean;
  shareSuccess: boolean;
}

interface SettingsContextType {
  defaultLanguage: AppLanguage;
  setDefaultLanguage: (language: AppLanguage) => void;
  notificationPreferences: NotificationPreferences;
  setNotificationPreference: <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const VALID_LANGUAGES: AppLanguage[] = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'ko'];

const getInitialDefaultLanguage = (): AppLanguage => {
  if (typeof window !== 'undefined') {
    const storedLang = localStorage.getItem("defaultLanguage");
    if (storedLang && VALID_LANGUAGES.includes(storedLang as AppLanguage)) {
      return storedLang as AppLanguage;
    }
  }
  return 'fr'; // Default language
};

const getInitialNotificationPreferences = (): NotificationPreferences => {
  if (typeof window !== 'undefined') {
    const storedPrefs = localStorage.getItem("notificationPreferences");
    if (storedPrefs) {
      try {
        const parsed = JSON.parse(storedPrefs);
        return {
          downloadSuccess: typeof parsed.downloadSuccess === 'boolean' ? parsed.downloadSuccess : true,
          shareSuccess: typeof parsed.shareSuccess === 'boolean' ? parsed.shareSuccess : true,
        };
      } catch (e) {
        // Fallback if parsing fails
      }
    }
  }
  return { // Default preferences
    downloadSuccess: true,
    shareSuccess: true,
  };
};


export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [defaultLanguage, setDefaultLanguageState] = useState<AppLanguage>(getInitialDefaultLanguage);
  const [notificationPreferences, setNotificationPreferencesState] = useState<NotificationPreferences>(getInitialNotificationPreferences);

  const setDefaultLanguage = useCallback((language: AppLanguage) => {
    setDefaultLanguageState(language);
    if (typeof window !== 'undefined') {
      localStorage.setItem("defaultLanguage", language);
    }
  }, []);

  const setNotificationPreference = useCallback(<K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
    setNotificationPreferencesState(prev => {
      const newPrefs = { ...prev, [key]: value };
      if (typeof window !== 'undefined') {
        localStorage.setItem("notificationPreferences", JSON.stringify(newPrefs));
      }
      return newPrefs;
    });
  }, []);

  useEffect(() => {
    const currentStoredLang = getInitialDefaultLanguage();
    if (defaultLanguage !== currentStoredLang) {
      setDefaultLanguageState(currentStoredLang);
    }
    const currentStoredPrefs = getInitialNotificationPreferences();
     if (JSON.stringify(notificationPreferences) !== JSON.stringify(currentStoredPrefs)) {
        setNotificationPreferencesState(currentStoredPrefs);
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'defaultLanguage' && event.newValue && VALID_LANGUAGES.includes(event.newValue as AppLanguage)) {
        setDefaultLanguageState(event.newValue as AppLanguage);
      }
      if (event.key === 'notificationPreferences' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          setNotificationPreferencesState({
            downloadSuccess: typeof parsed.downloadSuccess === 'boolean' ? parsed.downloadSuccess : true,
            shareSuccess: typeof parsed.shareSuccess === 'boolean' ? parsed.shareSuccess : true,
          });
        } catch (e) {
          console.error("Error parsing notificationPreferences from storage", e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);


  return (
    <SettingsContext.Provider value={{ defaultLanguage, setDefaultLanguage, notificationPreferences, setNotificationPreference }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
