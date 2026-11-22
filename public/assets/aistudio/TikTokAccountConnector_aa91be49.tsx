import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Key,
  RefreshCw,
  Sparkles,
  Lock,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Users,
  Heart,
  Video,
  Copy,
  Check,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TikTokAccountData, TikTokApiConfigStatus, TikTokOfficialVideo } from '../types';
import { saveTikTokAccountToFirestore, saveTikTokVideosToFirestore } from '../services/firebase';

export interface TikTokProfile {
  handle: string;
  authorName: string;
  profileUrl: string;
  isVerifiedOnTikTok: boolean;
  connectedAt: string;
  openId?: string;
  isOAuthConnected?: boolean;
}

interface TikTokAccountConnectorProps {
  onAccountChange?: (account: TikTokAccountData | TikTokProfile | null) => void;
  onSyncComplete?: (videos: TikTokOfficialVideo[], summary: any) => void;
  className?: string;
}

const STORAGE_KEY = 'tiktok_connected_profile';
const DEV_CALLBACK_URL = 'https://ais-dev-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app/api/tiktok/callback';
const SHARED_CALLBACK_URL = 'https://ais-pre-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app/api/tiktok/callback';
const STUDIO_CALLBACK_URL = 'https://tiktok-content-manager.ai.studio/api/tiktok/callback';

export const TikTokAccountConnector: React.FC<TikTokAccountConnectorProps> = ({
  onAccountChange,
  onSyncComplete,
  className = '',
}) => {
  const [handleInput, setHandleInput] = useState('');
  const [accountData, setAccountData] = useState<TikTokAccountData | null>(null);
  const [publicProfile, setPublicProfile] = useState<TikTokProfile | null>(null);
  const [apiStatus, setApiStatus] = useState<TikTokApiConfigStatus | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPortalSetup, setShowPortalSetup] = useState(false);
  const [copiedDevUrl, setCopiedDevUrl] = useState(false);
  const [copiedSharedUrl, setCopiedSharedUrl] = useState(false);
  const [copiedStudioUrl, setCopiedStudioUrl] = useState(false);
  const [copiedCurrentUrl, setCopiedCurrentUrl] = useState(false);
  // Default to DEV_CALLBACK_URL which is the one registered in the user's portal screenshot
  const [selectedCallbackUrl, setSelectedCallbackUrl] = useState<string>(DEV_CALLBACK_URL);
  const [clientKeyInput, setClientKeyInput] = useState('');
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [keysSavedMsg, setKeysSavedMsg] = useState<string | null>(null);
  const [keysErrorMsg, setKeysErrorMsg] = useState<string | null>(null);

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeysErrorMsg(null);
    setKeysSavedMsg(null);

    if (!clientKeyInput.trim() || !clientSecretInput.trim()) {
      setKeysErrorMsg('Veuillez renseigner à la fois la Client Key et le Client Secret.');
      return;
    }

    setIsSavingKeys(true);
    try {
      const res = await fetch('/api/tiktok/save-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientKey: clientKeyInput.trim(),
          clientSecret: clientSecretInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'enregistrement des clés.");
      }

      setKeysSavedMsg('✓ Clés TikTok enregistrées avec succès ! Vous pouvez maintenant vous connecter.');
      checkServerStatus();
    } catch (err: any) {
      setKeysErrorMsg(err.message || 'Impossible de sauvegarder les clés TikTok.');
    } finally {
      setIsSavingKeys(false);
    }
  };

  // Check server-side TikTok API status and local session on mount
  useEffect(() => {
    checkServerStatus();

    // Check localStorage fallback
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.openId) {
          setAccountData(parsed);
          if (onAccountChange) onAccountChange(parsed);
        } else if (parsed.handle) {
          setPublicProfile(parsed);
          setHandleInput(parsed.handle);
          if (onAccountChange) onAccountChange(parsed);
        }
      }
    } catch (e) {
      console.warn('Error reading saved TikTok profile:', e);
    }

    // Listen to popup message from OAuth callback (oauth-integration skill)
    const handleOAuthMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      const isAllowed =
        !origin ||
        origin === window.location.origin ||
        origin.includes('ai.studio') ||
        origin.endsWith('.run.app') ||
        origin.includes('localhost');

      if (!isAllowed) {
        return;
      }

      if (event.data?.type === 'TIKTOK_OAUTH_SUCCESS') {
        const newAccount = event.data.account as TikTokAccountData;
        if (newAccount) {
          setAccountData(newAccount);
          setPublicProfile(null);
          setErrorMsg(null);
          setSuccessMsg(`Compte TikTok @${newAccount.username.replace('@', '')} relié avec succès !`);

          // Persist to Firestore and local storage
          await saveTikTokAccountToFirestore(newAccount);

          if (onAccountChange) onAccountChange(newAccount);

          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 },
          });

          // Trigger initial sync of videos and stats
          handleSyncTikTokData(newAccount.openId);
        }
      } else if (event.data?.type === 'TIKTOK_OAUTH_ERROR') {
        setErrorMsg(event.data.error || "Échec de l'autorisation TikTok.");
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const checkServerStatus = async () => {
    try {
      const res = await fetch('/api/tiktok/status');
      if (res.ok) {
        const data: TikTokApiConfigStatus = await res.json();
        setApiStatus(data);
        if (data.isConnected && data.account) {
          setAccountData(data.account);
          saveTikTokAccountToFirestore(data.account);
          if (onAccountChange) onAccountChange(data.account);
        }
      }
    } catch (e) {
      console.warn('Unable to query /api/tiktok/status:', e);
    }
  };

  // 1. Connect via Official TikTok OAuth popup
  const handleConnectOAuth = async (scopeParam?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!apiStatus?.isConfigured) {
      if (clientKeyInput.trim() && clientSecretInput.trim()) {
        try {
          const autoSave = await fetch('/api/tiktok/save-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientKey: clientKeyInput.trim(),
              clientSecret: clientSecretInput.trim(),
            }),
          });
          if (autoSave.ok) {
            setApiStatus((prev: any) => ({ ...prev, isConfigured: true }));
          } else {
            setShowPortalSetup(true);
            setErrorMsg("Veuillez d'abord renseigner votre Client Key et Client Secret ci-dessous (Section 4) pour activer la connexion TikTok.");
            setIsLoading(false);
            return;
          }
        } catch (e) {
          setShowPortalSetup(true);
          setErrorMsg("Veuillez d'abord renseigner votre Client Key et Client Secret ci-dessous (Section 4) pour activer la connexion TikTok.");
          setIsLoading(false);
          return;
        }
      } else {
        setShowPortalSetup(true);
        setErrorMsg("Clés TikTok non configurées sur le serveur : renseignez votre Client Key et Client Secret ci-dessous (Section 4) ou dans les variables d'environnement serveur.");
        setIsLoading(false);
        return;
      }
    }

    // Open popup synchronously immediately on click to prevent Safari popup blocking
    const authWindow = window.open(
      'about:blank',
      'tiktok_oauth_popup',
      'width=620,height=750,menubar=no,toolbar=no,status=no'
    );
    if (authWindow) {
      authWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white;">
            <div style="text-align: center;">
              <div style="font-size: 28px; margin-bottom: 12px;">⏳</div>
              <p style="font-size: 14px; color: #94a3b8;">Connexion à TikTok en cours...</p>
            </div>
          </body>
        </html>
      `);
    }

    try {
      const redirectUriParam = selectedCallbackUrl || `${window.location.origin}/api/tiktok/callback`;
      const queryParams = new URLSearchParams({
        redirect_uri: redirectUriParam,
      });
      if (scopeParam) {
        queryParams.set('scope', scopeParam);
      }
      const res = await fetch(`/api/tiktok/auth-url?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        if (authWindow && !authWindow.closed) authWindow.close();
        throw new Error(data.error || "Impossible d'obtenir l'URL d'autorisation TikTok.");
      }

      if (authWindow && !authWindow.closed) {
        authWindow.location.href = data.url;
      } else {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      if (authWindow && !authWindow.closed) authWindow.close();
      setErrorMsg(err.message || 'Erreur lors du lancement de la connexion TikTok.');
      setShowPortalSetup(true);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Synchronize videos & stats via /api/tiktok/sync
  const handleSyncTikTokData = async (targetOpenId?: string) => {
    setIsSyncing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/tiktok/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la synchronisation TikTok.");
      }

      if (data.account) {
        setAccountData(data.account);
        await saveTikTokAccountToFirestore(data.account);
      }

      const videos: TikTokOfficialVideo[] = data.videos || [];
      const currentOpenId = targetOpenId || accountData?.openId || 'unknown';

      // Persist to Firestore and local IndexedDB
      if (videos.length > 0) {
        await saveTikTokVideosToFirestore(currentOpenId, videos);
      }

      if (onSyncComplete) {
        onSyncComplete(videos, data.summary);
      }

      if (data.message) {
        setSuccessMsg(data.message);
      } else {
        setSuccessMsg(
          `Synchronisation réussie : ${videos.length} vidéo${videos.length > 1 ? 's' : ''} récupérée${
            videos.length > 1 ? 's' : ''
          } avec leurs métriques officielles.`
        );
      }

      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 },
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la récupération des statistiques.");
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. Fallback: Verify public handle if OAuth not configured yet
  const handleVerifyPublicHandle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleInput.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/tiktok-account?handle=${encodeURIComponent(handleInput.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la vérification.');
      }

      const newProfile: TikTokProfile = {
        handle: data.handle,
        authorName: data.authorName,
        profileUrl: data.profileUrl,
        isVerifiedOnTikTok: data.isVerifiedOnTikTok,
        connectedAt: new Date().toISOString(),
        isOAuthConnected: false,
      };

      setPublicProfile(newProfile);
      setAccountData(null);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
      if (onAccountChange) onAccountChange(newProfile);
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible de joindre le profil TikTok.');
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect active account
  const handleDisconnect = async () => {
    try {
      await fetch('/api/tiktok/disconnect', { method: 'POST' });
    } catch (e) {
      // Ignore
    }
    setAccountData(null);
    setPublicProfile(null);
    setHandleInput('');
    localStorage.removeItem(STORAGE_KEY);
    if (onAccountChange) onAccountChange(null);
  };

  const devCallbackUrl = 'https://ais-dev-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app/api/tiktok/callback';
  const sharedCallbackUrl = 'https://ais-pre-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app/api/tiktok/callback';
  const studioCallbackUrl = 'https://tiktok-content-manager.ai.studio/api/tiktok/callback';
  const currentCallbackUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/api/tiktok/callback` : studioCallbackUrl;

  const copyToClipboard = (text: string, type: 'dev' | 'shared' | 'studio' | 'current') => {
    navigator.clipboard.writeText(text);
    if (type === 'dev') {
      setCopiedDevUrl(true);
      setTimeout(() => setCopiedDevUrl(false), 2000);
    } else if (type === 'shared') {
      setCopiedSharedUrl(true);
      setTimeout(() => setCopiedSharedUrl(false), 2000);
    } else if (type === 'studio') {
      setCopiedStudioUrl(true);
      setTimeout(() => setCopiedStudioUrl(false), 2000);
    } else {
      setCopiedCurrentUrl(true);
      setTimeout(() => setCopiedCurrentUrl(false), 2000);
    }
  };

  return (
    <div className={`bg-zinc-900/70 rounded-2xl p-5 sm:p-6 border border-zinc-800 shadow-sm shadow-black/20 space-y-5 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/70 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68a6.34 6.34 0 0 0 10.86 4.46A6.29 6.29 0 0 0 15.82 15V8.58a8.31 8.31 0 0 0 4.77 1.52V6.69z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-zinc-50 text-base">
                Intégration Officielle TikTok Analytics
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-800 uppercase tracking-wider">
                Display API & Login Kit
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Autorisations requises : <code className="text-zinc-100 font-semibold font-mono">user.info.basic</code>, <code className="text-zinc-100 font-semibold font-mono">user.info.stats</code>, <code className="text-zinc-100 font-semibold font-mono">video.list</code>.
            </p>
          </div>
        </div>

        {(accountData || publicProfile) && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            {accountData ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>API Officielle Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Pseudo Public Relié</span>
              </span>
            )}
            <button
              onClick={handleDisconnect}
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition cursor-pointer px-2 py-1"
              title="Dissocier ce compte"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Déconnecter</span>
            </button>
          </div>
        )}
      </div>

      {/* Success & Error alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-300 hover:text-emerald-300 text-xs font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-300 hover:text-rose-300 text-xs font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Case 1: Account Connected via Official OAuth */}
      {accountData ? (
        <div className="space-y-4 animate-fadeIn">
          {/* Main Account Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-800 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {accountData.avatarUrl ? (
                <img
                  src={accountData.avatarUrl}
                  alt={accountData.displayName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-emerald-400 shrink-0 shadow"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-zinc-700 text-white font-extrabold flex items-center justify-center text-xl shrink-0 border-2 border-emerald-400">
                  {accountData.username.slice(1, 3).toUpperCase()}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-extrabold text-base sm:text-lg text-white">
                    {accountData.displayName}
                  </h4>
                  <span className="text-emerald-300 font-mono text-sm font-semibold">
                    {accountData.username}
                  </span>
                  {accountData.isVerified && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                      Badge Vérifié
                    </span>
                  )}
                </div>

                {/* Unique TikTok ID (Requirement 1: openId) */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300 mt-1">
                  <span>ID Unique TikTok :</span>
                  <span className="font-mono bg-black/40 px-2 py-0.5 rounded border border-white/10 text-emerald-300 text-[11px]">
                    {accountData.openId}
                  </span>
                </div>
              </div>
            </div>

            {/* Sync & View buttons */}
            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
              <button
                onClick={() => handleSyncTikTokData()}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Synchronisation en cours...' : 'Synchroniser les vidéos (video.list)'}</span>
              </button>

              {accountData.profileDeepLink && (
                <a
                  href={accountData.profileDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
                >
                  <span>Profil</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Unlock Full Access banner if user connected via Login Kit only */}
          {(!accountData.scopesGranted?.includes('user.info.stats') ||
            !accountData.scopesGranted?.includes('video.list')) && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-zinc-900 to-rose-950 border border-indigo-500/30 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fadeIn">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Étape 1 réussie : Authentification TikTok Validée !</span>
                </div>
                <h5 className="font-extrabold text-sm sm:text-base text-white pt-1">
                  Débloquer vos Abonnés, Likes cumulés et Vidéos en direct
                </h5>
                <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl">
                  Vous avez validé le Login Kit de base. Comme vous avez déjà configuré les autorisations <code className="text-emerald-300 font-mono">user.info.stats</code> et <code className="text-emerald-300 font-mono">video.list</code> dans votre portail TikTok, cliquez sur le bouton ci-contre pour autoriser l'accès aux métriques réelles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleConnectOAuth()}
                disabled={isLoading}
                className="shrink-0 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/25 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Débloquer toutes les données (Mode Complet)</span>
              </button>
            </div>
          )}

          {/* Account Metrics from user.info.stats (Requirement 2) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Abonnés
                </span>
                <Users className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-xl font-extrabold text-zinc-50 mt-1.5 font-mono">
                {accountData.followerCount.toLocaleString('fr-FR')}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">user.info.stats</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Abonnements
                </span>
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-xl font-extrabold text-zinc-50 mt-1.5 font-mono">
                {accountData.followingCount.toLocaleString('fr-FR')}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">comptes suivis</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Likes Reçus
                </span>
                <Heart className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="text-xl font-extrabold text-zinc-50 mt-1.5 font-mono">
                {accountData.likesCount.toLocaleString('fr-FR')}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">cumul total compte</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Vidéos Publiées
                </span>
                <Video className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-extrabold text-zinc-50 mt-1.5 font-mono">
                {accountData.videoCount.toLocaleString('fr-FR')}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5">vidéos en ligne</div>
            </div>
          </div>
        </div>
      ) : (
        /* Case 2: Not connected via OAuth yet */
        <div className="space-y-4">
          {/* Main Official OAuth Connection Action */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-indigo-950 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                <Shield className="w-3 h-3" />
                <span>Flux Officiel Sécurisé (OAuth 2.0 PKCE)</span>
              </div>
              <h4 className="text-base sm:text-lg font-extrabold text-white">
                Connecter votre compte TikTok via Login Kit & Display API
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Autorise la récupération officielle de vos abonnés, likes globaux et de vos publications réelles (<code className="text-emerald-300">video.list</code>) avec les vues, likes, commentaires et partages certifiés.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowPortalSetup(!showPortalSetup)}
                className="px-4 py-3.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer flex items-center justify-center gap-2"
                title="Renseigner ou vérifier votre Client Key et Client Secret"
              >
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Clés</span>
              </button>
              <button
                type="button"
                onClick={() => handleConnectOAuth('user.info.basic')}
                disabled={isLoading}
                className="px-4 py-3.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer flex items-center justify-center gap-1.5"
                title="Tester uniquement avec Login Kit (user.info.basic)"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Tester Login Kit (Profil seul)</span>
              </button>
              <button
                type="button"
                onClick={() => handleConnectOAuth()}
                disabled={isLoading}
                className="px-5 py-3.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/25 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2.5"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.68a6.34 6.34 0 0 0 10.86 4.46A6.29 6.29 0 0 0 15.82 15V8.58a8.31 8.31 0 0 0 4.77 1.52V6.69z" />
                  </svg>
                )}
                <span>Se connecter avec TikTok (Complet)</span>
              </button>
            </div>
          </div>

          {/* Active Redirect URI verification & selector */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-700/80 text-white text-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Redirect URI TikTok utilisée pour l'autorisation :</span>
              </span>
              <span className="text-[11px] text-zinc-500">
                (Doit être déclarée dans TikTok Portal &gt; Login Kit &gt; Redirect URI)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedCallbackUrl(DEV_CALLBACK_URL)}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                  selectedCallbackUrl === DEV_CALLBACK_URL
                    ? 'bg-emerald-500/15 border-emerald-400 ring-1 ring-emerald-400/40 text-white'
                    : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                    <span>1. URL Cloud Run (Celle de votre capture d'écran)</span>
                    {selectedCallbackUrl === DEV_CALLBACK_URL && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/30 text-emerald-200 rounded font-semibold">
                        Sélectionnée
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-zinc-300 truncate mt-1">{DEV_CALLBACK_URL}</div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(DEV_CALLBACK_URL, 'dev');
                    }}
                    className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition"
                    title="Copier"
                  >
                    {copiedDevUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCallbackUrl(STUDIO_CALLBACK_URL)}
                className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                  selectedCallbackUrl === STUDIO_CALLBACK_URL
                    ? 'bg-emerald-500/15 border-emerald-400 ring-1 ring-emerald-400/40 text-white'
                    : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-[11px] font-bold text-sky-300 flex items-center gap-1.5">
                    <span>2. URL Domaine Studio (tiktok-content-manager.ai.studio)</span>
                    {selectedCallbackUrl === STUDIO_CALLBACK_URL && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-sky-500/30 text-sky-200 rounded font-semibold">
                        Sélectionnée
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-zinc-300 truncate mt-1">{STUDIO_CALLBACK_URL}</div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(STUDIO_CALLBACK_URL, 'studio');
                    }}
                    className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition"
                    title="Copier"
                  >
                    {copiedStudioUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </span>
                </div>
              </button>
            </div>
            <div className="text-[11px] text-zinc-500 bg-black/30 p-2.5 rounded-lg flex items-center gap-2">
              <span className="text-amber-400 font-bold">Astuce :</span>
              <span>
                Pour éviter toute divergence, vous pouvez ajouter les deux URLs ci-dessus dans votre portail TikTok Developer via le bouton <strong className="text-white">+ Add a URI</strong>, puis cliquer sur <strong className="text-rose-400">Apply changes</strong>.
              </span>
            </div>
          </div>

          {/* Fallback Option: Associate public handle for manual mode while awaiting TikTok review */}
          <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Alternative : Associer un pseudonyme public en attendant l'approbation TikTok</span>
              </div>
              <span className="text-[10px] text-zinc-500">Mode Manuel H+24 / H+48 / J+7</span>
            </div>

            <form onSubmit={handleVerifyPublicHandle} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                placeholder="Ex : @votre_pseudo_tiktok"
                className="flex-1 px-3.5 py-2 rounded-xl border border-zinc-800 text-xs sm:text-sm font-semibold text-zinc-50 focus:outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 bg-zinc-900/70"
              />
              <button
                type="submit"
                disabled={isLoading || !handleInput.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-semibold text-xs shadow-sm shadow-black/20 transition cursor-pointer disabled:opacity-50 shrink-0"
              >
                Associer le pseudo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Developer Portal Instructions & Setup Toggle (Section 7) */}
      <div className="pt-2 border-t border-zinc-800/70">
        <button
          type="button"
          onClick={() => setShowPortalSetup(!showPortalSetup)}
          className="text-xs font-bold text-zinc-300 hover:text-zinc-50 inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {showPortalSetup
              ? 'Masquer les paramètres du portail développeur TikTok'
              : 'Afficher la configuration requise dans developers.tiktok.com'}
          </span>
          {showPortalSetup ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showPortalSetup && (
          <div className="mt-3 p-4 rounded-2xl bg-zinc-950/70 text-white text-xs space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Guide de Configuration — TikTok Developer Portal</span>
              </div>
              <a
                href="https://developers.tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white underline"
              >
                <span>Accéder au portail</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="font-bold text-zinc-300">1. Produits à activer dans votre application TikTok :</div>
                <ul className="list-disc list-inside text-zinc-300 space-y-0.5 pl-2">
                  <li><strong>Login Kit</strong> (Authentification OAuth 2.0).</li>
                  <li><strong>TikTok Display API</strong> (Extraction des vidéos et statistiques).</li>
                </ul>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-zinc-300">2. Autorisations (Scopes) à demander à TikTok :</div>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px] text-emerald-300">
                    user.info.basic
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px] text-emerald-300">
                    user.info.stats
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px] text-emerald-300">
                    video.list
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-zinc-300">
                  3. URL de Redirection (Redirect URIs) à copier dans les paramètres de votre application :
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] text-zinc-500">Environnement de Développement (Dev URL) :</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={devCallbackUrl}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[11px] text-zinc-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(devCallbackUrl, 'dev')}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedDevUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDevUrl ? 'Copié' : 'Copier'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] text-zinc-500">Domaine Studio Actuel (tiktok-content-manager.ai.studio) :</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={studioCallbackUrl}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-emerald-500/30 font-mono text-[11px] text-emerald-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(studioCallbackUrl, 'studio')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedStudioUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedStudioUrl ? 'Copié' : 'Copier'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] text-zinc-500">Environnement Partagé (Shared URL) :</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={sharedCallbackUrl}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[11px] text-zinc-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(sharedCallbackUrl, 'shared')}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSharedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSharedUrl ? 'Copié' : 'Copier'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-zinc-300 flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>4. Clés de votre application TikTok (Client Key & Client Secret)</span>
                  </div>
                  {apiStatus?.isConfigured ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      ✓ Clés déjà configurées
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      Clés requises
                    </span>
                  )}
                </div>

                <p className="text-zinc-500 text-[11px] leading-relaxed">
                  Copiez la <strong>Client Key</strong> et le <strong>Client Secret</strong> depuis la page <code className="text-zinc-300">Basic settings &gt; App credentials</code> de votre application dans <a href="https://developers.tiktok.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">developers.tiktok.com</a>. {apiStatus?.isConfigured && 'Les clés sont déjà configurées côté serveur : ne remplissez ce formulaire que pour les remplacer.'}
                </p>

                <form onSubmit={handleSaveKeys} className="space-y-2.5 bg-black/30 p-3.5 rounded-xl border border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        Client Key (ou App ID) :
                      </label>
                      <input
                        type="text"
                        value={clientKeyInput}
                        onChange={(e) => setClientKeyInput(e.target.value)}
                        placeholder="Ex : awxxxxxxxxxxxxxx"
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-800 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        Client Secret :
                      </label>
                      <input
                        type="password"
                        value={clientSecretInput}
                        onChange={(e) => setClientSecretInput(e.target.value)}
                        placeholder="••••••••••••••••••••"
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-800 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  {keysSavedMsg && (
                    <div className="text-[11px] text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                      {keysSavedMsg}
                    </div>
                  )}

                  {keysErrorMsg && (
                    <div className="text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                      {keysErrorMsg}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isSavingKeys || !clientKeyInput.trim() || !clientSecretInput.trim()}
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {isSavingKeys ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Enregistrement...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Enregistrer les clés</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
