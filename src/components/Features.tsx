
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Target, Shuffle, Smartphone, Languages, QrCode } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

const featuresData = [
  {
    icon: <Zap className="h-12 w-12 text-primary" />,
    title: "Ultra-rapide",
    description: "Résumés générés en moins de 30 secondes grâce à notre IA optimisée.",
  },
  {
    icon: <Target className="h-12 w-12 text-primary" />,
    title: "Précision maximale",
    description: "Extraction intelligente des points clés et informations essentielles.",
  },
  {
    icon: <Shuffle className="h-12 w-12 text-primary" />,
    title: "Formats multiples",
    description: "PDF, YouTube, texte... Résumez tous vos contenus en un clic.",
  },
  {
    icon: <Smartphone className="h-12 w-12 text-primary" />,
    title: "Multi-supports",
    description: "Fiches de révision, audio, QCM... Adaptez selon vos besoins.",
  },
  {
    icon: <Languages className="h-12 w-12 text-primary" />,
    title: "Traduction multilingue",
    description: "Traduisez vos résumés dans la langue de votre choix.",
  },
  {
    icon: <QrCode className="h-12 w-12 text-primary" />,
    title: "Partagez Facilement",
    description: "Scannez ce QR code pour visiter ou partager notre site :",
    isQrCodeFeature: true,
  },
];

export function Features() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const siteUrl = window.location.origin;
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(siteUrl)}`);
    }
  }, []);

  return (
    <section id="fonctionnalites" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold font-headline text-center mb-12">
          Pourquoi choisir Résumé IA ?
        </h2>
        {/* Conteneur modifié pour le défilement horizontal sur mobile */}
        <div className={cn(
          "flex overflow-x-auto space-x-4 pb-4 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-primary/10", // Mobile: flex, défilement horizontal
          "md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-8 md:space-x-0 md:pb-0 md:overflow-x-visible" // Tablette et plus: grille
        )}>
          {featuresData.map((feature, index) => (
            <Card 
              key={index} 
              className={cn(
                "flex-shrink-0 w-[280px] sm:w-[300px]", // Largeur fixe pour les cartes en mode défilement
                "md:w-auto", // Largeur auto pour la grille
                "text-center shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1 flex flex-col"
              )}
            >
              <CardHeader>
                <div className="flex justify-center mb-4">{feature.icon}</div>
                <CardTitle className="text-2xl font-headline">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-center">
                <p className="text-muted-foreground">{feature.description}</p>
                {feature.isQrCodeFeature && qrCodeUrl && (
                  <div className="mt-4 flex justify-center">
                    <img src={qrCodeUrl} alt="QR Code pour partager le site" width="128" height="128" className="rounded-md shadow-md" />
                  </div>
                )}
                {feature.isQrCodeFeature && !qrCodeUrl && (
                  <div className="mt-4 flex justify-center text-sm text-muted-foreground">
                    Chargement du QR code...
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {/* Style pour la barre de défilement (optionnel mais améliore l'apparence) */}
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
      `}</style>
    </section>
  );
}
