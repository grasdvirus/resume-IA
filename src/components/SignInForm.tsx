
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import { User, Lock, Eye, EyeOff, Mail } from 'lucide-react';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Connexion réussie!",
        description: "Vous allez être redirigé vers la page d'accueil.",
      });
      router.push('/');
    } catch (err: any) {
      let friendlyErrorMessage = "Email ou mot de passe incorrect. Veuillez réessayer.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        friendlyErrorMessage = "L'adresse e-mail ou le mot de passe que vous avez entré n'est pas valide.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyErrorMessage = "Le format de l'adresse e-mail n'est pas valide.";
      } else {
        console.error("Firebase SignIn Error:", err);
      }
      setError(friendlyErrorMessage);
      toast({
        title: "Erreur de connexion",
        description: friendlyErrorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] p-4">
      <div className="relative flex flex-col md:flex-row w-full max-w-4xl bg-card shadow-2xl rounded-xl overflow-hidden">
        <div className="hidden md:block md:w-1/2">
          <Image
            src="https://i.postimg.cc/MGfsBfGv/login-bg.png"
            alt="Login background"
            width={800}
            height={1200}
            className="object-cover w-full h-full"
            priority
            data-ai-hint="abstract geometric pattern"
          />
        </div>

        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h1 className="text-3xl font-bold text-center text-primary font-headline mb-8">
              Connexion
            </h1>

            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-sm font-medium text-muted-foreground">Email</Label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  id="login-email"
                  required
                  className="pl-10 pr-4 py-3 text-base"
                  placeholder="exemple@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-pass" className="text-sm font-medium text-muted-foreground">Mot de passe</Label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  id="login-pass"
                  required
                  className="pl-10 pr-10 py-3 text-base"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary focus:outline-none"
                  aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Checkbox id="login-check" className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                <Label htmlFor="login-check" className="font-normal text-muted-foreground">Se souvenir de moi</Label>
              </div>
              <Link href="#" className="font-medium text-primary hover:underline">
                Mot de passe oublié?
              </Link>
            </div>

            <Button type="submit" className="w-full text-base py-3 font-semibold" disabled={isLoading}>
              {isLoading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Vous n'avez pas de compte?{' '}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                S'inscrire
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
