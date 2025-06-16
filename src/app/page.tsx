import { ResumAIHeader } from '@/components/ResumAIHeader';
import { Hero } from '@/components/Hero';
import { SummarizerClientWrapper } from '@/components/SummarizerClientWrapper';
import { Features } from '@/components/Features';
import { AdPanel } from '@/components/AdPanel'; // Importer le nouveau composant

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ResumAIHeader />
      <main className="flex-grow">
        <Hero />
        <SummarizerClientWrapper />
        <AdPanel /> {/* Ajouter le nouveau composant ici */}
        <Features />
      </main>
      <footer className="py-8 text-center text-muted-foreground bg-card border-t">
        <p>&copy; {new Date().getFullYear()} Résumé IA. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
