
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { updateProfile, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2, User, Edit3, KeyRound, MailCheck, FolderArchive, Settings } from 'lucide-react';

export function UserProfile() {
  const { user, loading } = useAuth();
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

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!user) {
    // This case should ideally be handled by the page redirect logic
    return <p className="text-center">Veuillez vous connecter pour voir votre profil.</p>;
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
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
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-700 mb-2">Votre adresse e-mail n'est pas vérifiée.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerificationEmail}
                  disabled={isSendingVerification}
                  className="text-yellow-800 border-yellow-400 hover:bg-yellow-100"
                >
                  {isSendingVerification ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailCheck className="mr-2 h-4 w-4" />}
                  Renvoyer l'e-mail de vérification
                </Button>
              </div>
            )}
             {user.emailVerified && (
                <div className="mt-2 text-sm text-green-600 flex items-center">
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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center"><FolderArchive className="mr-3 h-7 w-7 text-primary" />Mes Fichiers / Résumés</CardTitle>
          <CardDescription>Accédez à vos résumés sauvegardés (Fonctionnalité à venir).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 bg-muted/30 rounded-md text-center">
            <FolderArchive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Cette section affichera bientôt l'historique de vos résumés et vous permettra de les gérer.</p>
          </div>
        </CardContent>
      </Card>

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center"><Settings className="mr-3 h-7 w-7 text-primary" />Préférences</CardTitle>
          <CardDescription>Personnalisez votre expérience (Fonctionnalité à venir).</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="p-6 bg-muted/30 rounded-md text-center">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Par exemple : langue par défaut pour les résumés, thème sombre/clair, etc.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
