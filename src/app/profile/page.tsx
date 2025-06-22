
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ResumAIHeader } from '@/components/ResumAIHeader';
import { UserProfile } from '@/components/UserProfile';
import { Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <ResumAIHeader />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </main>
        <footer className="py-8 text-center text-muted-foreground bg-card border-t">
          <p>&copy; {new Date().getFullYear()} Résumé IA. Tous droits réservés.</p>
        </footer>
      </div>
    );
  }

  // If not loading and no user, the useEffect above will redirect.
  // If there is a user, render the profile.
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ResumAIHeader />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {user ? <UserProfile /> : <div className="flex justify-center items-center h-64"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div> /* Fallback if redirect hasn't happened yet */}
      </main>
      <footer className="py-8 text-center text-muted-foreground bg-card border-t">
        <p>&copy; {new Date().getFullYear()} Résumé IA. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
