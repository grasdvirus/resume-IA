
import { SignInForm } from '@/components/SignInForm';
import { ResumAIHeader } from '@/components/ResumAIHeader';

export default function SignInPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ResumAIHeader />
      <main className="flex-grow flex items-center justify-center p-4">
        <SignInForm />
      </main>
      <footer className="py-8 text-center text-muted-foreground bg-card border-t">
        <p>&copy; {new Date().getFullYear()} Résumé IA. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
