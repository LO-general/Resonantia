import React from 'react';
import { Cookie, ShieldCheck } from 'lucide-react';

export type CookieConsentChoice = 'accepted' | 'essential_only';

export const COOKIE_CONSENT_STORAGE_KEY = 'tiktok_cm_cookie_consent_v1';

export function getStoredCookieConsent(): CookieConsentChoice | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.choice === 'accepted' || parsed?.choice === 'essential_only') {
      return parsed.choice;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveCookieConsent(choice: CookieConsentChoice): void {
  try {
    localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({ choice, updatedAt: new Date().toISOString() })
    );
    if (typeof document !== 'undefined') {
      document.cookie = `tk_cm_consent=${choice}; path=/; max-age=15552000; SameSite=Lax`;
    }
  } catch {
    // ignore
  }
}

interface CookieConsentBannerProps {
  visible: boolean;
  onSelect: (choice: CookieConsentChoice) => void;
  onOpenPrivacy?: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  visible,
  onSelect,
  onOpenPrivacy,
}) => {
  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Gestion des cookies"
      className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-lg z-50 surface p-5 sm:p-6 shadow-2xl border border-zinc-700/80 bg-zinc-950/95 backdrop-blur-xl animate-pop"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
          <Cookie className="w-5 h-5" />
        </div>
        <div className="space-y-2.5 min-w-0">
          <div className="space-y-1">
            <h2 className="font-['Fraunces',Georgia,serif] text-lg font-semibold text-white leading-snug">
              Voulez-vous accepter les cookies ?
            </h2>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Sur Internet, les cookies et le stockage sécurisé permettent de garder votre session
              ouverte, de protéger l’accès à votre espace personnel et de mémoriser vos préférences.
              Aucune donnée n’est revendue à des régies publicitaires.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Authentification et préférences protégées.</span>
            {onOpenPrivacy && (
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="text-amber-300 hover:text-amber-200 underline underline-offset-2 cursor-pointer ml-1"
              >
                En savoir plus
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSelect('essential_only')}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
            >
              Essentiels uniquement
            </button>
            <button
              type="button"
              onClick={() => onSelect('accepted')}
              className="btn-brand px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              Accepter les cookies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
