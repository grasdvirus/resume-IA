
"use client";

import type { ChangeEvent, DragEvent } from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Loader2, UploadCloud, FileText, Youtube, AlignLeft, ListChecks, BookOpen, AudioWaveform, Download, Share2, Plus, AlertCircle, Languages, Printer, PlayCircle, StopCircle, Newspaper, HelpCircle, CheckCircle, XCircle, Save, Rows3 } from 'lucide-react';
import { generateSummaryAction, saveSummaryAction, type SummaryResult, type UserSummaryToSave, type InputType as ActionInputType, type OutputFormat as ActionOutputFormat, type TargetLanguage as ActionTargetLanguage, type SummaryLength as ActionSummaryLength } from '@/app/actions';
import type { QuizData, QuizQuestion } from '@/ai/flows/generate-quiz-flow'; 
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import * as pdfjsLib from 'pdfjs-dist';

type InputType = "pdf" | "video" | "text";
type OutputFormat = "resume" | "fiche" | "qcm" | "audio";
type TargetLanguage = ActionTargetLanguage; // Use the extended type from actions
type SummaryLength = ActionSummaryLength; // Use the type from actions

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
      "p-4 border-2 rounded-lg text-center cursor-pointer transition-all duration-300 ease-in-out",
      "hover:border-primary hover:bg-gradient-to-br hover:from-primary/15 hover:to-primary/5 hover:shadow-lg hover:scale-[1.03]",
      selected ? "border-primary bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-primary shadow-xl scale-[1.02]" : "border-border"
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
  const { user } = useAuth();
  const { defaultLanguage, notificationPreferences } = useSettings();
  const [activeTab, setActiveTab] = useState<InputType>("pdf");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState("");
  const [inputText, setInputText] = useState("");
  const [selectedOutputFormat, setSelectedOutputFormat] = useState<OutputFormat>("resume");
  const [selectedLanguage, setSelectedLanguage] = useState<TargetLanguage>(defaultLanguage);
  const [selectedSummaryLength, setSelectedSummaryLength] = useState<SummaryLength>("moyen");
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSynthesisSupported, setSpeechSynthesisSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [summarySaved, setSummarySaved] = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setSpeechSynthesisSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);

    if (typeof window !== 'undefined' && !(window as any).pdfjsWorkerSrcConfigured) {
      const version = pdfjsLib.version;
      if (version) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
        (window as any).pdfjsWorkerSrcConfigured = true; 
      } else {
        const fallbackVersion = "4.3.136"; // Fallback if version is not found for some reason
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${fallbackVersion}/pdf.worker.min.mjs`;
        (window as any).pdfjsWorkerSrcConfigured = true;
      }
    }
    
    const handleSpeechEnd = () => setIsSpeaking(false);

    return () => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      if (utteranceRef.current) {
        utteranceRef.current.removeEventListener('end', handleSpeechEnd);
      }
    };
  }, []); 
  
  useEffect(() => {
    setSelectedLanguage(defaultLanguage);
  }, [defaultLanguage]);

  useEffect(() => {
    setSummarySaved(false);
  }, [pdfFile, videoUrl, inputText, selectedOutputFormat, selectedLanguage, selectedSummaryLength]);


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
      setSummarySaved(false);
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
      setSummarySaved(false);
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
  
  async function extractTextFromPdf(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => ('str' in item ? item.str : '')).join(" ") + "\n";
    }
    return fullText;
  }

  const handleSubmit = async () => {
    setIsProcessing(true);
    setSummaryResult(null);
    setError(null);
    setUserAnswers({});
    setQuizScore(null);
    setShowQuizResults(false);
    setSummarySaved(false);

     if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    let currentInputType = activeTab as ActionInputType;
    let currentInputValueForAction = ""; 
    let currentPdfFileNameForAction = ""; 
    let pdfExtractedTextForAction: string | undefined = undefined;


    if (activeTab === "pdf") {
      if (!pdfFile) {
        setError("Veuillez sélectionner un fichier PDF.");
        setIsProcessing(false);
        return;
      }
      currentInputType = 'pdf'; 
      currentPdfFileNameForAction = pdfFile.name; 
      try {
        toast({ title: "Lecture du PDF...", description: "Extraction du texte en cours. Cela peut prendre un moment pour les gros fichiers." });
        pdfExtractedTextForAction = await extractTextFromPdf(pdfFile);
        if (!pdfExtractedTextForAction.trim()) {
            setError("Impossible d'extraire le texte de ce PDF ou le PDF est vide de texte.");
            setIsProcessing(false);
            return;
        }
        // For PDF, inputValueOrFileName for the action will be the filename. 
        // The extracted text is passed separately.
        currentInputValueForAction = currentPdfFileNameForAction;
      } catch (pdfError: any) {
        console.error("Error extracting PDF text:", pdfError);
        setError(`Erreur lors de la lecture du PDF: ${pdfError.message || 'Veuillez vérifier le fichier et réessayer.'}`);
        setIsProcessing(false);
        return;
      }
    } else if (activeTab === "video") {
      if (!videoUrl.trim()) {
        setError("Veuillez entrer une URL YouTube.");
        setIsProcessing(false);
        return;
      }
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}((\?|&)\S*)?$/;
      if (!youtubeRegex.test(videoUrl)) {
        setError("Veuillez entrer une URL YouTube valide (ex: youtube.com/watch?v=... ou youtu.be/...).");
        setIsProcessing(false);
        return;
      }
      currentInputType = 'youtube';
      currentInputValueForAction = videoUrl;
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
      currentInputValueForAction = inputText;
    }

    try {
      const result = await generateSummaryAction(
        currentInputType, 
        currentInputValueForAction, 
        selectedOutputFormat as ActionOutputFormat, 
        selectedLanguage as ActionTargetLanguage,
        selectedSummaryLength as ActionSummaryLength,
        pdfExtractedTextForAction 
      );
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
    setSelectedLanguage(defaultLanguage); 
    setSelectedSummaryLength("moyen");
    setUserAnswers({});
    setQuizScore(null);
    setShowQuizResults(false);
    setSummarySaved(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleSaveSummary = async () => {
    if (!user || !summaryResult) {
      toast({ title: "Erreur", description: "Utilisateur non connecté ou pas de résumé à sauvegarder.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    let originalInputValueForSave = "";
    if (activeTab === "pdf" && pdfFileName) originalInputValueForSave = pdfFileName; 
    else if (activeTab === "video") originalInputValueForSave = videoUrl;
    else if (activeTab === "text") originalInputValueForSave = inputText;
    
    const summaryToSave: UserSummaryToSave = {
      userId: user.uid,
      title: summaryResult.title,
      content: summaryResult.content, 
      quizData: summaryResult.quizData,
      inputType: activeTab as ActionInputType, 
      inputValue: originalInputValueForSave, 
      outputFormat: selectedOutputFormat as ActionOutputFormat,
      targetLanguage: selectedLanguage as ActionTargetLanguage,
      summaryLength: selectedSummaryLength as ActionSummaryLength, 
    };

    try {
      await saveSummaryAction(summaryToSave);
      toast({ title: "Succès", description: "Résumé sauvegardé avec succès !" });
      setSummarySaved(true);
    } catch (error: any) {
      console.error("Failed to save summary:", error);
      toast({ title: "Erreur de sauvegarde", description: error.message || "Impossible de sauvegarder le résumé.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  const getPlainTextFromResult = useCallback(() => {
    if (!summaryResult) return "";
    
    let textToProcess = summaryResult.content;

    if (selectedOutputFormat === 'qcm' && summaryResult.quizData) {
        const quizTextParts: string[] = [];
        if (summaryResult.content) { 
            const tempContextEl = document.createElement('div');
            tempContextEl.innerHTML = summaryResult.content;
            quizTextParts.push((tempContextEl.textContent || tempContextEl.innerText || "").replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
        }
        summaryResult.quizData.questions.forEach((q, idx) => {
            quizTextParts.push(`Question ${idx + 1}: ${q.questionText}`);
            q.options.forEach(opt => quizTextParts.push(opt.text));
        });
        textToProcess = quizTextParts.join('. ');
    } else {
        const tempEl = document.createElement('div');
        tempEl.innerHTML = summaryResult.content;
        tempEl.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(header => {
            const p = document.createElement('p');
            p.textContent = (header.textContent || "") + ". ";
            header.parentNode?.replaceChild(p, header);
        });
        tempEl.querySelectorAll('button, input[type="radio"]+label, #qcm-container, #qcm-result-text, .qcm-explanation').forEach(el => el.remove());
        textToProcess = (tempEl.textContent || tempEl.innerText || "").replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return textToProcess;
  }, [summaryResult, selectedOutputFormat]);

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
    if (notificationPreferences.downloadSuccess) {
      toast({ title: "Téléchargement réussi", description: "Le résumé a été téléchargé au format .txt." });
    }
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
        if (notificationPreferences.shareSuccess) {
          toast({ title: "Partage réussi", description: "Le résumé a été partagé." });
        }
      } catch (err) {
        console.warn("Share API error:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(textContent);
        if (notificationPreferences.shareSuccess) {
          toast({ title: "Copié dans le presse-papiers", description: "Le résumé a été copié. Vous pouvez le coller où vous voulez." });
        }
      } catch (err) {
        if (notificationPreferences.shareSuccess) { 
          toast({ title: "Erreur de copie", description: "Impossible de copier le résumé dans le presse-papiers.", variant: "destructive" });
        }
      }
    }
  };

  const handleExportPdf = () => {
    if (!summaryResult) return;
    window.print();
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
      const langMap: Record<TargetLanguage, string> = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', ja: 'ja-JP', ko: 'ko-KR' };
      newUtterance.lang = langMap[selectedLanguage as TargetLanguage] || 'fr-FR';
      
      if (utteranceRef.current) {
        utteranceRef.current.removeEventListener('end', () => setIsSpeaking(false));
      }
      
      newUtterance.onend = () => setIsSpeaking(false);
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

  const handleQuizAnswerChange = (questionId: string, answerId: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answerId }));
    setShowQuizResults(false); 
    setQuizScore(null);
  };

  const handleCheckQuizAnswers = () => {
    if (!summaryResult?.quizData) return;
    let score = 0;
    summaryResult.quizData.questions.forEach(q => {
      if (userAnswers[q.id] === q.correctAnswerId) {
        score++;
      }
    });
    setQuizScore(score);
    setShowQuizResults(true);
    toast({ title: "Résultat du QCM", description: `Vous avez obtenu ${score} sur ${summaryResult.quizData.questions.length} bonnes réponses.` });
  };


  return (
    <section id="upload-section" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="shadow-xl hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 ease-in-out">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">Que souhaitez-vous résumer ?</CardTitle>
        </CardHeader>
        <CardContent>
          {!summaryResult && !isProcessing && (
            <>
              <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as InputType); setSummarySaved(false); }} className="mb-8">
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
                    onChange={(e) => {setVideoUrl(e.target.value); setSummarySaved(false);}}
                    placeholder="Collez l'URL de votre vidéo YouTube ici..."
                    className="h-12 text-base mb-4"
                  />
                </TabsContent>
                <TabsContent value="text">
                  <Textarea
                    value={inputText}
                    onChange={(e) => {setInputText(e.target.value); setSummarySaved(false);}}
                    placeholder="Collez votre texte ici..."
                    className="min-h-[200px] text-base mb-4"
                  />
                </TabsContent>
              </Tabs>

              <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-xl font-semibold font-headline mb-4 text-center md:text-left">
                        <Rows3 className="inline-block mr-2 h-6 w-6 align-text-bottom" />
                        Longueur du résumé :
                    </h3>
                    <Select value={selectedSummaryLength} onValueChange={(value) => {setSelectedSummaryLength(value as SummaryLength); setSummarySaved(false);}}>
                        <SelectTrigger className="w-full h-12 text-base">
                        <SelectValue placeholder="Sélectionnez une longueur" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="court">Court (2-3 phrases)</SelectItem>
                        <SelectItem value="moyen">Moyen (1 paragraphe)</SelectItem>
                        <SelectItem value="long">Long (2-3 paragraphes)</SelectItem>
                        <SelectItem value="detaille">Détaillé (points clés)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <h3 className="text-xl font-semibold font-headline mb-4 text-center md:text-left">
                        <Languages className="inline-block mr-2 h-6 w-6 align-text-bottom" />
                        Langue de traduction :
                    </h3>
                    <Select value={selectedLanguage} onValueChange={(value) => {setSelectedLanguage(value as TargetLanguage); setSummarySaved(false);}}>
                        <SelectTrigger className="w-full h-12 text-base">
                        <SelectValue placeholder="Sélectionnez une langue" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="en">Anglais (English)</SelectItem>
                        <SelectItem value="es">Espagnol (Español)</SelectItem>
                        <SelectItem value="de">Allemand (Deutsch)</SelectItem>
                        <SelectItem value="it">Italien (Italiano)</SelectItem>
                        <SelectItem value="pt">Portugais (Português)</SelectItem>
                        <SelectItem value="ja">Japonais (日本語)</SelectItem>
                        <SelectItem value="ko">Coréen (한국어)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>


              <div className="mb-8">
                <h3 className="text-xl font-semibold font-headline mb-4 text-center">Format de sortie souhaité :</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <OptionCard icon={<Newspaper className="h-8 w-8" />} title="Résumé classique" description="Points clés structurés" value="resume" selected={selectedOutputFormat === 'resume'} onSelect={(v) => {setSelectedOutputFormat(v); setSummarySaved(false);}} />
                  <OptionCard icon={<BookOpen />} title="Fiche de révision" description="Format étudiant optimisé" value="fiche" selected={selectedOutputFormat === 'fiche'} onSelect={(v) => {setSelectedOutputFormat(v); setSummarySaved(false);}} />
                  <OptionCard icon={<AudioWaveform />} title="Version audio" description="Écoutez votre résumé" value="audio" selected={selectedOutputFormat === 'audio'} onSelect={(v) => {setSelectedOutputFormat(v); setSummarySaved(false);}} />
                  <OptionCard icon={<ListChecks />} title="QCM / Quiz" description="Testez vos connaissances" value="qcm" selected={selectedOutputFormat === 'qcm'} onSelect={(v) => {setSelectedOutputFormat(v); setSummarySaved(false);}} />
                </div>
              </div>
              
              {error && (
                <div className="mb-4 p-4 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <p>{error}</p>
                </div>
              )}

              <Button onClick={handleSubmit} size="lg" className="w-full text-lg py-6 font-headline bg-[linear-gradient(45deg,#ff6b6b,#ee5a24)] hover:bg-[linear-gradient(60deg,#ff8585,#ff7a45)] hover:scale-[1.03] text-primary-foreground transition-all duration-300 ease-in-out">
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
              {activeTab === 'pdf' && pdfFile && <p className="text-sm text-muted-foreground mt-2">Extraction du texte du PDF : {pdfFileName}</p>}
            </div>
          )}

          {summaryResult && !isProcessing && (
            <div>
              <h3 className="text-3xl font-bold font-headline text-center mb-6">✨ {summaryResult.title || "Votre résultat est prêt !"} ✨</h3>
              
              {selectedOutputFormat !== 'qcm' && (
                <Card className="mb-6 shadow-inner bg-muted/30">
                  <CardContent id="summaryContent" className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-6 result-content-area" dangerouslySetInnerHTML={{ __html: summaryResult.content }} />
                </Card>
              )}

              {selectedOutputFormat === 'qcm' && summaryResult.quizData && (
                <Card className="mb-6 shadow-inner bg-muted/30">
                  <CardContent id="summaryContent" className="p-6 result-content-area">
                     <div className="bg-muted p-4 rounded-lg mb-6 max-h-[200px] overflow-y-auto prose prose-sm sm:prose max-w-none" dangerouslySetInnerHTML={{ __html: summaryResult.content }} />
                    
                    <div id="qcm-questions-container">
                      {summaryResult.quizData.questions.map((question, qIndex) => (
                        <div key={question.id} className="qcm-question-block mb-6 p-4 border border-border rounded-lg bg-background">
                          <p className="font-semibold mb-3 text-lg">{qIndex + 1}. {question.questionText}</p>
                          <RadioGroup
                            value={userAnswers[question.id] || ""}
                            onValueChange={(value) => handleQuizAnswerChange(question.id, value)}
                            aria-label={`Options pour la question ${qIndex + 1}`}
                          >
                            {question.options.map((option) => (
                              <div key={option.id} className="flex items-center space-x-2 mb-2">
                                <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} disabled={showQuizResults} />
                                <Label htmlFor={`${question.id}-${option.id}`} className={cn("cursor-pointer", showQuizResults && userAnswers[question.id] === option.id && (option.id === question.correctAnswerId ? "text-green-600 font-bold" : "text-red-600 font-bold"), showQuizResults && option.id === question.correctAnswerId && "text-green-600")}>
                                  {option.text}
                                  {showQuizResults && userAnswers[question.id] === option.id && (option.id === question.correctAnswerId ? <CheckCircle className="inline-block ml-2 h-5 w-5 text-green-500" /> : <XCircle className="inline-block ml-2 h-5 w-5 text-red-500" />)}
                                  {showQuizResults && option.id === question.correctAnswerId && userAnswers[question.id] !== option.id && <CheckCircle className="inline-block ml-2 h-5 w-5 text-green-500" />}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                          {showQuizResults && question.explanation && (
                             <p className={cn("mt-2 text-sm p-2 rounded-md", userAnswers[question.id] === question.correctAnswerId ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                <strong>Explication :</strong> {question.explanation}
                            </p>
                          )}
                           {showQuizResults && !question.explanation && userAnswers[question.id] !== question.correctAnswerId && (
                             <p className="mt-2 text-sm p-2 rounded-md bg-yellow-100 text-yellow-700">
                                <strong>Note :</strong> La bonne réponse était <span className="font-bold">{question.options.find(opt => opt.id === question.correctAnswerId)?.text || 'N/A'}</span>.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {quizScore !== null && showQuizResults && (
                      <div className="mt-6 p-4 border-2 border-primary rounded-lg text-center bg-primary/10">
                        <h4 className="text-xl font-bold font-headline mb-2 text-primary">Votre Score : {quizScore} / {summaryResult.quizData.questions.length}</h4>
                      </div>
                    )}
                    {!showQuizResults && (
                       <Button 
                         onClick={handleCheckQuizAnswers} 
                         className="w-full mt-4 action-btn bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transition-all duration-300 ease-in-out" 
                         disabled={Object.keys(userAnswers).length !== summaryResult.quizData.questions.length}>
                         Vérifier mes réponses
                       </Button>
                    )}
                     {showQuizResults && (
                       <Button 
                         onClick={() => { setUserAnswers({}); setQuizScore(null); setShowQuizResults(false);}} 
                         className="w-full mt-4 action-btn bg-gradient-to-r from-slate-500 to-gray-600 hover:from-slate-600 hover:to-gray-700 text-white transition-all duration-300 ease-in-out">
                         Rejouer le Quiz
                       </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-wrap gap-3 justify-center">
                {user && (
                  <Button 
                    onClick={handleSaveSummary} 
                    variant="default" 
                    className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white transition-all duration-300 ease-in-out"
                    disabled={isSaving || summarySaved}
                  >
                    {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    {summarySaved ? "Résumé Sauvegardé" : "Sauvegarder ce résumé"}
                  </Button>
                )}
                <Button onClick={downloadResult} variant="outline" className="text-foreground"><Download className="mr-2 h-5 w-5" />Télécharger (.txt)</Button>
                <Button onClick={shareResult} variant="outline" className="text-foreground"><Share2 className="mr-2 h-5 w-5" />Partager</Button>
                <Button onClick={handleExportPdf} variant="outline" className="text-foreground"><Printer className="mr-2 h-5 w-5" />Export PDF</Button>
                <Button onClick={handleToggleAudio} variant="outline" className="text-foreground" disabled={!speechSynthesisSupported}>
                  {isSpeaking ? <StopCircle className="mr-2 h-5 w-5" /> : <PlayCircle className="mr-2 h-5 w-5" />}
                  {isSpeaking ? "Arrêter la lecture" : "Lire le résultat"}
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
        .result-content-area h1, .result-content-area h2, .result-content-area h3, .result-content-area h4, .result-content-area h5, .result-content-area h6 {
          font-family: 'Space Grotesk', sans-serif; 
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
          #summaryContent h1, #summaryContent h2, #summaryContent h3, #summaryContent h4, #summaryContent h5, #summaryContent h6 {
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
          #qcm-questions-container, .flex.flex-wrap.gap-4.justify-center { 
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}

