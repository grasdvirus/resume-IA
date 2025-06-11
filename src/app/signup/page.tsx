
import { SignUpForm } from '@/components/SignUpForm';
import { ResumAIHeader } from '@/components/ResumAIHeader';
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ResumAIHeader />
      <main className="flex-grow flex items-center justify-center p-4">
        <SignUpForm />
      </main>
      <footer className="py-8 text-center text-muted-foreground bg-card border-t">
        <p>&copy; {new Date().getFullYear()} Résumé IA. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
