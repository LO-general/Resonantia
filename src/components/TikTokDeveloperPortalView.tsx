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
  Eye,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

import { TikTokUrlVerificationCard } from './TikTokUrlVerificationCard';

interface TikTokDeveloperPortalViewProps {
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

export const TikTokDeveloperPortalView: React.FC<TikTokDeveloperPortalViewProps> = ({
  onOpenTerms,
  onOpenPrivacy,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-dev-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app';

  const urls = [
    {
      id: 'terms',
      title: "1. Conditions Générales d'Utilisation (Terms of Service URL)",
      description: 'Champ obligatoire dans App Details > Terms of Service URL.',
      url: `${baseUrl}/terms`,
      onView: onOpenTerms,
    },
    {
      id: 'privacy',
      title: '2. Politique de Confidentialité (Privacy Policy URL)',
      description: 'Champ obligatoire dans App Details > Privacy Policy URL.',
      url: `${baseUrl}/privacy`,
      onView: onOpenPrivacy,
    },
    {
      id: 'web',
      title: '3. Configure for Web (Web / Desktop URL)',
      description: 'Adresse principale de l’application Resonantia à renseigner dans Configure for Web.',
      url: `${baseUrl}/`,
      onView: null,
    },
    {
      id: 'redirect',
      title: '4. URI de Redirection OAuth (Redirect URI / Callback)',
      description: 'À inscrire dans Login Kit > Redirect URI (URL neutre sans marque tierce).',
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
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Page Title Header */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-zinc-700/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Ressources Web &amp; Conformité &bull; Resonantia</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ressources &amp; URLs Officielles
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-xl leading-relaxed">
              Retrouvez ici le logo officiel <strong>1024 × 1024 px</strong>, les adresses publiques stables sans mention de marque tierce, et la vérification de domaine.
            </p>
          </div>

          <div className="flex sm:flex-col gap-2 shrink-0">
            <button
              onClick={onOpenTerms}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/10 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Lire les CGU</span>
            </button>
            <button
              onClick={onOpenPrivacy}
              className="px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Lire Confidentialité</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Tool: Solve 'This URL is not verified. Verify URL properties' */}
      <TikTokUrlVerificationCard />

      {/* Notice Explanation for Browser URL vs iFrame */}
      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm space-y-2.5 shadow-sm shadow-black/20">
        <div className="font-bold flex items-center gap-2 text-amber-950 text-sm">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Pourquoi vous ne pouviez pas taper /terms ou /privacy dans votre navigateur ?</span>
        </div>
        <p className="leading-relaxed text-amber-300/90 text-xs sm:text-sm">
          Dans Google AI Studio, l'application est encapsulée dans une fenêtre isolée (<strong>iFrame</strong>). Lorsque vous regardez la barre d'adresse tout en haut de votre écran, vous voyez l'adresse de Google AI Studio, pas celle de votre application. Si vous ajoutez <code>/terms</code> à cette adresse, vous quittez l'application.
        </p>
        <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-amber-950">Accès direct dans l'application :</span>
          <button
            onClick={onOpenTerms}
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-200 font-bold text-amber-950 underline cursor-pointer"
          >
            Consulter les CGU (/terms)
          </button>
          <button
            onClick={onOpenPrivacy}
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-200 font-bold text-amber-950 underline cursor-pointer"
          >
            Consulter la Confidentialité (/privacy)
          </button>
        </div>
      </div>

      {/* Section 1: Logo 1024x1024 */}
      <div className="bg-zinc-900/70 rounded-3xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/70 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-zinc-50 flex items-center gap-2">
              <span>Logo Officiel en 1024 × 1024 px</span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Format Officiel Conforme
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Icône carrée haute définition prête pour le téléversement dans le portail TikTok Developer.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Logo Preview */}
          <div className="relative group shrink-0">
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden border-2 border-zinc-800 shadow-lg bg-zinc-900 flex items-center justify-center">
              <img
                src="/logo-1024.png"
                alt="Logo 1024x1024 Resonantia"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-sm text-white text-[10px] font-mono text-center py-1 rounded-lg">
              1024 × 1024 px &bull; PNG / JPEG
            </div>
          </div>

          {/* Details & Actions */}
          <div className="space-y-4 flex-1 w-full">
            <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Résolution</span>
                <span className="font-bold text-zinc-100 font-mono">1024 x 1024 pixels</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Format Fichier</span>
                <span className="font-bold text-zinc-100 font-mono">PNG 24-bit / JPEG</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Ratio</span>
                <span className="font-bold text-zinc-100 font-mono">1:1 (Carré parfait)</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Contrôle Qualité</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Format Validé
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/api/download-logo"
                download="resonantia_logo_1024x1024.png"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs shadow-md shadow-zinc-900/10 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-rose-400" />
                <span>Télécharger le Logo (1024x1024 PNG)</span>
              </a>

              <a
                href="/api/download-logo-jpg"
                download="resonantia_logo_1024x1024.jpg"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-800/60 text-zinc-200 border border-zinc-800 font-bold text-xs transition cursor-pointer shadow-sm shadow-black/20"
              >
                <Download className="w-4 h-4 text-zinc-500" />
                <span>Télécharger en JPEG</span>
              </a>

              <a
                href="/logo-1024.png"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-zinc-50 text-xs font-semibold transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Aperçu plein écran</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: URLs for Web Configuration */}
      <div className="bg-zinc-900/70 rounded-3xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-6">
        <div className="border-b border-zinc-800/70 pb-4">
          <h2 className="text-lg font-extrabold text-zinc-50 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-rose-400" />
            <span>URLs Officielles Resonantia</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Ces 4 adresses sont publiques, directement accessibles et ne contiennent aucune marque tierce.
          </p>
        </div>

        <div className="space-y-4">
          {urls.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 rounded-2xl bg-zinc-950/50 border border-zinc-800 space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-extrabold text-xs sm:text-sm text-zinc-50">
                  {item.title}
                </span>
                {item.onView && (
                  <button
                    onClick={item.onView}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 cursor-pointer self-start sm:self-auto py-1 px-2.5 rounded-lg hover:bg-rose-500/10 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Consulter le texte dans l'app</span>
                  </button>
                )}
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                {item.description}
              </p>

              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 bg-zinc-900/70 px-3.5 py-2.5 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-100 truncate select-all shadow-sm shadow-black/20">
                  {item.url}
                </div>

                <button
                  onClick={() => handleCopy(item.url, item.id)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer shadow-sm shadow-black/20 ${
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
  );
};
