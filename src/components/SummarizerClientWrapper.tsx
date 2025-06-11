"use client";

import type { ChangeEvent, DragEvent } from 'react';
import { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, UploadCloud, FileText, Youtube, AlignLeft, ListChecks, BookOpen, AudioWaveform, Download, Share2, Plus, AlertCircle } from 'lucide-react';
import { generateSummaryAction, type SummaryResult } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

type InputType = "pdf" | "video" | "text";
type OutputFormat = "resume" | "fiche" | "qcm" | "audio";

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
      currentInputValue = pdfFile.name; // Pass filename for mock processing
    } else if (activeTab === "video") {
      if (!videoUrl.trim()) {
        setError("Veuillez entrer une URL YouTube.");
        setIsProcessing(false);
        return;
      }
      currentInputValue = videoUrl;
    } else if (activeTab === "text") {
      if (!inputText.trim()) {
        setError("Veuillez entrer du texte à résumer.");
        setIsProcessing(false);
        return;
      }
      if (inputText.trim().length < 50) { // Reduced from 100 for easier testing
         setError("Le texte doit contenir au moins 50 caractères.");
         setIsProcessing(false);
         return;
      }
      currentInputValue = inputText;
    }

    try {
      const result = await generateSummaryAction(currentInputType, currentInputValue, selectedOutputFormat);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadResult = () => {
    if (!summaryResult || !summaryResult.content) return;
    // Create a temporary element to parse HTML and get text
    const tempEl = document.createElement('div');
    tempEl.innerHTML = summaryResult.content;
    const textContent = tempEl.textContent || tempEl.innerText || "";
    
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-${selectedOutputFormat}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Téléchargé", description: "Le résumé a été téléchargé." });
  };

  const shareResult = async () => {
    if (!summaryResult || !summaryResult.content) return;
    const tempEl = document.createElement('div');
    tempEl.innerHTML = summaryResult.content;
    const textContent = tempEl.textContent || tempEl.innerText || "";

    if (navigator.share) {
      try {
        await navigator.share({
          title: summaryResult.title || 'Mon résumé IA',
          text: textContent.substring(0, 200) + '...',
        });
        toast({ title: "Partagé", description: "Résumé partagé avec succès." });
      } catch (err) {
        toast({ title: "Erreur de partage", description: "Impossible de partager le résumé.", variant: "destructive" });
      }
    } else {
      try {
        await navigator.clipboard.writeText(textContent);
        toast({ title: "Copié", description: "Résumé copié dans le presse-papiers!" });
      } catch (err) {
        toast({ title: "Erreur de copie", description: "Impossible de copier le résumé.", variant: "destructive" });
      }
    }
  };
  
  // For QCM button
  useEffect(() => {
    if (summaryResult && selectedOutputFormat === 'qcm' && typeof window !== 'undefined') {
      const checkAnswersButton = document.querySelector('#qcm-form + button');
      if (checkAnswersButton && !(checkAnswersButton as any).listenerAttached) {
        const qcmResultEl = document.getElementById('qcm-result');
        (checkAnswersButton as any).listenerAttached = true; // Mark as listener attached
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
              
              {error && (
                <div className="mb-4 p-4 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <p>{error}</p>
                </div>
              )}

              <Button onClick={handleSubmit} size="lg" className="w-full text-lg py-6 font-headline bg-[linear-gradient(45deg,#ff6b6b,#ee5a24)] hover:opacity-90">
                {activeTab === "pdf" ? "Analyser le PDF" : activeTab === "video" ? "Analyser la vidéo" : "Résumer le texte"}
              </Button>
            </>
          )}

          {isProcessing && (
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
                <Button onClick={downloadResult} variant="outlinePrimary" className="bg-primary text-primary-foreground hover:bg-primary/90"><Download className="mr-2 h-5 w-5" />Télécharger</Button>
                <Button onClick={shareResult} variant="outline" className="text-foreground"><Share2 className="mr-2 h-5 w-5" />Partager</Button>
                <Button onClick={() => toast({ title: "Fonctionnalité en développement", description: "L'export PDF sera bientôt disponible."})} variant="outline" className="text-foreground"><FileText className="mr-2 h-5 w-5" />Export PDF</Button>
                <Button onClick={() => toast({ title: "Fonctionnalité en développement", description: "La version audio sera bientôt disponible."})} variant="outline" className="text-foreground"><AudioWaveform className="mr-2 h-5 w-5" />Version audio</Button>
                <Button onClick={handleNewSummary} variant="secondary"><Plus className="mr-2 h-5 w-5" />Nouveau résumé</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <style jsx global>{`
        .result-content-area ul, .result-content-area ol {
          list-style-position: inside;
          padding-left: 1.5em; /* Adjust as needed */
          margin-left: 0; /* Reset default browser margin */
        }
        .result-content-area ul li, .result-content-area ol li {
          margin-bottom: 0.5em;
        }
        .result-content-area h4 {
          font-size: 1.25em; /* Example size, adjust as needed */
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
         .result-content-area p {
          margin-bottom: 1em;
        }
        .action-btn { /* For dynamically added QCM button */
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
