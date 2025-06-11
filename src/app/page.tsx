import { ResumAIHeader } from '@/components/ResumAIHeader';
import { Hero } from '@/components/Hero';
import { SummarizerClientWrapper } from '@/components/SummarizerClientWrapper';
import { Features } from '@/components/Features';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ResumAIHeader />
      <main className="flex-grow">
        <Hero />
        <SummarizerClientWrapper />
        <Features />
        {/* Placeholder for Tarifs and Contact sections if needed later */}
        <section id="tarifs" className="py-16 text-center bg-muted">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold font-headline mb-4">Tarifs</h2>
            <p className="text-lg text-muted-foreground">Nos offres seront bientôt disponibles.</p>
          </div>
        </section>
        <section id="contact" className="py-16 text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold font-headline mb-4">Contact</h2>
            <p className="text-lg text-muted-foreground">Contactez-nous à contact@resumai.app</p>
          </div>
        </section>
      </main>
      <footer className="py-8 text-center text-muted-foreground bg-card border-t">
        <p>&copy; {new Date().getFullYear()} Résumé IA. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
