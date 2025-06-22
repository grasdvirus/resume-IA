
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { updateProfile, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2, User, Edit3, KeyRound, MailCheck } from 'lucide-react';

export function AccountSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [user]);

  if (!user) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center"><User className="mr-3 h-7 w-7 text-primary" />Informations du Compte</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-3 text-muted-foreground">Chargement des informations...</p>
                </div>
            </CardContent>
        </Card>
    );
  }

  const handleUpdateDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdatingName(true);
    try {
      await updateProfile(user, { displayName });
      toast({ title: "Succès", description: "Votre nom d'affichage a été mis à jour." });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Impossible de mettre à jour le nom.", variant: "destructive" });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user || !user.email) return;
    setIsSendingPasswordReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({ title: "Email envoyé", description: "Un email de réinitialisation de mot de passe a été envoyé à votre adresse." });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Impossible d'envoyer l'email.", variant: "destructive" });
    } finally {
      setIsSendingPasswordReset(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!user || user.emailVerified) return;
    setIsSendingVerification(true);
    try {
      await sendEmailVerification(user);
      toast({ title: "Email de vérification envoyé", description: "Veuillez vérifier votre boîte de réception." });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Impossible d'envoyer l'email de vérification.", variant: "destructive" });
    } finally {
      setIsSendingVerification(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center"><User className="mr-3 h-7 w-7 text-primary" />Informations du Compte</CardTitle>
        <CardDescription>Gérez les informations de votre compte Résumé IA.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={user.email || ''} readOnly disabled className="mt-1 bg-muted/50" />
          {!user.emailVerified && (
            <div className="mt-2 p-3 bg-yellow-100 border border-yellow-300 rounded-md dark:bg-yellow-900/30 dark:border-yellow-700">
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">Votre adresse e-mail n'est pas vérifiée.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendVerificationEmail}
                disabled={isSendingVerification}
                className="text-yellow-800 border-yellow-400 hover:bg-yellow-200 dark:text-yellow-200 dark:border-yellow-600 dark:hover:bg-yellow-800/50"
              >
                {isSendingVerification ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailCheck className="mr-2 h-4 w-4" />}
                Renvoyer l'e-mail de vérification
              </Button>
            </div>
          )}
           {user.emailVerified && (
              <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center">
                  <MailCheck className="mr-2 h-5 w-5" /> Adresse e-mail vérifiée.
              </div>
          )}
        </div>

        <form onSubmit={handleUpdateDisplayName} className="space-y-2">
          <Label htmlFor="displayName">Nom d'affichage</Label>
          <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Votre nom ou pseudo"
              className="mt-1 flex-grow"
              disabled={isUpdatingName}
            />
            <Button type="submit" disabled={isUpdatingName || (user.displayName === displayName && displayName !== '')} className="w-full sm:w-auto">
              {isUpdatingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit3 className="mr-2 h-4 w-4" />}
              Mettre à jour
            </Button>
          </div>
        </form>

        <div>
          <Label>Mot de passe</Label>
          <Button
            variant="outline"
            onClick={handleSendPasswordReset}
            className="w-full mt-1"
            disabled={isSendingPasswordReset}
          >
            {isSendingPasswordReset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            Modifier le mot de passe (via e-mail)
          </Button>
          <p className="text-xs text-muted-foreground mt-1">Un lien vous sera envoyé par e-mail pour réinitialiser votre mot de passe.</p>
        </div>
      </CardContent>
    </Card>
  );
}
