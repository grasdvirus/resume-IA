
"use client";

import type { ChangeEvent, DragEvent } from 'react';
import { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UploadCloud, FileText, Youtube, AlignLeft, ListChecks, BookOpen, AudioWaveform, Download, Share2, Plus, AlertCircle, Languages } from 'lucide-react';
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

    let currentInputType = activeTab;
    let currentInputValue = "";

    if (activeTab === "pdf") {
      if (!pdfFile) {
        setError("Veuillez sélectionner un fichier PDF.");
        setIsProcessing(false);
        return;
      }
      currentInputType = 'pdf'; // Ensure correct type for action
      currentInputValue = pdfFile.name; // Pass filename for mock processing
    } else if (activeTab === "video") {
      if (!videoUrl.trim()) {
        setError("Veuillez entrer une URL YouTube.");
        setIsProcessing(false);
        return;
      }
      currentInputType = 'youtube'; // Ensure correct type for action
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
      currentInputType = 'text'; // Ensure correct type for action
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
  };

  const getPlainTextFromResult = () => {
    if (!summaryResult || !summaryResult.content) return "";
    const tempEl = document.createElement('div');
    tempEl.innerHTML = summaryResult.content;
    return tempEl.textContent || tempEl.innerText || "";
  }

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
        // If sharing fails, or is cancelled, do nothing or log error
        // console.error("Share failed:", err);
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
  
  useEffect(() => {
    if (summaryResult && selectedOutputFormat === 'qcm' && typeof window !== 'undefined') {
      const checkAnswersButton = document.querySelector('#qcm-form + button.action-btn');
      if (checkAnswersButton && !(checkAnswersButton as any).listenerAttached) {
        const qcmResultEl = document.getElementById('qcm-result');
        (checkAnswersButton as any).listenerAttached = true; 
        checkAnswersButton.addEventListener('click', () => {
          if (qcmResultEl) {
            qcmResultEl.textContent = 'Vérification des réponses simulée. Dans une vraie application, les réponses seraient validées ici.';
            toast({title: "QCM", description: "Vérification simulée des réponses."});
          }
        });
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
                  <OptionCard icon="📋" title="Résumé classique" description="Points clés structurés" value="resume" selected={selectedOutputFormat === 'resume'} onSelect={setSelectedOutputFormat} />
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
                <CardContent className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-6 result-content-area" dangerouslySetInnerHTML={{ __html: summaryResult.content }} />
              </Card>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button onClick={downloadResult} variant="default"><Download className="mr-2 h-5 w-5" />Télécharger (.txt)</Button>
                <Button onClick={shareResult} variant="outline" className="text-foreground"><Share2 className="mr-2 h-5 w-5" />Partager</Button>
                <Button onClick={() => toast({ title: "Fonctionnalité en développement", description: "L'export PDF sera bientôt disponible. En attendant, vous pouvez télécharger le résumé en .txt."})} variant="outline" className="text-foreground"><FileText className="mr-2 h-5 w-5" />Export PDF</Button>
                <Button onClick={() => toast({ title: "Fonctionnalité en développement", description: "La lecture audio du résumé sera bientôt disponible."})} variant="outline" className="text-foreground"><AudioWaveform className="mr-2 h-5 w-5" />Version audio</Button>
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
      `}</style>
    </section>
  );
}

