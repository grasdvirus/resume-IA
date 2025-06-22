
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Loader2, User, FolderArchive, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountSettings } from "@/components/AccountSettings";
import { SavedSummaries } from "@/components/SavedSummaries";
import { UserPreferences } from "@/components/UserPreferences";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ProfileContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const validTabs = ['account', 'summaries', 'preferences'];
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(validTabs.includes(initialTab || '') ? initialTab : 'account');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && validTabs.includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const currentPath = window.location.pathname;
    const newUrl = `${currentPath}?tab=${value}`;
    window.history.pushState({}, '', newUrl);
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return <p className="text-center">Veuillez vous connecter pour voir votre profil.</p>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold font-headline text-center">Mon Espace Personnel</h2>
      <Tabs value={activeTab || 'account'} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="account" className="text-base">
            <User className="mr-2 h-5 w-5" />Compte
          </TabsTrigger>
          <TabsTrigger value="summaries" className="text-base">
            <FolderArchive className="mr-2 h-5 w-5" />Mes Résumés
          </TabsTrigger>
          <TabsTrigger value="preferences" className="text-base">
            <Settings className="mr-2 h-5 w-5" />Préférences
          </TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="mt-6">
          <AccountSettings />
        </TabsContent>
        <TabsContent value="summaries" className="mt-6">
          <SavedSummaries />
        </TabsContent>
        <TabsContent value="preferences" className="mt-6">
          <UserPreferences />
        </TabsContent>
      </Tabs>
    </div>
  );
}


export function UserProfile() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <ProfileContent />
    </Suspense>
  );
}

