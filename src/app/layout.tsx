
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SettingsProvider } from '@/contexts/SettingsContext'; // Import SettingsProvider

export const metadata: Metadata = {
  title: 'ResumAI - Résumez tout en quelques secondes',
  description: 'Documents PDF, vidéos YouTube, cours... Notre IA transforme vos contenus en résumés clairs et exploitables',
  icons: {
    icon: '/favico.png',
    apple: '/favico.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function getInitialTheme() {
                  if (typeof window !== 'undefined' && window.localStorage) {
                    const storedTheme = window.localStorage.getItem('theme');
                    if (storedTheme === 'light' || storedTheme === 'dark') {
                      return storedTheme;
                    }
                    // const systemPreference = window.matchMedia('(prefers-color-scheme: dark)');
                    // if (systemPreference.matches) {
                    //   return 'dark';
                    // }
                  }
                  return 'light'; // Default theme
                }
                const theme = getInitialTheme();
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
        {/* Google AdSense Script for Site Verification and Ad Serving */}
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9832899883717423"
     crossOrigin="anonymous"></script>
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <AuthProvider>
          <ThemeProvider>
            <SettingsProvider> {/* Wrap with SettingsProvider */}
              {children}
              <Toaster />
            </SettingsProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
