
"use client";

import Link from 'next/link';
import { Brain, LogOut, UserCircle, LogIn, Menu, User, Settings, FolderArchive, MessageSquare, Loader2 } from 'lucide-react'; 
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
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


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
      setIsMobileMenuOpen(false); // Close mobile menu on sign out
    } catch (error) {
      toast({ title: "Erreur de déconnexion", description: "Une erreur est survenue.", variant: "destructive" });
    }
  };

  const navLinkClasses = (isMobile: boolean) => 
    `block py-2 px-3 text-foreground hover:text-primary transition-colors font-medium hover:bg-primary/10 rounded-md ${isMobile ? 'border-b border-border text-base' : 'text-sm'}`;
  
  const buttonLinkClasses = (isMobile: boolean) =>
    `w-full text-left py-2 px-3 text-foreground hover:text-primary transition-colors font-medium hover:bg-primary/10 rounded-md ${isMobile ? 'border-b border-border text-base' : 'text-sm'}`;


  const commonNavLinks = (isMobile = false) => (
    <>
      <li>
        <Link href="/" className={navLinkClasses(isMobile)} onClick={() => setIsMobileMenuOpen(false)}>Accueil</Link>
      </li>
      <li>
        <Link href="/#fonctionnalites" className={navLinkClasses(isMobile)} onClick={() => setIsMobileMenuOpen(false)}>Fonctionnalités</Link>
      </li>
      <li>
        <Dialog>
          <DialogTrigger asChild>
            <button className={buttonLinkClasses(isMobile)}>Tarifs</button>
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
            <button className={buttonLinkClasses(isMobile).replace(isMobile ? 'border-b border-border' : '', '')}>Contact & Avis</button>
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
        isMobile ? (
          <>
            <li className={`py-2 px-3 border-b border-border text-base`}>
              <Link href="/profile" className="flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
                <User className="mr-2 h-5 w-5"/> Profil
              </Link>
            </li>
             <li className={`py-2 px-3 border-b border-border text-base`}>
              <Link href="/profile#preferences-section" className="flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
                <Settings className="mr-2 h-5 w-5"/> Préférences
              </Link>
            </li>
             <li className={`py-2 px-3 border-b border-border text-base`}>
              <Link href="/profile" className="flex items-center" onClick={() => setIsMobileMenuOpen(false)}> {/* Consider a specific ID like #my-summaries-section if needed */}
                <FolderArchive className="mr-2 h-5 w-5"/> Mes Résumés
              </Link>
            </li>
            <li className={`py-2 px-3 border-b border-border text-sm text-muted-foreground`}>
              Connecté: {user.displayName || user.email}
            </li>
            <li>
              <Button variant="ghost" size="default" onClick={handleSignOut} className={`w-full text-foreground hover:text-primary hover:bg-primary/10 justify-start py-2 px-3 text-base`}>
                <LogOut className="mr-2 h-5 w-5" />
                Déconnexion
              </Button>
            </li>
          </>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="rounded-full p-2 h-auto">
                 <UserCircle className="h-7 w-7 text-primary" />
                 <span className="sr-only">Menu utilisateur</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.displayName || "Utilisateur"}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile#preferences-section" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Préférences
                </Link>
              </DropdownMenuItem>
               <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer"> {/* Consider a specific ID like #my-summaries-section if needed */}
                  <FolderArchive className="mr-2 h-4 w-4" />
                  Mes Résumés
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      ) : !loading && !user ? (
        <>
          <li className={isMobile ? 'border-b border-border' : ''}>
            <Link href="/signin" className={navLinkClasses(isMobile)} onClick={() => setIsMobileMenuOpen(false)}>
              <LogIn className="mr-2 h-4 w-4" /> Se connecter
            </Link>
          </li>
          <li>
            <Link href="/signup" className={isMobile ? `block py-2 px-3 text-base` : ''} onClick={() => setIsMobileMenuOpen(false)}>
              <Button 
                variant="default" 
                size={isMobile ? "lg" : "sm"} 
                className={cn(
                  "bg-gradient-to-r from-primary to-purple-600 text-primary-foreground",
                  "hover:from-primary/90 hover:to-purple-500",
                  "transition-all duration-300 ease-in-out font-medium",
                  isMobile ? 'w-full text-base py-3' : ''
                )}
              >
                 S'inscrire Gratuitement
              </Button>
            </Link>
          </li>
        </>
      ) : (
        <li className="flex items-center justify-center md:w-auto md:px-0">
          <div className="hidden md:block">
             <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
           <div className="md:hidden">
             <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </li>
      )}
    </>
  );


  return (
    <header className="bg-card/95 backdrop-blur-md sticky top-0 z-50 shadow-md">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <Brain className="h-8 w-8" />
          <span className="text-2xl font-bold font-headline">Résumé IA</span>
        </Link>

        <div className="hidden md:flex items-center space-x-1">
            <ul className="flex items-center gap-x-1 lg:gap-x-2">
                {commonNavLinks()}
            </ul>
            <div className="h-6 w-px bg-border mx-2 lg:mx-3"></div> 
            <ul className="flex items-center gap-x-1 lg:gap-x-2">
                 {authLinks()}
            </ul>
        </div>
        
        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0 flex flex-col">
              <SheetHeader className="p-4 border-b">
                 <SheetTitle className="flex items-center gap-2 text-primary">
                    <Brain className="h-7 w-7" />
                    <span className="text-xl font-bold font-headline">Résumé IA</span>
                 </SheetTitle>
              </SheetHeader>
              <div className="flex-grow overflow-y-auto">
                <ul className="flex flex-col py-4 px-2 space-y-1">
                  {commonNavLinks(true)}
                   <hr className="my-2 mx-1 border-border" />
                  {authLinks(true)}
                </ul>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
