
"use client";

import type { ChangeEvent, DragEvent } from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label"
import { Loader2, UploadCloud, FileText, Youtube, AlignLeft, ListChecks, BookOpen, AudioWaveform, Download, Share2, Plus, AlertCircle, Languages, Printer, PlayCircle, StopCircle, Newspaper, Globe, Save, Rows3 } from 'lucide-react';
import { generateSummaryAction, saveSummaryAction, type SummaryResult, type UserSummaryToSave, type InputType as ActionInputType, type OutputFormat as ActionOutputFormat, type TargetLanguage as ActionTargetLanguage, type SummaryLength as ActionSummaryLength } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import * as pdfjsLib from 'pdfjs-dist';
import { QuizView } from '@/components/QuizView';
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis';


type InputType = "pdf" | "video" | "text" | "wikipedia";
type OutputFormat = "resume" | "fiche" | "qcm" | "audio";
type TargetLanguage = ActionTargetLanguage; 
type SummaryLength = ActionSummaryLength; 

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
      "flex-shrink-0 w-[240px] sm:w-auto", 
      "p-4 border-2 rounded-lg text-center cursor-pointer transition-all duration-300 ease-in-out h-full flex flex-col justify-between", 
      "hover:border-primary hover:bg-gradient-to-br hover:from-primary/15 hover:to-primary/5 hover:shadow-lg hover:scale-[1.03]",
      selected ? "border-primary bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-primary shadow-xl scale-[1.02]" : "border-border"
    )}
    onClick={() => onSelect(value)}
    role="radio"
    aria-checked={selected}
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && onSelect(value)}
  >
    <div>
      <div className="flex justify-center text-primary mb-2 text-3xl">{icon}</div>
      <h4 className="font-semibold font-headline text-lg mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
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
  const [wikiSearchTerm, setWikiSearchTerm] = useState("");
  const [selectedOutputFormat, setSelectedOutputFormat] = useState<OutputFormat>("resume");
  const [selectedLanguage, setSelectedLanguage] = useState<TargetLanguage>(defaultLanguage);
  const [selectedSummaryLength, setSelectedSummaryLength] = useState<SummaryLength>("moyen");
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [summarySaved, setSummarySaved] = useState(false);
  
  const [plainTextForSpeech, setPlainTextForSpeech] = useState("");
  const { isSupported: speechSynthesisSupported, isSpeaking, speechRate, setSpeechRate, toggleSpeech, cancel: cancelSpeech } = useSpeechSynthesis(plainTextForSpeech, selectedLanguage);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).pdfjsWorkerSrcConfigured) {
      const version = pdfjsLib.version;
      if (version) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
      } else {
        const fallbackVersion = "4.3.136"; 
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${fallbackVersion}/pdf.worker.min.mjs`;
      }
      (window as any).pdfjsWorkerSrcConfigured = true; 
    }
  }, []); 
  
  useEffect(() => {
    setSelectedLanguage(defaultLanguage);
  }, [defaultLanguage]);

  useEffect(() => {
    setSummarySaved(false);
  }, [pdfFile, videoUrl, inputText, wikiSearchTerm, selectedOutputFormat, selectedLanguage, selectedSummaryLength]);


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
    setSummarySaved(false);
    cancelSpeech();

    let currentInputType = activeTab as ActionInputType;
    let currentInputValueForAction = ""; 
    let pdfExtractedTextForAction: string | undefined = undefined;


    if (activeTab === "pdf") {
      if (!pdfFile) {
        setError("Veuillez sélectionner un fichier PDF.");
        setIsProcessing(false);
        return;
      }
      currentInputType = 'pdf'; 
      try {
        toast({ title: "Lecture du PDF...", description: "Extraction du texte en cours. Cela peut prendre un moment pour les gros fichiers." });
        pdfExtractedTextForAction = await extractTextFromPdf(pdfFile);
        if (!pdfExtractedTextForAction.trim()) {
            setError("Impossible d'extraire le texte de ce PDF ou le PDF est vide de texte.");
            setIsProcessing(false);
            return;
        }
        currentInputValueForAction = pdfFile.name;
      } catch (pdfError: any) {
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
    } else if (activeTab === "wikipedia") {
        if (!wikiSearchTerm.trim()) {
            setError("Veuillez entrer un terme de recherche pour Wikipédia.");
            setIsProcessing(false);
            return;
        }
        currentInputType = 'wikipedia';
        currentInputValueForAction = wikiSearchTerm;
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
    setWikiSearchTerm("");
    setSelectedLanguage(defaultLanguage); 
    setSelectedSummaryLength("moyen");
    setSummarySaved(false);
    cancelSpeech();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
    else if (activeTab === "wikipedia") originalInputValueForSave = wikiSearchTerm;
    
    const summaryToSave: UserSummaryToSave = {
      userId: user.uid,
      title: summaryResult.title,
      content: summaryResult.content, 
      quizData: summaryResult.quizData,
      audioText: summaryResult.audioText,
      sourceUrl: summaryResult.sourceUrl,
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
      toast({ title: "Erreur de sauvegarde", description: error.message || "Impossible de sauvegarder le résumé.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  const getPlainTextFromResult = useCallback((result: SummaryResult | null): string => {
    if (!result) return "";
    
    if (result.audioText) {
      return result.audioText;
    }

    if (selectedOutputFormat === 'qcm' && result.quizData) {
        const tempEl = document.createElement('div');
        tempEl.innerHTML = result.content;
        return (tempEl.textContent || tempEl.innerText || "").replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    
    const tempEl = document.createElement('div');
    tempEl.innerHTML = result.content;
    return (tempEl.textContent || tempEl.innerText || "").replace(/\s+/g, ' ').trim();
  }, [selectedOutputFormat]);
  
  useEffect(() => {
      if (summaryResult) {
          setPlainTextForSpeech(getPlainTextFromResult(summaryResult));
      } else {
          setPlainTextForSpeech("");
      }
  }, [summaryResult, getPlainTextFromResult]);

  const downloadResult = () => {
    const textContent = getPlainTextFromResult(summaryResult);
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
    const textContent = getPlainTextFromResult(summaryResult);
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
        // User cancelled share, no need to show error
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

  const submitButtonLabels: Record<InputType, string> = {
    pdf: "Analyser le PDF",
    video: "Analyser la vidéo",
    text: "Résumer le texte",
    wikipedia: "Rechercher & Résumer"
  };

  return (
    <section id="upload-section" className="container mx-auto px-2 sm:px-6 lg:px-8 py-12">
      <Card className="shadow-xl hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 ease-in-out">
        <CardHeader className="text-center px-4 pt-6 pb-6 md:p-6">
          <CardTitle className="text-3xl font-headline">Que souhaitez-vous résumer ?</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pt-0 md:p-6 md:pt-0">
          {!summaryResult && !isProcessing && (
            <>
              <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as InputType); setSummarySaved(false); }} className="mb-8">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-12 mb-6">
                  <TabsTrigger value="pdf" className="py-3 text-base"><FileText className="mr-2 h-5 w-5" />PDF</TabsTrigger>
                  <TabsTrigger value="video" className="py-3 text-base"><Youtube className="mr-2 h-5 w-5" />YouTube</TabsTrigger>
                  <TabsTrigger value="text" className="py-3 text-base"><AlignLeft className="mr-2 h-5 w-5" />Texte</TabsTrigger>
                  <TabsTrigger value="wikipedia" className="py-3 text-base"><Globe className="mr-2 h-5 w-5" />Wikipédia</TabsTrigger>
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
                <TabsContent value="wikipedia">
                  <Input
                    type="search"
                    value={wikiSearchTerm}
                    onChange={(e) => {setWikiSearchTerm(e.target.value); setSummarySaved(false);}}
                    placeholder="Ex: 'Photosynthèse', 'Albert Einstein'..."
                    className="h-12 text-base mb-4"
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
                <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-primary/10 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-x-0 sm:pb-0 sm:overflow-x-visible lg:grid-cols-4">
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
                {submitButtonLabels[activeTab]}
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
              <h3 className="text-3xl font-bold font-headline text-center mb-2">✨ {summaryResult.title || "Votre résultat est prêt !"} ✨</h3>
              {summaryResult.sourceUrl && (
                <div className="text-center mb-4">
                    <a href={summaryResult.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1.5">
                        <Globe className="h-4 w-4" />
                        Voir la source originale
                    </a>
                </div>
              )}
              
              <Card className="mb-6 shadow-inner bg-muted/30">
                <CardContent id="summaryContent" className="p-3 md:p-6">
                    {selectedOutputFormat === 'qcm' && summaryResult.quizData ? (
                        <QuizView quizData={summaryResult.quizData} summaryContent={summaryResult.content} />
                    ) : (
                        <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none result-content-area" dangerouslySetInnerHTML={{ __html: summaryResult.content }} />
                    )}
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 items-center">
                {user && (
                  <Button 
                    onClick={handleSaveSummary} 
                    variant="default" 
                    className="w-full sm:w-auto bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white transition-all duration-300 ease-in-out h-10"
                    disabled={isSaving || summarySaved}
                  >
                    {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    {summarySaved ? "Sauvegardé" : "Sauvegarder"}
                  </Button>
                )}
                <Button onClick={downloadResult} variant="outline" className="w-full sm:w-auto text-foreground h-10"><Download className="mr-2 h-5 w-5" />Télécharger (.txt)</Button>
                <Button onClick={shareResult} variant="outline" className="w-full sm:w-auto text-foreground h-10"><Share2 className="mr-2 h-5 w-5" />Partager</Button>
                <Button onClick={handleExportPdf} variant="outline" className="w-full sm:w-auto text-foreground h-10"><Printer className="mr-2 h-5 w-5" />Export PDF</Button>
                
                <div className="w-full sm:w-auto flex justify-center items-end gap-2">
                  <div>
                    <Label htmlFor="speech-rate-select" className="mb-1 block text-xs text-muted-foreground text-center sm:text-left">Vitesse</Label>
                    <Select
                      value={String(speechRate)}
                      onValueChange={(value) => setSpeechRate(parseFloat(value))}
                      disabled={!speechSynthesisSupported}
                    >
                      <SelectTrigger id="speech-rate-select" className="w-[120px] h-10" aria-label="Vitesse de lecture">
                        <SelectValue placeholder="Vitesse" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.75">Lente</SelectItem>
                        <SelectItem value="1">Normale</SelectItem>
                        <SelectItem value="1.25">Modérée</SelectItem>
                        <SelectItem value="1.5">Rapide</SelectItem>
                        <SelectItem value="1.75">Très Rapide</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={toggleSpeech} variant="outline" className="text-foreground h-10" disabled={!speechSynthesisSupported}>
                    {isSpeaking ? <StopCircle className="mr-2 h-5 w-5" /> : <PlayCircle className="mr-2 h-5 w-5" />}
                    {isSpeaking ? "Arrêter" : "Lire"}
                  </Button>
                </div>

                <Button onClick={handleNewSummary} variant="secondary" className="w-full sm:w-auto h-10"><Plus className="mr-2 h-5 w-5" />Nouveau résumé</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <style jsx global>{`
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--primary) / 0.5) hsl(var(--primary) / 0.1);
        }
        .scrollbar-thin::-webkit-scrollbar {
          height: 8px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: hsl(var(--primary) / 0.1);
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: hsl(var(--primary) / 0.5);
          border-radius: 10px;
          border: 2px solid hsl(var(--primary) / 0.1);
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background-color: hsl(var(--primary) / 0.7);
        }
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
          #qcm-questions-container, .flex.flex-wrap.gap-3.justify-center { 
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}

    