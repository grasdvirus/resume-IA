
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useCallback } from 'react';
import { Loader2, FolderArchive, FileText, CalendarDays, Trash2, Globe, Copy } from 'lucide-react';
import { type UserSavedSummary } from '@/app/actions';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { db } from '@/lib/firebase';
import { ref, onValue, off, remove } from 'firebase/database';

export function SavedSummaries() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [summaries, setSummaries] = useState<UserSavedSummary[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(true);
  
  useEffect(() => {
    if (user) {
      setIsLoadingSummaries(true);
      const summaryRef = ref(db, `summaries/${user.uid}`);
      
      const listener = onValue(summaryRef, (snapshot) => {
        const summariesData: UserSavedSummary[] = [];
        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            const id = child.key;
            const data = child.val();
            if (id && data) {
                 summariesData.push({
                    id: id,
                    createdAt: new Date(data.createdAt || Date.now()).toISOString(),
                    ...data
                });
            }
          });
        }
        // Sort descending by creation date
        setSummaries(summariesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setIsLoadingSummaries(false);
      }, (error) => {
        console.error("Firebase read failed: " + error.code);
        toast({ title: "Erreur de chargement", description: "Impossible de charger les résumés sauvegardés. Vérifiez votre connexion et les autorisations.", variant: "destructive" });
        setIsLoadingSummaries(false);
      });

      // Detach the listener when the component unmounts
      return () => {
        off(summaryRef, 'value', listener);
      };

    } else if (!authLoading) {
      // If not loading and no user, clear summaries and stop loading
      setSummaries([]);
      setIsLoadingSummaries(false);
    }
  }, [user, authLoading, toast]);


  const handleDeleteSummary = async (summaryId: string) => {
    if (!user) return;
    try {
      const summaryToDeleteRef = ref(db, `summaries/${user.uid}/${summaryId}`);
      await remove(summaryToDeleteRef);
      toast({ title: "Succès", description: "Le résumé a été supprimé."});
      // The onValue listener will automatically update the state, no need to call setSummaries here.
    } catch(error: any) {
      toast({ title: "Erreur", description: `Impossible de supprimer le résumé : ${error.message}`, variant: "destructive" });
    }
  };
  
  const handleCopySummary = (summary: UserSavedSummary) => {
    let textToCopy = "";

    if (summary.audioText) {
        textToCopy = summary.audioText;
    } else if (summary.content) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = summary.content;
        textToCopy = (tempDiv.textContent || tempDiv.innerText || '').trim();
    }
    
    if (summary.quizData) {
        const quizString = summary.quizData.questions.map((q, index) => 
            `\n\nQuestion ${index + 1}: ${q.questionText}\n` +
            q.options.map(opt => `  - ${opt.text}${opt.id === q.correctAnswerId ? ' (Bonne réponse)' : ''}`).join('\n') +
            (q.explanation ? `\n  Explication: ${q.explanation}` : '')
        ).join('');
        textToCopy += quizString;
    }

    if (!textToCopy.trim()) {
        toast({ title: 'Erreur', description: 'Rien à copier.', variant: 'destructive' });
        return;
    }

    navigator.clipboard.writeText(textToCopy.trim()).then(() => {
        toast({ title: 'Copié !', description: 'Le résumé a été copié dans le presse-papiers.' });
    }).catch(err => {
        toast({ title: 'Erreur', description: 'Impossible de copier le texte.', variant: 'destructive' });
    });
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
                      {summary.title || "Résumé sans titre"}
                    </h4>
                    <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-2 sm:space-x-3 flex-wrap">
                      <div className="flex items-center">
                        <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                        {new Date(summary.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
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
                  {summary.quizData && (
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
                    <Button variant="outline" size="sm" onClick={() => handleCopySummary(summary)}>
                      <Copy className="mr-1.5 h-4 w-4" /> Copier
                    </Button>
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
