export function Hero() {
  return (
    <section id="accueil" className="py-16 md:py-24 text-center text-white bg-[linear-gradient(135deg,theme(colors.primary.DEFAULT)_0%,#764ba2_100%)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline mb-6 text-shadow-lg">
          📚 Résumez tout en quelques secondes
        </h1>
        <p className="text-lg md:text-xl lg:text-2xl mb-10 opacity-90 max-w-3xl mx-auto">
          Documents PDF, vidéos YouTube, cours... Notre IA transforme vos contenus en résumés clairs et exploitables.
        </p>
        <a
          href="#upload-section"
          className="inline-block bg-[linear-gradient(45deg,#ff6b6b,#ee5a24)] hover:opacity-90 text-white px-8 py-4 rounded-full text-lg font-bold font-headline transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl transform hover:-translate-y-1"
        >
          Commencer gratuitement
        </a>
      </div>
    </section>
  );
}
