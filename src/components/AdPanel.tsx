
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Image as ImageIcon, Video as VideoIcon, UploadCloud } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function AdPanel() {
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setMediaType('image'); // Assume image for file upload for now
    }
  };

  const handleAddMedia = () => {
    // Logique de soumission (pour l'instant, affiche juste un toast)
    console.log({ mediaType, file, videoUrl, title, description });
    toast({
      title: "Média soumis (simulation)",
      description: `Type: ${mediaType}, Titre: ${title || 'N/A'}`,
    });
    // Réinitialiser les états et fermer la dialog
    setMediaType(null);
    setFile(null);
    setVideoUrl('');
    setTitle('');
    setDescription('');
    setIsDialogOpen(false);
  };

  const resetForm = () => {
    setMediaType(null);
    setFile(null);
    setVideoUrl('');
    setTitle('');
    setDescription('');
  }

  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Card className="w-full h-64 md:h-80 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 dark:from-primary/20 dark:via-primary/10 dark:to-accent/20 border-2 border-dashed border-primary/30 hover:border-primary/70 transition-all duration-300 ease-in-out cursor-pointer group shadow-lg hover:shadow-xl hover:shadow-primary/20">
              <CardContent className="flex flex-col items-center justify-center h-full text-center p-6">
                <PlusCircle className="h-20 w-20 md:h-28 md:w-28 text-primary/70 group-hover:text-primary group-hover:scale-110 transition-all duration-300 ease-in-out mb-4" />
                <h3 className="text-xl md:text-2xl font-semibold text-foreground group-hover:text-primary transition-colors">
                  Ajouter votre propre contenu
                </h3>
                <p className="text-muted-foreground mt-1 text-sm md:text-base">
                  Cliquez ici pour uploader des images, des vidéos ou partager des liens.
                </p>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl">Ajouter un nouveau média</DialogTitle>
              <DialogDescription>
                Sélectionnez le type de média que vous souhaitez ajouter et remplissez les informations.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="flex justify-around gap-4">
                <Button
                  variant={mediaType === 'image' ? 'default' : 'outline'}
                  onClick={() => setMediaType('image')}
                  className={cn("flex-1 py-6 text-base", mediaType === 'image' && "ring-2 ring-primary shadow-md")}
                >
                  <ImageIcon className="mr-2 h-5 w-5" /> Image
                </Button>
                <Button
                  variant={mediaType === 'video' ? 'default' : 'outline'}
                  onClick={() => setMediaType('video')}
                  className={cn("flex-1 py-6 text-base", mediaType === 'video' && "ring-2 ring-primary shadow-md")}
                >
                  <VideoIcon className="mr-2 h-5 w-5" /> Vidéo (URL)
                </Button>
              </div>

              {mediaType === 'image' && (
                <div className="space-y-3">
                  <Label htmlFor="media-file" className="text-base font-medium">Fichier image</Label>
                  <div className="flex items-center justify-center w-full">
                      <label
                          htmlFor="media-file"
                          className="flex flex-col items-center justify-center w-full h-40 border-2 border-border border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/75"
                      >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                              <p className="mb-2 text-sm text-muted-foreground">
                                  <span className="font-semibold">Cliquez pour uploader</span> ou glissez-déposez
                              </p>
                              <p className="text-xs text-muted-foreground">PNG, JPG, GIF (MAX. 5MB)</p>
                          </div>
                          <Input id="media-file" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/gif" />
                      </label>
                  </div>
                  {file && <p className="text-sm text-muted-foreground">Fichier sélectionné : {file.name}</p>}
                </div>
              )}

              {mediaType === 'video' && (
                <div className="space-y-3">
                  <Label htmlFor="video-url" className="text-base font-medium">URL de la vidéo</Label>
                  <Input
                    id="video-url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="h-11"
                  />
                </div>
              )}

              {(mediaType === 'image' && file) || (mediaType === 'video' && videoUrl) ? (
                <>
                  <div className="space-y-3">
                    <Label htmlFor="media-title" className="text-base font-medium">Titre (optionnel)</Label>
                    <Input
                      id="media-title"
                      placeholder="Ex: Ma superbe image de paysage"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="media-description" className="text-base font-medium">Description (optionnel)</Label>
                    <Textarea
                      id="media-description"
                      placeholder="Décrivez brièvement votre média..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                </>
              ) : null }
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </DialogClose>
              <Button type="button" onClick={handleAddMedia} disabled={!mediaType || (mediaType === 'image' && !file) || (mediaType === 'video' && !videoUrl)}>
                Ajouter Média
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
