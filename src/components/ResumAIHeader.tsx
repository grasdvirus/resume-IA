"use client";

import Link from 'next/link';
import { Brain, LogOut, UserCircle, LogIn, Menu } from 'lucide-react'; 
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"; 
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function ResumAIHeader() {
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const { user, signOut, loading } = useAuth();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSendFeedback = () => {
    if (!contactMessage.trim()) {
      toast({title: "Message vide", description: "Veuillez écrire votre avis avant d'envoyer.", variant: "destructive"});
      return;
    }
    const subject = encodeURIComponent("Avis sur Résumé IA");
    let body = encodeURIComponent(contactMessage);
    if (contactEmail) {
      body += encodeURIComponent(`\n\nDe : ${contactEmail}`);
    }
    window.location.href = `mailto:publixstore.exe@gmail.com?subject=${subject}&body=${body}`;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: "Déconnexion réussie", description: "Vous avez été déconnecté." });
      setIsMobileMenuOpen(false);
    } catch (error) {
      toast({ title: "Erreur de déconnexion", description: "Une erreur est survenue.", variant: "destructive" });
    }
  };

  const commonNavLinks = (isMobile = false) => (
    <>
      <li>
        <a href="/#accueil" className={`block py-2 px-3 text-foreground hover:text-primary transition-colors font-medium hover:bg-primary/10 rounded-md ${isMobile ? 'border-b border-border' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Accueil</a>
      </li>
      <li>
        <a href="/#fonctionnalites" className={`block py-2 px-3 text-foreground hover:text-primary transition-colors font-medium hover:bg-primary/10 rounded-md ${isMobile ? 'border-b border-border' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Fonctionnalités</a>
      </li>
      <li>
        <Dialog>
          <DialogTrigger asChild>
            <button className={`block w-full text-left py-2 px-3 text-foreground hover:text-primary transition-colors font-medium hover:bg-primary/10 rounded-md ${isMobile ? 'border-b border-border' : ''}`}>Tarifs</button>
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
            <button className={`block w-full text-left py-2 px-3 text-foreground hover:text-primary transition-colors font-medium hover:bg-primary/10 rounded-md ${isMobile ? '' : ''}`}>Contact & Avis</button>
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
    </>
  );

  const authLinks = (isMobile = false) => (
    <>
      {!loading && user ? (
        <>
          <li className={`flex items-center gap-2 text-sm text-muted-foreground ${isMobile ? 'py-2 px-3 border-b border-border' : ''}`}>
            <UserCircle className="h-5 w-5"/>
            <span className={isMobile ? '' : 'hidden lg:inline'}>{user.email}</span>
          </li>
          <li>
            <Button variant="ghost" size={isMobile ? "default" : "sm"} onClick={handleSignOut} className={`w-full text-foreground hover:text-primary hover:bg-primary/10 ${isMobile ? 'justify-start py-2 px-3' : ''}`}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </li>
        </>
      ) : !loading && !user ? (
        <>
          <li className={isMobile ? 'border-b border-border' : ''}>
            <Link href="/signin" className={`block py-2 px-3 text-foreground hover:text-primary transition-colors font-medium flex items-center hover:bg-primary/10 rounded-md ${isMobile ? '' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
              <LogIn className="mr-2 h-4 w-4" /> Se connecter
            </Link>
          </li>
          <li>
            <Link href="/signup" className={isMobile ? 'block py-2 px-3' : ''} onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="default" size={isMobile ? "default" : "sm"} className={`bg-primary text-primary-foreground hover:bg-primary/90 ${isMobile ? 'w-full' : ''}`}>
                 S'inscrire
              </Button>
            </Link>
          </li>
        </>
      ) : null}
    </>
  );


  return (
    <header className="bg-card/95 backdrop-blur-md sticky top-0 z-50 shadow-md">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <Brain className="h-8 w-8" />
          <span className="text-2xl font-bold font-headline">Résumé IA</span>
        </Link>

        <ul className="hidden md:flex items-center gap-x-2 lg:gap-x-3">
          {commonNavLinks()}
          {authLinks()}
        </ul>
        
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
              <SheetHeader className="p-4 border-b">
                 <SheetTitle className="flex items-center gap-2 text-primary">
                    <Brain className="h-7 w-7" />
                    <span className="text-xl font-bold font-headline">Résumé IA</span>
                 </SheetTitle>
              </SheetHeader>
              <ul className="flex flex-col py-4 px-2 space-y-1">
                {commonNavLinks(true)}
                 <hr className="my-2 mx-1 border-border" />
                {authLinks(true)}
              </ul>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
