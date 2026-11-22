import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  Users,
  Video,
  Heart,
  AlertCircle,
  LayoutDashboard,
} from 'lucide-react';
import { TikTokAccountData, ActiveTab, TikTokOfficialVideo } from '../types';
import { TikTokAccountConnector, TikTokProfile } from './TikTokAccountConnector';

interface TikTokConnectionPageProps {
  userId?: string;
  onNavigateNext: () => void;
  onNavigateBack: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onAccountConnected?: (account: TikTokAccountData | TikTokProfile | null) => void;
  onVideosSynced?: (videos: TikTokOfficialVideo[], account?: TikTokAccountData | null) => void;
}

const getScopedAccountKey = (uid?: string) =>
  uid ? `tiktok_connected_profile_${uid}` : 'tiktok_connected_profile';

export const TikTokConnectionPage: React.FC<TikTokConnectionPageProps> = ({
  userId,
  onNavigateNext,
  onNavigateBack,
  onNavigateTab,
  onAccountConnected,
  onVideosSynced,
}) => {
  const [account, setAccount] = useState<TikTokAccountData | null>(null);
  const [publicProfile, setPublicProfile] = useState<TikTokProfile | null>(null);
  const [redirectingNext, setRedirectingNext] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(getScopedAccountKey(userId));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.openId) {
          setAccount(parsed);
        } else if (parsed.handle) {
          setPublicProfile(parsed);
        }
      }
    } catch (e) {
      console.warn('Error reading account:', e);
    }
  }, [userId]);

  const handleAccountChange = (acc: TikTokAccountData | TikTokProfile | null) => {
    if (!acc) {
      setAccount(null);
      setPublicProfile(null);
      onAccountConnected?.(null);
      return;
    }
    if ('openId' in acc && acc.openId) {
      setAccount(acc as TikTokAccountData);
      setPublicProfile(null);
      onAccountConnected?.(acc);
    } else {
      setPublicProfile(acc as TikTokProfile);
      onAccountConnected?.(acc);
    }
  };

  const handleSyncComplete = (videos: TikTokOfficialVideo[]) => {
    onVideosSynced?.(videos, account);
    setRedirectingNext(true);
    setTimeout(() => {
      onNavigateNext();
    }, 800);
  };

  const isConnected = !!account || !!publicProfile;

  return (
    <div className="relative min-h-screen w-full bg-zinc-950 text-white font-sans selection:bg-rose-500/30 selection:text-white pb-20 overflow-x-hidden">
      {/* Ambient background glows matching Étape 1 & 2 */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-10 w-[32rem] h-[32rem] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-10">
        {/* Discreet Top Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl px-5 py-3.5 backdrop-blur-md">
          {/* Stepper */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-medium w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {/* Step 1 : Resonantia */}
            <button
              onClick={onNavigateBack}
              className="flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-zinc-800 px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-rose-400" />
              <span>Resonantia</span>
            </button>

            <span className="text-zinc-700 shrink-0">&rarr;</span>

            {/* Step Connexion - Active */}
            <div className="flex items-center gap-2 bg-rose-500/15 text-rose-300 border border-rose-500/40 px-3.5 py-1.5 rounded-xl font-bold shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              <span>Connexion du compte</span>
            </div>

            <span className="text-zinc-700 shrink-0">&rarr;</span>

            {/* Step 2 */}
            <button
              onClick={onNavigateNext}
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0"
            >
              <span>Comprendre l’attention humaine</span>
            </button>

            <span className="text-zinc-800 shrink-0">&bull;</span>
            <button
              onClick={() => onNavigateTab('dashboard')}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 px-2.5 py-1.5 rounded-xl transition cursor-pointer shrink-0"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tableau de bord</span>
            </button>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-2 shrink-0 text-xs">
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {account?.username
                    ? `Compte relié : @${account.username.replace('@', '')}`
                    : publicProfile?.handle
                    ? `Compte relié : @${publicProfile.handle.replace('@', '')}`
                    : 'Compte relié'}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/60 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Connexion en attente</span>
              </span>
            )}
          </div>
        </div>

        {/* Title Banner */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-rose-300">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>Connexion Multi-Comptes &middot; Données Réelles</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
            CONNECTE TON COMPTE CRÉATEUR
          </h1>
          <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            Chaque utilisateur relie son propre compte de façon isolée afin que <strong>Mon Coach</strong> et <strong>Analytics</strong> disposent déjà de toutes tes vraies données dès ton arrivée.
          </p>
        </div>

        {redirectingNext && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-center text-sm text-emerald-200 font-semibold">
            Compte synchronisé ! Redirection vers « Comprendre ce qui retient vraiment l’attention humaine »…
          </div>
        )}

        {/* TikTok Account Connector Card */}
        <div className="surface p-6 sm:p-8">
          <TikTokAccountConnector
            userId={userId}
            onAccountChange={handleAccountChange}
            onSyncComplete={handleSyncComplete}
          />
        </div>

        {/* Bottom Navigation CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-800">
          <button
            onClick={onNavigateBack}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-rose-400" />
            <span>Revenir à Resonantia</span>
          </button>

          <button
            onClick={onNavigateNext}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-rose-950/50 hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-0.5 flex items-center justify-center gap-3 cursor-pointer"
          >
            <span>
              {isConnected
                ? 'Continuer : Comprendre ce qui retient vraiment l’attention humaine'
                : 'Continuer vers l’étape suivante'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
