
"use client";

import type { ChangeEvent, DragEvent } from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UploadCloud, FileText, Youtube, AlignLeft, ListChecks, BookOpen, AudioWaveform, Download, Share2, Plus, AlertCircle, Languages, Printer, PlayCircle, StopCircle, Newspaper } from 'lucide-react';
import { generateSummaryAction, type SummaryResult } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

type InputType = "pdf" | "video" | "text";
type OutputFormat = "resume" | "fiche" | "qcm" | "audio";
type TargetLanguage = "fr" | "en" | "es";

interface OptionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: OutputFormat;
  selected: boolean;
  onSelect: (value: OutputFormat) => void;
}

const OptionCard: React.FC<OptionCardProps> = ({ icon, title, description, value, selected, onSelect }) => (
  <div
    className={cn(
      "p-4 border-2 rounded-lg text-center cursor-pointer transition-all duration-300 hover:border-primary hover:bg-primary/10",
      selected ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border"
    )}
    onClick={() => onSelect(value)}
    role="radio"
    aria-checked={selected}
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && onSelect(value)}
  >
    <div className="flex justify-center text-primary mb-2 text-3xl">{icon}</div>
    <h4 className="font-semibold font-headline text-lg mb-1">{title}</h4>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);


export function SummarizerClientWrapper() {
  const [activeTab, setActiveTab] = useState<InputType>("pdf");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState("");
  const [inputText, setInputText] = useState("");
  const [selectedOutputFormat, setSelectedOutputFormat] = useState<OutputFormat>("resume");
  const [selectedLanguage, setSelectedLanguage] = useState<TargetLanguage>("fr");
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSynthesisSupported, setSpeechSynthesisSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setSpeechSynthesisSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
    
    const handleSpeechEnd = () => setIsSpeaking(false);

    // Clean up speech synthesis on component unmount or when utterance changes
    return () => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      if (utteranceRef.current) {
        utteranceRef.current.removeEventListener('end', handleSpeechEnd);
      }
    };
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ title: "Erreur", description: "Veuillez sélectionner un fichier PDF valide.", variant: "destructive" });
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB
        toast({ title: "Erreur", description: "Le fichier est trop volumineux (max 50MB).", variant: "destructive" });
        return;
      }
      setPdfFile(file);
      setPdfFileName(file.name);
      setError(null);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ title: "Erreur", description: "Veuillez sélectionner un fichier PDF valide.", variant: "destructive" });
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "Erreur", description: "Le fichier est trop volumineux (max 50MB).", variant: "destructive" });
        return;
      }
      setPdfFile(file);
      setPdfFileName(file.name);
      setError(null);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };
  
  const handleSubmit = async () => {
    setIsProcessing(true);
    setSummaryResult(null);
    setError(null);
     if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    let currentInputType = activeTab as 'text' | 'youtube' | 'pdf'; // Type assertion for generateSummaryAction
    let currentInputValue = "";

    if (activeTab === "pdf") {
      if (!pdfFile) {
        setError("Veuillez sélectionner un fichier PDF.");
        setIsProcessing(false);
        return;
      }
      currentInputType = 'pdf';
      currentInputValue = pdfFile.name; 
    } else if (activeTab === "video") {
      if (!videoUrl.trim()) {
        setError("Veuillez entrer une URL YouTube.");
        setIsProcessing(false);
        return;
      }
      // Validation de format URL YouTube plus stricte côté client
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}(&\S*)?$/;
      if (!youtubeRegex.test(videoUrl)) {
        setError("Veuillez entrer une URL YouTube valide (ex: youtube.com/watch?v=... ou youtu.be/...).");
        setIsProcessing(false);
        return;
      }
      currentInputType = 'youtube';
      currentInputValue = videoUrl;
    } else if (activeTab === "text") {
      if (!inputText.trim()) {
        setError("Veuillez entrer du texte à résumer.");
        setIsProcessing(false);
        return;
      }
      if (inputText.trim().length < 50) { 
         setError("Le texte doit contenir au moins 50 caractères.");
         setIsProcessing(false);
         return;
      }
      currentInputType = 'text';
      currentInputValue = inputText;
    }

    try {
      const result = await generateSummaryAction(currentInputType, currentInputValue, selectedOutputFormat, selectedLanguage);
      setSummaryResult(result);
    } catch (e: any) {
      setError(e.message || "Une erreur est survenue.");
      toast({ title: "Erreur de résumé", description: e.message || "Une erreur est survenue lors de la génération du résumé.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleNewSummary = () => {
    setSummaryResult(null);
    setError(null);
    setPdfFile(null);
    setPdfFileName("");
    setVideoUrl("");
    setInputText("");
    setSelectedLanguage("fr");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const getPlainTextFromResult = useCallback(() => {
    if (!summaryResult || !summaryResult.content) return "";
    const tempEl = document.createElement('div');
    tempEl.innerHTML = summaryResult.content;
     // Améliorer l'extraction de texte pour la synthèse vocale
    tempEl.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(header => {
        const p = document.createElement('p');
        p.textContent = (header.textContent || "") + ". "; // Ajouter un point et un espace
        header.parentNode?.replaceChild(p, header);
    });
    // Supprimer les éléments non pertinents pour la lecture (ex: boutons dans le QCM)
    tempEl.querySelectorAll('button, input[type="radio"]+label, #qcm-container, #qcm-result-text').forEach(el => el.remove());
    
    // Remplacer les <br> par des espaces pour une meilleure fluidité
    tempEl.innerHTML = tempEl.innerHTML.replace(/<br\s*\/?>/gi, ' ');

    return (tempEl.textContent || tempEl.innerText || "").replace(/\s+/g, ' ').trim();
  }, [summaryResult]);

  const downloadResult = () => {
    const textContent = getPlainTextFromResult();
    if (!textContent) return;
    
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (summaryResult?.title || 'resume').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${safeTitle}_${selectedOutputFormat}_${selectedLanguage}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Téléchargement réussi", description: "Le résumé a été téléchargé au format .txt." });
  };

  const shareResult = async () => {
    const textContent = getPlainTextFromResult();
    if (!textContent) return;

    const shareData = {
      title: summaryResult?.title || 'Résumé IA',
      text: textContent,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast({ title: "Partage réussi", description: "Le résumé a été partagé." });
      } catch (err) {
        // Silently fail or show a specific toast if share is cancelled by user
        // toast({ title: "Erreur de partage", description: "Le partage a été annulé ou a échoué.", variant: "destructive" });
      }
    } else {
      try {
        await navigator.clipboard.writeText(textContent);
        toast({ title: "Copié dans le presse-papiers", description: "Le résumé a été copié. Vous pouvez le coller où vous voulez." });
      } catch (err) {
        toast({ title: "Erreur de copie", description: "Impossible de copier le résumé dans le presse-papiers.", variant: "destructive" });
      }
    }
  };

  const handleExportPdf = () => {
    if (!summaryResult) return;
    window.print();
    toast({ title: "Export PDF", description: "Utilisez la fonction 'Enregistrer en PDF' de votre navigateur." });
  };
  
  const handleToggleAudio = () => {
    if (!speechSynthesisSupported || !summaryResult) {
      toast({ title: "Synthèse vocale non supportée", description: "Votre navigateur ne supporte pas la synthèse vocale, ou il n'y a pas de résumé à lire.", variant: "destructive" });
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const textToSpeak = getPlainTextFromResult();
      if (!textToSpeak) {
        toast({ title: "Aucun texte à lire", description: "Le contenu du résumé est vide.", variant: "destructive" });
        return;
      }
      
      const newUtterance = new SpeechSynthesisUtterance(textToSpeak);
      const langMap: Record<TargetLanguage, string> = { fr: 'fr-FR', en: 'en-US', es: 'es-ES' };
      newUtterance.lang = langMap[selectedLanguage] || 'fr-FR';
      
      // Nettoyer l'ancien écouteur s'il existe
      if (utteranceRef.current) {
        utteranceRef.current.removeEventListener('end', () => setIsSpeaking(false));
      }
      
      newUtterance.onend = () => {
        setIsSpeaking(false);
      };
      newUtterance.onerror = (event) => {
        console.error('SpeechSynthesisUtterance.onerror', event);
        setIsSpeaking(false);
        toast({ title: "Erreur de lecture", description: "Impossible de lire le résumé.", variant: "destructive" });
      };
      
      utteranceRef.current = newUtterance;
      window.speechSynthesis.speak(newUtterance);
      setIsSpeaking(true);
    }
  };
  
  useEffect(() => {
    if (summaryResult && selectedOutputFormat === 'qcm' && typeof window !== 'undefined') {
      const checkAnswersButton = document.getElementById('check-qcm-answers-button');
      const qcmResultEl = document.getElementById('qcm-result-text');
      
      if (checkAnswersButton && qcmResultEl) {
        const clickHandler = () => {
          const answerQ1Input = document.querySelector('input[name="q1"]:checked') as HTMLInputElement | null;
          const answerQ2Input = document.querySelector('input[name="q2"]:checked') as HTMLInputElement | null;

          const userAnswers = {
            q1: answerQ1Input ? answerQ1Input.value : null,
            q2: answerQ2Input ? answerQ2Input.value : null,
          };

          const correctAnswers = {
            q1: "q1b", // B) Le thème central du résumé fourni
            q2: "q2a", // A) Oui
          };

          let score = 0;
          let feedbackText = "";

          if (!userAnswers.q1 || !userAnswers.q2) {
            feedbackText = "Veuillez répondre à toutes les questions.";
          } else {
            if (userAnswers.q1 === correctAnswers.q1) score++;
            if (userAnswers.q2 === correctAnswers.q2) score++;
            feedbackText = `Vous avez obtenu ${score} sur 2 bonnes réponses.`;
          }
          
          qcmResultEl.textContent = feedbackText;
          toast({ title: "Résultat du QCM", description: feedbackText });
        };

        // Simple way to avoid re-adding: remove before adding if it might exist from a previous render
        const buttonElement = checkAnswersButton as HTMLButtonElement & { _qcmClickHandler?: () => void };
        if (buttonElement._qcmClickHandler) {
            buttonElement.removeEventListener('click', buttonElement._qcmClickHandler);
        }
        buttonElement.addEventListener('click', clickHandler);
        buttonElement._qcmClickHandler = clickHandler; // Store for potential removal
      }
    }
  }, [summaryResult, selectedOutputFormat, toast]);


  return (
    <section id="upload-section" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">Que souhaitez-vous résumer ?</CardTitle>
        </CardHeader>
        <CardContent>
          {!summaryResult && !isProcessing && (
            <>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InputType)} className="mb-8">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-12 mb-6">
                  <TabsTrigger value="pdf" className="py-3 text-base"><FileText className="mr-2 h-5 w-5" />PDF</TabsTrigger>
                  <TabsTrigger value="video" className="py-3 text-base"><Youtube className="mr-2 h-5 w-5" />Vidéo YouTube</TabsTrigger>
                  <TabsTrigger value="text" className="py-3 text-base"><AlignLeft className="mr-2 h-5 w-5" />Texte</TabsTrigger>
                </TabsList>
                <TabsContent value="pdf">
                  <div
                    id="dropZone"
                    className={cn(
                      "border-3 border-dashed border-primary/50 rounded-xl p-8 text-center cursor-pointer transition-all duration-300 hover:border-primary hover:bg-primary/5",
                      isDragging && "border-primary bg-primary/10 ring-2 ring-primary"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <UploadCloud className="mx-auto h-16 w-16 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Glissez votre PDF ici ou cliquez pour sélectionner</h3>
                    <p className="text-muted-foreground text-sm">Formats acceptés : PDF (max 50MB)</p>
                    {pdfFileName && <p className="mt-2 text-sm text-green-600">Fichier sélectionné : {pdfFileName}</p>}
                    <input type="file" id="fileInput" ref={fileInputRef} accept=".pdf" onChange={handleFileChange} className="hidden" />
                  </div>
                </TabsContent>
                <TabsContent value="video">
                  <Input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Collez l'URL de votre vidéo YouTube ici..."
                    className="h-12 text-base mb-4"
                  />
                </TabsContent>
                <TabsContent value="text">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Collez votre texte ici..."
                    className="min-h-[200px] text-base mb-4"
                  />
                </TabsContent>
              </Tabs>

              <div className="mb-8">
                <h3 className="text-xl font-semibold font-headline mb-4 text-center">Format de sortie souhaité :</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <OptionCard icon={<Newspaper className="h-8 w-8" />} title="Résumé classique" description="Points clés structurés" value="resume" selected={selectedOutputFormat === 'resume'} onSelect={setSelectedOutputFormat} />
                  <OptionCard icon={<BookOpen />} title="Fiche de révision" description="Format étudiant optimisé" value="fiche" selected={selectedOutputFormat === 'fiche'} onSelect={setSelectedOutputFormat} />
                  <OptionCard icon={<AudioWaveform />} title="Version audio" description="Écoutez votre résumé" value="audio" selected={selectedOutputFormat === 'audio'} onSelect={setSelectedOutputFormat} />
                  <OptionCard icon={<ListChecks />} title="QCM" description="Questions de révision" value="qcm" selected={selectedOutputFormat === 'qcm'} onSelect={setSelectedOutputFormat} />
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold font-headline mb-4 text-center">
                  <Languages className="inline-block mr-2 h-6 w-6 align-text-bottom" />
                  Langue de traduction :
                </h3>
                <Select value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value as TargetLanguage)}>
                  <SelectTrigger className="w-full sm:w-[280px] mx-auto h-12 text-base">
                    <SelectValue placeholder="Sélectionnez une langue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">Anglais (English)</SelectItem>
                    <SelectItem value="es">Espagnol (Español)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {error && (
                <div className="mb-4 p-4 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <p>{error}</p>
                </div>
              )}

              <Button onClick={handleSubmit} size="lg" className="w-full text-lg py-6 font-headline bg-[linear-gradient(45deg,#ff6b6b,#ee5a24)] hover:opacity-90">
                {isProcessing ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : null}
                {activeTab === "pdf" ? "Analyser le PDF" : activeTab === "video" ? "Analyser la vidéo" : "Résumer le texte"}
              </Button>
            </>
          )}

          {isProcessing && !summaryResult && (
            <div className="text-center py-12">
              <Loader2 className="mx-auto h-16 w-16 text-primary animate-spin mb-6" />
              <h3 className="text-2xl font-semibold font-headline mb-2">Analyse en cours...</h3>
              <p className="text-muted-foreground">Notre IA traite votre contenu, cela peut prendre quelques instants.</p>
            </div>
          )}

          {summaryResult && !isProcessing && (
            <div>
              <h3 className="text-3xl font-bold font-headline text-center mb-6">✨ {summaryResult.title || "Votre résumé est prêt !"} ✨</h3>
              <Card className="mb-6 shadow-inner bg-muted/30">
                <CardContent id="summaryContent" className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-6 result-content-area" dangerouslySetInnerHTML={{ __html: summaryResult.content }} />
              </Card>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button onClick={downloadResult} variant="default"><Download className="mr-2 h-5 w-5" />Télécharger (.txt)</Button>
                <Button onClick={shareResult} variant="outline" className="text-foreground"><Share2 className="mr-2 h-5 w-5" />Partager</Button>
                <Button onClick={handleExportPdf} variant="outline" className="text-foreground"><Printer className="mr-2 h-5 w-5" />Export PDF</Button>
                <Button onClick={handleToggleAudio} variant="outline" className="text-foreground" disabled={!speechSynthesisSupported}>
                  {isSpeaking ? <StopCircle className="mr-2 h-5 w-5" /> : <PlayCircle className="mr-2 h-5 w-5" />}
                  {isSpeaking ? "Arrêter la lecture" : "Lire le résumé"}
                </Button>
                <Button onClick={handleNewSummary} variant="secondary"><Plus className="mr-2 h-5 w-5" />Nouveau résumé</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <style jsx global>{`
        .result-content-area ul, .result-content-area ol {
          list-style-position: inside;
          padding-left: 1.5em; 
          margin-left: 0; 
        }
        .result-content-area ul li, .result-content-area ol li {
          margin-bottom: 0.5em;
        }
        .result-content-area h4 {
          font-size: 1.25em; 
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
         .result-content-area p {
          margin-bottom: 1em;
        }
        .action-btn { 
            padding: 0.8rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
            background-color: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
        }
        .action-btn:hover {
            opacity: 0.9;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          #summaryContent, #summaryContent * {
            visibility: visible;
          }
          #summaryContent {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            margin: 0;
            font-size: 12pt;
          }
          #summaryContent h3, #summaryContent h4, #summaryContent h5 {
             font-size: 14pt;
             margin-top: 0.5em;
             margin-bottom: 0.25em;
          }
           #summaryContent p, #summaryContent li {
             font-size: 12pt;
             line-height: 1.4;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}

