import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  ExternalLink,
  Shield,
  FileText,
  KeyRound,
  Info,
  X,
  Eye,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { TikTokUrlVerificationCard } from './TikTokUrlVerificationCard';

interface TikTokDeveloperPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

export const TikTokDeveloperPortalModal: React.FC<TikTokDeveloperPortalModalProps> = ({
  isOpen,
  onClose,
  onOpenTerms,
  onOpenPrivacy,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-dev-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app';

  const urls = [
    {
      id: 'terms',
      title: "URL des Conditions Générales d'Utilisation (Terms of Service URL)",
      description: 'À coller dans le champ "Terms of Service URL" de votre application Resonantia.',
      url: `${baseUrl}/terms`,
      onView: onOpenTerms,
    },
    {
      id: 'privacy',
      title: 'URL de la Politique de Confidentialité (Privacy Policy URL)',
      description: 'À coller dans le champ "Privacy Policy URL" de votre application Resonantia.',
      url: `${baseUrl}/privacy`,
      onView: onOpenPrivacy,
    },
    {
      id: 'web',
      title: 'Configure for Web (Web / Desktop URL)',
      description: 'À coller dans le champ "Web/Desktop URL" (Configure for Web).',
      url: `${baseUrl}/`,
      onView: null,
    },
    {
      id: 'redirect',
      title: 'URL de Redirection OAuth (Redirect URI)',
      description: 'À enregistrer dans Login Kit → Redirect URI (sans le mot TikTok dans l’URL).',
      url: `${baseUrl}/api/auth/callback`,
      onView: null,
    },
  ];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-zinc-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-zinc-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800/70 flex items-center justify-between bg-gradient-to-r from-zinc-900 to-zinc-800 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black text-lg shadow-sm">
              R
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg tracking-tight">
                Ressources &amp; URLs Officielles Resonantia
              </h2>
              <p className="text-xs text-zinc-300">
                Logo officiel 1024×1024 px &amp; URLs conformes pour la soumission Web
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-zinc-200 text-sm">
          {/* Explanation Alert for iFrame / URL access */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm space-y-2">
            <div className="font-bold flex items-center gap-2 text-amber-950">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Pourquoi vous ne pouviez pas taper /terms dans votre navigateur ?</span>
            </div>
            <p className="leading-relaxed text-amber-300/90 text-xs">
              L'application s'exécute dans un conteneur sécurisé (iFrame) au sein de Google AI Studio. La barre d'adresse tout en haut de votre navigateur appartient à la plateforme Google et non à l'application.
            </p>
            <p className="leading-relaxed text-amber-300/90 text-xs">
              <strong>Solution :</strong> Vous pouvez consulter directement les CGU et la Politique de Confidentialité en cliquant sur les boutons <strong>« Lire dans l'app »</strong> ci-dessous, ou copier les URLs officielles pour les soumettre au portail TikTok !
            </p>
          </div>

          {/* TikTok URL Ownership Verification Tool ('Verify URL properties') */}
          <TikTokUrlVerificationCard />

          {/* Section 1: Logo 1024x1024 */}
          <div className="bg-zinc-950/50 rounded-2xl p-4 sm:p-5 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-zinc-50 text-sm flex items-center gap-2">
                  <span>Logo Officiel de l'Application</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    1024 × 1024 px
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Format carré haute résolution requis par TikTok Developer Portal pour l'icône de l'app.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
              {/* Logo Preview */}
              <div className="relative group shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-zinc-800 shadow-md bg-zinc-900">
                  <img
                    src="/logo-1024.png"
                    alt="Logo Resonantia 1024x1024"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-white font-bold bg-black/60 px-2 py-1 rounded-md">
                    1024 × 1024 px
                  </span>
                </div>
              </div>

              {/* Actions & details */}
              <div className="space-y-2.5 flex-1 w-full text-xs">
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 font-mono bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                  <div>Dimensions : <strong>1024 x 1024 px</strong></div>
                  <div>Format : <strong>PNG 24-bit / JPEG</strong></div>
                  <div>Usage : <strong>Icône App Resonantia</strong></div>
                  <div>Statut : <strong>Validé conforme</strong></div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="/api/download-logo"
                    download="resonantia_logo_1024x1024.png"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs shadow-sm shadow-black/20 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger Logo PNG (1024x1024)</span>
                  </a>

                  <a
                    href="/api/download-logo-jpg"
                    download="resonantia_logo_1024x1024.jpg"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800/80 text-zinc-200 border border-zinc-800 font-semibold text-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger en JPG</span>
                  </a>

                  <a
                    href="/logo-1024.png"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-zinc-400 hover:text-zinc-100 text-xs transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Plein écran</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: URLs for TikTok Developer Portal */}
          <div className="space-y-3">
            <h3 className="font-bold text-zinc-50 text-sm flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-rose-400" />
              <span>URLs Officielles Resonantia (sans mention de marque tierce)</span>
            </h3>

            <div className="space-y-3">
              {urls.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-sm shadow-black/20 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-bold text-xs sm:text-sm text-zinc-50">
                      {item.title}
                    </span>
                    {item.onView && (
                      <button
                        onClick={() => {
                          onClose();
                          item.onView();
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer self-start sm:self-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lire le document dans l'app</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-normal">
                    {item.description}
                  </p>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-zinc-950/50 px-3 py-2 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-100 truncate select-all">
                      {item.url}
                    </div>

                    <button
                      onClick={() => handleCopy(item.url, item.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                        copiedKey === item.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white'
                      }`}
                    >
                      {copiedKey === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-950/50 border-t border-zinc-800/70 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Tous les documents et visuels sont prêts pour soumission</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-300 font-bold text-zinc-200 transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
