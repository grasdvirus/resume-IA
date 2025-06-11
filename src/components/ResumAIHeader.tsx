
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import React, { useState } from 'react'; // Ajout de useState

export function ResumAIHeader() {
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const handleSendFeedback = () => {
    const subject = encodeURIComponent("Avis sur Résumé IA");
    let body = encodeURIComponent(contactMessage);
    if (contactEmail) {
      body += encodeURIComponent(`\n\nDe : ${contactEmail}`);
    }
    window.location.href = `mailto:publixstore.exe@gmail.com?subject=${subject}&body=${body}`;
  };

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
                <button className="text-foreground hover:text-primary transition-colors font-medium">Contact & Avis</button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="font-headline text-2xl">Laissez-nous votre avis</DialogTitle>
                  <DialogDescription>
                    Votre expérience nous intéresse ! Partagez vos suggestions ou questions.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="contact-email" className="text-right">
                      Email (Facultatif)
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="col-span-3"
                      placeholder="votre.email@example.com"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="contact-message" className="text-right pt-1">
                      Votre Avis
                    </Label>
                    <Textarea
                      id="contact-message"
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="col-span-3 min-h-[100px]"
                      placeholder="Écrivez votre message ici..."
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Annuler
                    </Button>
                  </DialogClose>
                  <Button type="button" onClick={handleSendFeedback} disabled={!contactMessage.trim()}>
                    Envoyer l'avis
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </li>
        </ul>
      </nav>
    </header>
  );
}
