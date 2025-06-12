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
import { Loader2, UploadCloud, FileText, Youtube, AlignLeft, ListChecks, BookOpen, AudioWaveform, Download, Share2, Plus, AlertCircle, Languages, Printer, PlayCircle, StopCircle, Newspaper, HelpCircle, CheckCircle, XCircle } from 'lucide-react';
import { generateSummaryAction, type SummaryResult } from '@/app/actions';
import type { QuizData, QuizQuestion } from '@/ai/flows/generate-quiz-flow'; 
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
      "p-4 border-2 rounded-lg text-center cursor-pointer transition-all duration-300 ease-in-out hover:border-primary hover:bg-primary/10",
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

  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setSpeechSynthesisSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
    
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
    setUserAnswers({});
    setQuizScore(null);
    setShowQuizResults(false);

     if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    let currentInputType = activeTab as 'text' | 'youtube' | 'pdf';
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
    setUserAnswers({});
    setQuizScore(null);
    setShowQuizResults(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
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
        // Silently fail
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
                  <OptionCard icon={<ListChecks />} title="QCM / Quiz" description="Testez vos connaissances" value="qcm" selected={selectedOutputFormat === 'qcm'} onSelect={setSelectedOutputFormat} />
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
              <h3 className="text-3xl font-bold font-headline text-center mb-6">✨ {summaryResult.title || "Votre résultat est prêt !"} ✨</h3>
              
              {selectedOutputFormat !== 'qcm' && (
                <Card className="mb-6 shadow-inner bg-muted/30">
                  <CardContent id="summaryContent" className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-6 result-content-area" dangerouslySetInnerHTML={{ __html: summaryResult.content }} />
                </Card>
              )}

              {selectedOutputFormat === 'qcm' && summaryResult.quizData && (
                <Card className="mb-6 shadow-inner bg-muted/30">
                  <CardContent id="summaryContent" className="p-6 result-content-area">
                    <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none mb-6" dangerouslySetInnerHTML={{ __html: summaryResult.content }} />
                    
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
                       <Button onClick={handleCheckQuizAnswers} className="w-full mt-4 action-btn btn-primary" disabled={Object.keys(userAnswers).length !== summaryResult.quizData.questions.length}>
                         Vérifier mes réponses
                       </Button>
                    )}
                     {showQuizResults && (
                       <Button onClick={() => { setUserAnswers({}); setQuizScore(null); setShowQuizResults(false);}} className="w-full mt-4 action-btn btn-secondary">
                         Rejouer le Quiz
                       </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-wrap gap-4 justify-center">
                <Button onClick={downloadResult} variant="default"><Download className="mr-2 h-5 w-5" />Télécharger (.txt)</Button>
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
        }
        .btn-primary {
            background-color: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
        }
        .btn-primary:hover {
            opacity: 0.9;
        }
         .btn-secondary {
            background-color: hsl(var(--secondary));
            color: hsl(var(--secondary-foreground));
        }
        .btn-secondary:hover {
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
          #qcm-questions-container, .flex.flex-wrap.gap-4.justify-center { 
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}
