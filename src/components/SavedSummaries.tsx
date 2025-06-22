
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useCallback } from 'react';
import { Loader2, FolderArchive, FileText, CalendarDays, Trash2, Globe } from 'lucide-react';
import { getUserSummariesAction, deleteSummaryAction, type UserSavedSummary, type OutputFormat, type InputType, type SummaryLength, type TargetLanguage } from '@/app/actions';
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

const OutputFormatLabels: Record<OutputFormat, string> = {
    resume: "Résumé",
    fiche: "Fiche de révision",
    qcm: "QCM",
    audio: "Audio"
};
const InputTypeLabels: Record<InputType, string> = {
    text: "Texte",
    youtube: "Vidéo YouTube",
    pdf: "PDF",
    wikipedia: "Wikipédia",
};
const SummaryLengthLabels: Record<SummaryLength, string> = {
    court: "Court",
    moyen: "Moyen",
    long: "Long",
    detaille: "Détaillé"
};
const TargetLanguageLabels: Record<TargetLanguage, string> = {
    fr: 'Français',
    en: 'Anglais',
    es: 'Espagnol',
    de: 'Allemand',
    it: 'Italien',
    pt: 'Portugais',
    ja: 'Japonais',
    ko: 'Coréen',
};

export function SavedSummaries() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [summaries, setSummaries] = useState<UserSavedSummary[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(true);

  const fetchSummaries = useCallback(async (userId: string) => {
    setIsLoadingSummaries(true);
    try {
      const userSummaries = await getUserSummariesAction(userId);
      setSummaries(userSummaries);
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de charger vos résumés sauvegardés: " + error.message, variant: "destructive" });
    } finally {
      setIsLoadingSummaries(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchSummaries(user.uid);
    } else if (!authLoading) {
      setIsLoadingSummaries(false);
    }
  }, [user, authLoading, fetchSummaries]);

  const handleDeleteSummary = async (summaryId: string) => {
    if (!user) return;
    try {
      await deleteSummaryAction(user.uid, summaryId);
      setSummaries(summaries.filter(s => s.id !== summaryId));
      toast({ title: "Succès", description: "Le résumé a été supprimé."});
    } catch(error: any) {
      toast({ title: "Erreur", description: `Impossible de supprimer le résumé : ${error.message}`, variant: "destructive" });
    }
  };

  return (
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
                  <div className="flex-1 text-left overflow-hidden">
                    <h4 className="font-semibold text-base text-primary group-hover:text-primary/90 truncate" title={summary.title}>
                      {summary.title}
                    </h4>
                    <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-2 sm:space-x-3 flex-wrap">
                      <div className="flex items-center">
                        <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                        {new Date(summary.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                       <Badge variant="secondary" className="capitalize">{OutputFormatLabels[summary.outputFormat] || summary.outputFormat}</Badge>
                       <Badge variant="outline" className="capitalize">{InputTypeLabels[summary.inputType] || summary.inputType}</Badge>
                       {summary.summaryLength && <Badge variant="outline" className="capitalize bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700">{SummaryLengthLabels[summary.summaryLength] || summary.summaryLength}</Badge>}
                       {summary.targetLanguage && summary.targetLanguage !== 'fr' && <Badge variant="outline" className="capitalize bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700">{TargetLanguageLabels[summary.targetLanguage] || summary.targetLanguage}</Badge>}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <div className="prose prose-sm dark:prose-invert max-w-none result-content-area border-t border-border pt-3 mt-2" dangerouslySetInnerHTML={{ __html: summary.content }} />
                  {summary.sourceUrl && (
                      <div className="mt-3 text-xs">
                          <a href={summary.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              <Globe className="h-3 w-3" />
                              Voir la source originale
                          </a>
                      </div>
                  )}
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
  );
}
