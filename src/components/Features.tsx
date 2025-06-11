import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Target, Shuffle, Smartphone, Languages } from 'lucide-react';

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
];

export function Features() {
  return (
    <section id="fonctionnalites" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold font-headline text-center mb-12">
          Pourquoi choisir Résumé IA ?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuresData.map((feature, index) => (
            <Card key={index} className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
              <CardHeader>
                <div className="flex justify-center mb-4">{feature.icon}</div>
                <CardTitle className="text-2xl font-headline">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
