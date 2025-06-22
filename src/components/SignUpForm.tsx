
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Loader2, Mail, Lock, User, Brain } from 'lucide-react';

export function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
     if (!displayName.trim()) {
      setError("Veuillez entrer un nom d'affichage.");
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });

      toast({
        title: "Inscription réussie!",
        description: "Vous allez être redirigé vers la page d'accueil.",
      });
      router.push('/');
    } catch (err: any) {
      let friendlyError = "Erreur lors de l'inscription. Veuillez réessayer.";
      if (err.code === 'auth/email-already-in-use') {
        friendlyError = "Cette adresse e-mail est déjà utilisée. Veuillez vous connecter.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = "Le format de l'adresse e-mail n'est pas valide.";
      }
      setError(friendlyError);
      toast({
        title: "Erreur d'inscription",
        description: friendlyError,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
     <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] p-4">
      <div className="relative flex flex-col md:flex-row w-full max-w-4xl bg-card shadow-2xl rounded-xl overflow-hidden">
        
        <div className="hidden md:flex md:w-1/2 bg-[linear-gradient(135deg,theme(colors.primary.DEFAULT)_0%,#764ba2_100%)] items-center justify-center p-12">
           <div className="text-center text-white">
            <Brain className="h-48 w-48 mx-auto opacity-90" />
            <h2 className="mt-6 text-3xl font-bold font-headline">Rejoignez Résumé IA</h2>
            <p className="mt-2 opacity-80">Créez votre compte pour sauvegarder vos résumés et accéder à toutes les fonctionnalités.</p>
           </div>
        </div>

        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h1 className="text-3xl font-bold text-center text-primary font-headline mb-8">
              Créer un compte
            </h1>
            
            <div className="relative flex items-center">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="displayName"
                type="text"
                placeholder="Nom d'affichage"
                className="pl-10 pr-4 py-3 text-base"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="relative flex items-center">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Email"
                className="pl-10 pr-4 py-3 text-base"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="relative flex items-center">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Mot de passe"
                className="pl-10 pr-4 py-3 text-base"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="relative flex items-center">
               <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirmer le mot de passe"
                className="pl-10 pr-4 py-3 text-base"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            
            <Button type="submit" className="w-full text-base py-3 font-semibold" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'S\'inscrire'}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Vous avez déjà un compte?{' '}
              <Link href="/signin" className="font-medium text-primary hover:underline">
                Se connecter
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
