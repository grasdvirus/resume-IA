// src/components/ResumAIHeader.tsx
"use client";

import Link from 'next/link';
import { Brain } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ResumAIHeader() {
  return (
    <header className="bg-card/95 backdrop-blur-md sticky top-0 z-50 shadow-md">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <Brain className="h-8 w-8" />
          <span className="text-2xl font-bold font-headline">Résumé IA</span>
        </Link>
        <ul className="hidden md:flex items-center gap-8">
          <li>
            <a href="#accueil" className="text-foreground hover:text-primary transition-colors font-medium">Accueil</a>
          </li>
          <li>
            <a href="#fonctionnalites" className="text-foreground hover:text-primary transition-colors font-medium">Fonctionnalités</a>
          </li>
          <li>
            <Dialog>
              <DialogTrigger asChild>
                <button className="text-foreground hover:text-primary transition-colors font-medium">Tarifs</button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="font-headline text-2xl">Nos Offres d'Abonnement</DialogTitle>
                  <DialogDescription>
                    Nos plans tarifaires adaptés à tous vos besoins seront disponibles très prochainement. Restez à l'écoute !
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-center text-muted-foreground">
                    En attendant, profitez de toutes les fonctionnalités gratuitement.
                  </p>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Fermer
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </li>
          <li>
            <Dialog>
              <DialogTrigger asChild>
                <button className="text-foreground hover:text-primary transition-colors font-medium">Contact</button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="font-headline text-2xl">Contactez-nous & Avis</DialogTitle>
                  <DialogDescription>
                    Votre avis est précieux ! Pour toute question, suggestion ou pour partager votre expérience :
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-center">
                    Envoyez-nous un e-mail à : <a href="mailto:contact@resumai.app" className="text-primary hover:underline">contact@resumai.app</a>
                  </p>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Fermer
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </li>
        </ul>
      </nav>
    </header>
  );
}
