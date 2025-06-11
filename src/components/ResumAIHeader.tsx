import Link from 'next/link';
import { Brain } from 'lucide-react';

export function ResumAIHeader() {
  return (
    <header className="bg-card/95 backdrop-blur-md sticky top-0 z-50 shadow-md">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <Brain className="h-8 w-8" />
          <span className="text-2xl font-bold font-headline">Résumé IA</span>
        </Link>
        <ul className="hidden md:flex items-center gap-8">
          <li><a href="#accueil" className="text-foreground hover:text-primary transition-colors font-medium">Accueil</a></li>
          <li><a href="#fonctionnalites" className="text-foreground hover:text-primary transition-colors font-medium">Fonctionnalités</a></li>
          <li><a href="#tarifs" className="text-foreground hover:text-primary transition-colors font-medium">Tarifs</a></li>
          <li><a href="#contact" className="text-foreground hover:text-primary transition-colors font-medium">Contact</a></li>
        </ul>
      </nav>
    </header>
  );
}
