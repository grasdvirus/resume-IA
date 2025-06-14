
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
import { Loader2, User, Edit3, KeyRound, MailCheck, FolderArchive, Settings, FileText, CalendarDays, Bell, Trash2, Sun, Moon, Languages as LanguagesIcon } from 'lucide-react';
import { getUserSummariesAction, type UserSavedSummary, type OutputFormat, type InputType } from '@/app/actions';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTheme } from '@/contexts/ThemeContext';
import { Switch } from '@/components/ui/switch';
import { useSettings, type AppLanguage } from '@/contexts/SettingsContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const OutputFormatLabels: Record<OutputFormat, string> = {
  resume: "Résumé",
  fiche: "Fiche de révision",
  qcm: "QCM",
  audio: "Audio"
};

const InputTypeLabels: Record<InputType, string> = {
  text: "Texte",
  youtube: "Vidéo YouTube",
  pdf: "PDF"
};

export function UserProfile() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  const [summaries, setSummaries] = useState<UserSavedSummary[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const {
    defaultLanguage,
    setDefaultLanguage,
    notificationPreferences,
    setNotificationPreference
  } = useSettings();


  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      fetchSummaries(user.uid);
    } else if (!authLoading) {
      setIsLoadingSummaries(false);
    }
  }, [user, authLoading]);

  const fetchSummaries = async (userId: string) => {
    console.log(`UserProfile: Attempting to fetch summaries for userId: ${userId} from Realtime Database`);
    setIsLoadingSummaries(true);
    try {
      const userSummaries = await getUserSummariesAction(userId);
      console.log(`UserProfile: Fetched ${userSummaries.length} summaries from action:`, userSummaries);
      setSummaries(userSummaries);
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de charger vos résumés sauvegardés: " + error.message, variant: "destructive" });
      console.error("UserProfile: Failed to fetch summaries:", error);
    } finally {
      setIsLoadingSummaries(false);
      console.log("UserProfile: Finished fetching summaries.");
    }
  };


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
  
  const handleDeleteSummary = async (summaryId: string) => {
    toast({ title: "Fonctionnalité à venir", description: `La suppression du résumé ${summaryId} sera bientôt disponible.`});
    console.log("Demande de suppression pour :", summaryId);
  };


  if (authLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return <p className="text-center">Veuillez vous connecter pour voir votre profil.</p>;
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center"><FolderArchive className="mr-3 h-7 w-7 text-primary" />Mes Résumés Sauvegardés</CardTitle>
          <CardDescription>Retrouvez ici tous les résumés que vous avez générés et sauvegardés.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSummaries && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Chargement de vos résumés...</p>
            </div>
          )}
          {!isLoadingSummaries && summaries.length === 0 && (
            <div className="p-6 bg-muted/30 rounded-md text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Vous n'avez pas encore de résumés sauvegardés.</p>
              <p className="text-sm text-muted-foreground mt-1">Commencez par en générer un depuis la page d'accueil !</p>
            </div>
          )}
          {!isLoadingSummaries && summaries.length > 0 && (
            <Accordion type="multiple" className="w-full space-y-3">
              {summaries.map((summary) => (
                <AccordionItem value={summary.id} key={summary.id} className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline group">
                    <div className="flex-1 text-left">
                      <h4 className="font-semibold text-base text-primary group-hover:text-primary/90 truncate" title={summary.title}>
                        {summary.title}
                      </h4>
                      <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-3">
                        <div className="flex items-center">
                          <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                          {new Date(summary.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                         <Badge variant="secondary" className="capitalize">{OutputFormatLabels[summary.outputFormat] || summary.outputFormat}</Badge>
                         <Badge variant="outline" className="capitalize">{InputTypeLabels[summary.inputType] || summary.inputType}</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-0">
                    <div className="prose prose-sm dark:prose-invert max-w-none result-content-area border-t border-border pt-3 mt-2" dangerouslySetInnerHTML={{ __html: summary.content }} />
                    {summary.quizData && summary.outputFormat === 'qcm' && (
                        <div className="mt-4 border-t border-border pt-3">
                            <h5 className="font-semibold mb-2 text-sm">Questions du Quiz :</h5>
                            {summary.quizData.questions.map((q, idx) => (
                                <div key={q.id} className="mb-3 text-xs p-2 border border-border rounded-md bg-muted/50">
                                    <p className="font-medium">Q{idx+1}: {q.questionText}</p>
                                    <ul className="list-disc list-inside pl-2 mt-1">
                                        {q.options.map(opt => (
                                            <li key={opt.id} className={opt.id === q.correctAnswerId ? 'text-green-600 dark:text-green-400 font-semibold' : ''}>
                                                {opt.text} {opt.id === q.correctAnswerId ? '(Correct)' : ''}
                                            </li>
                                        ))}
                                    </ul>
                                    {q.explanation && <p className="mt-1 text-muted-foreground italic">Explication: {q.explanation}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-4 flex justify-end space-x-2">
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm">
                            <Trash2 className="mr-1.5 h-4 w-4" /> Supprimer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce résumé ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible et supprimera définitivement "{summary.title}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteSummary(summary.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                              Oui, supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center"><Settings className="mr-3 h-7 w-7 text-primary" />Préférences</CardTitle>
          <CardDescription>Personnalisez l'apparence et le comportement de l'application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="flex items-center justify-between p-4 bg-muted/20 dark:bg-muted/10 rounded-lg border border-border">
            <div className="flex items-center">
              {theme === 'light' ? <Sun className="mr-3 h-6 w-6 text-yellow-500" /> : <Moon className="mr-3 h-6 w-6 text-sky-400" />}
              <Label htmlFor="theme-switch" className="text-base font-medium">
                Thème {theme === 'light' ? 'Clair' : 'Sombre'}
              </Label>
            </div>
            <Switch
              id="theme-switch"
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              aria-label="Changer de thème"
            />
          </div>

          <div className="p-4 bg-muted/20 dark:bg-muted/10 rounded-lg border border-border space-y-3">
            <div className="flex items-center">
                <LanguagesIcon className="mr-3 h-6 w-6 text-blue-500" />
                <Label htmlFor="default-language-select" className="text-base font-medium">
                    Langue par défaut (pour les résumés)
                </Label>
            </div>
            <Select value={defaultLanguage} onValueChange={(value) => setDefaultLanguage(value as AppLanguage)}>
                <SelectTrigger id="default-language-select" className="w-full">
                    <SelectValue placeholder="Sélectionnez une langue" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">Anglais (English)</SelectItem>
                    <SelectItem value="es">Espagnol (Español)</SelectItem>
                </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
                Cette langue sera présélectionnée lors de la génération de nouveaux résumés.
            </p>
          </div>

          <div className="p-4 bg-muted/20 dark:bg-muted/10 rounded-lg border border-border space-y-4">
            <div className="flex items-center mb-2">
                <Bell className="mr-3 h-6 w-6 text-green-500" />
                <h4 className="text-base font-medium">Préférences de notification</h4>
            </div>
            <div className="flex items-center justify-between">
                <Label htmlFor="download-notif-switch" className="flex-1 cursor-pointer">
                    Notifications de téléchargement réussi
                </Label>
                <Switch
                    id="download-notif-switch"
                    checked={notificationPreferences.downloadSuccess}
                    onCheckedChange={(checked) => setNotificationPreference('downloadSuccess', checked)}
                    aria-label="Activer/Désactiver les notifications de téléchargement"
                />
            </div>
             <div className="flex items-center justify-between">
                <Label htmlFor="share-notif-switch" className="flex-1 cursor-pointer">
                    Notifications de partage/copie réussi
                </Label>
                <Switch
                    id="share-notif-switch"
                    checked={notificationPreferences.shareSuccess}
                    onCheckedChange={(checked) => setNotificationPreference('shareSuccess', checked)}
                    aria-label="Activer/Désactiver les notifications de partage"
                />
            </div>
            <p className="text-xs text-muted-foreground">
                Gérez les notifications (pop-ups) que vous recevez pour certaines actions.
            </p>
          </div>

          <div className="p-6 bg-muted/10 dark:bg-muted/5 rounded-lg text-center border border-dashed border-border mt-4">
            <Settings className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">D'autres options de personnalisation apparaîtront ici bientôt.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
