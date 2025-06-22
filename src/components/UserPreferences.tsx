
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Settings, Sun, Moon, Languages as LanguagesIcon, Bell } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Switch } from '@/components/ui/switch';
import { useSettings, type AppLanguage } from '@/contexts/SettingsContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function UserPreferences() {
  const { theme, toggleTheme } = useTheme();
  const {
    defaultLanguage,
    setDefaultLanguage,
    notificationPreferences,
    setNotificationPreference
  } = useSettings();

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center"><Settings className="mr-3 h-7 w-7 text-primary" />Préférences</CardTitle>
        <CardDescription>Personnalisez l'apparence et le comportement de l'application.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
         <div className="flex items-center justify-between p-4 bg-muted/20 dark:bg-muted/10 rounded-lg border border-border">
          <div className="flex items-center">
            {theme === 'light' ? <Sun className="mr-3 h-6 w-6 text-yellow-500" /> : <Moon className="mr-3 h-6 w-6 text-sky-400" />}
            <Label htmlFor="theme-switch" className="text-base font-medium">
              Thème {theme === 'light' ? 'Clair' : 'Sombre'}
            </Label>
          </div>
          <Switch
            id="theme-switch"
            checked={theme === 'dark'}
            onCheckedChange={toggleTheme}
            aria-label="Changer de thème"
          />
        </div>

        <div className="p-4 bg-muted/20 dark:bg-muted/10 rounded-lg border border-border space-y-3">
          <div className="flex items-center">
              <LanguagesIcon className="mr-3 h-6 w-6 text-blue-500" />
              <Label htmlFor="default-language-select" className="text-base font-medium">
                  Langue par défaut (pour les résumés)
              </Label>
          </div>
          <Select value={defaultLanguage} onValueChange={(value) => setDefaultLanguage(value as AppLanguage)}>
              <SelectTrigger id="default-language-select" className="w-full">
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
          <p className="text-xs text-muted-foreground">
              Cette langue sera présélectionnée lors de la génération de nouveaux résumés.
          </p>
        </div>

        <div className="p-4 bg-muted/20 dark:bg-muted/10 rounded-lg border border-border space-y-4">
          <div className="flex items-center mb-2">
              <Bell className="mr-3 h-6 w-6 text-green-500" />
              <h4 className="text-base font-medium">Préférences de notification</h4>
          </div>
          <div className="flex items-center justify-between">
              <Label htmlFor="download-notif-switch" className="flex-1 cursor-pointer">
                  Notifications de téléchargement réussi
              </Label>
              <Switch
                  id="download-notif-switch"
                  checked={notificationPreferences.downloadSuccess}
                  onCheckedChange={(checked) => setNotificationPreference('downloadSuccess', checked)}
                  aria-label="Activer/Désactiver les notifications de téléchargement"
              />
          </div>
           <div className="flex items-center justify-between">
              <Label htmlFor="share-notif-switch" className="flex-1 cursor-pointer">
                  Notifications de partage/copie réussi
              </Label>
              <Switch
                  id="share-notif-switch"
                  checked={notificationPreferences.shareSuccess}
                  onCheckedChange={(checked) => setNotificationPreference('shareSuccess', checked)}
                  aria-label="Activer/Désactiver les notifications de partage"
              />
          </div>
          <p className="text-xs text-muted-foreground">
              Gérez les notifications (pop-ups) que vous recevez pour certaines actions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
