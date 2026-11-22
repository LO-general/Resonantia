import React, { useState } from 'react';
import {
  Sparkles,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Settings,
  HelpCircle,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmailDetailed,
  signInWithGoogle,
  resetUserPassword,
  isFirebaseConfigured,
  getSavedFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
} from '../services/firebase';
import { isSupabaseConfigured } from '../services/supabase';
import { UserProfile, FirebaseConfigParams } from '../types';
import { TikTokDeveloperPortalModal } from './TikTokDeveloperPortalModal';

interface AuthScreenProps {
  initialMode?: 'login' | 'signup' | 'forgot';
  onSuccess: (user: UserProfile, isNewSignup?: boolean) => void;
  onBackToRebuild?: () => void;
  onNavigateTerms?: () => void;
  onNavigatePrivacy?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'signup',
  onSuccess,
  onBackToRebuild,
  onNavigateTerms,
  onNavigatePrivacy,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [age, setAge] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // TikTok Developer Portal Modal State (URLs + 1024x1024 Logo)
  const [showTikTokPortalModal, setShowTikTokPortalModal] = useState(false);

  // Firebase Config Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [fbConfig, setFbConfig] = useState<FirebaseConfigParams>(() => {
    const saved = getSavedFirebaseConfig();
    return (
      saved || {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: '',
      }
    );
  });
  const [configSavedNotice, setConfigSavedNotice] = useState<string | null>(null);
  const [configErrorNotice, setConfigErrorNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError('Veuillez renseigner votre adresse email.');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        await resetUserPassword(email);
        setSuccessMessage(
          'Si un compte correspond à cette adresse, les instructions de réinitialisation vous ont été envoyées.'
        );
      } catch (err: any) {
        setError(err?.message || 'Erreur lors de la réinitialisation du mot de passe.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'signup') {
      const parsedAge = Number.parseInt(age.trim(), 10);
      if (!age.trim() || Number.isNaN(parsedAge) || parsedAge < 13 || parsedAge > 120) {
        setError('Veuillez renseigner votre âge valide (entre 13 et 120 ans).');
        return;
      }
      if (!confirmEmail.trim()) {
        setError('Veuillez confirmer votre adresse email.');
        return;
      }
      if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
        setError('Les deux adresses email ne correspondent pas.');
        return;
      }
    }

    if (!password) {
      setError('Veuillez renseigner votre code / mot de passe.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Le code / mot de passe doit contenir au moins 6 caractères.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Les deux codes / mots de passe ne correspondent pas.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const parsedAge = Number.parseInt(age.trim(), 10);
        const result = await signUpWithEmailDetailed(
          email.trim(),
          password,
          displayName.trim(),
          parsedAge
        );
        if (result.requiresEmailConfirmation) {
          setSuccessMessage(
            `Compte créé ! Un email de confirmation vient d'être envoyé à ${email.trim()}. Confirmez votre adresse puis connectez-vous.`
          );
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          return;
        }
        onSuccess(result.user, true);
      } else {
        const user = await signInWithEmail(email.trim(), password);
        onSuccess(user, false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Une erreur est survenue lors de l'authentification.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      onSuccess(user, mode === 'signup');
    } catch (err: any) {
      if (err?.message !== 'Connexion Google annulée.') {
        setError(err?.message || 'Impossible de se connecter avec Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setConfigErrorNotice(null);
    if (!fbConfig.apiKey.trim() || !fbConfig.projectId.trim()) {
      setConfigErrorNotice('Veuillez au minimum renseigner la clé API et le Project ID Firebase.');
      return;
    }
    saveFirebaseConfig(fbConfig);
    setConfigSavedNotice('Configuration enregistrée avec succès !');
    setTimeout(() => {
      setConfigSavedNotice(null);
      setShowConfigModal(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-rose-500/15 via-rose-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {onBackToRebuild && (
        <div className="w-full max-w-md mb-3 relative z-10 flex items-center justify-start">
          <button
            type="button"
            onClick={onBackToRebuild}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour à Re-build</span>
          </button>
        </div>
      )}

      {/* Prominent TikTok Developer & Legal Pages Banner */}
      <div className="w-full max-w-md mb-4 bg-zinc-800/90 backdrop-blur-md rounded-2xl border border-zinc-700/80 p-3.5 text-white shadow-xl relative z-10 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-xs font-bold text-zinc-300">Ressources &amp; Pages légales :</span>
          </div>
          <button
            type="button"
            onClick={() => setShowTikTokPortalModal(true)}
            className="text-[11px] font-extrabold text-rose-400 hover:text-rose-300 underline underline-offset-2 cursor-pointer flex items-center gap-1"
          >
            <span>URLs & Logo 1024x1024</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              if (onNavigateTerms) onNavigateTerms();
              else window.location.href = '/terms';
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-700/80 hover:bg-zinc-700 text-zinc-200 font-semibold border border-zinc-600/50 transition cursor-pointer"
          >
            <span>CGU (/terms)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onNavigatePrivacy) onNavigatePrivacy();
              else window.location.href = '/privacy';
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-700/80 hover:bg-zinc-700 text-zinc-200 font-semibold border border-zinc-600/50 transition cursor-pointer"
          >
            <span>Confidentialité (/privacy)</span>
          </button>
        </div>
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-zinc-900/70 rounded-3xl shadow-2xl border border-zinc-800/70 overflow-hidden relative z-10 animate-fadeIn">
        {/* Top Header */}
        <div className="p-8 pb-6 bg-gradient-to-b from-zinc-900 to-zinc-900 border-b border-zinc-800/70 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 text-white flex items-center justify-center font-black text-xl mx-auto mb-3 shadow-md">
            R
          </div>
          <h1 className="text-xl font-extrabold text-zinc-50 tracking-tight">
            Resonantia
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Ne cours pas après la viralité. Crée de la résonance.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-zinc-800 p-1 rounded-xl mt-5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'login'
                  ? 'bg-zinc-900/70 text-zinc-50 shadow-2xs'
                  : 'text-zinc-400 hover:text-zinc-50'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'signup'
                  ? 'bg-zinc-900/70 text-zinc-50 shadow-2xs'
                  : 'text-zinc-400 hover:text-zinc-50'
              }`}
            >
              Créer un compte
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 pt-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1.5">
                    Âge
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="number"
                      min={13}
                      max={120}
                      required
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Ex: 24"
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1.5">
                    Nom / Marque (optionnel)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ex: Sophie Studio"
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1.5">
                Adresse Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre-email@exemple.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1.5">
                  Confirmer l’adresse Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="Retapez votre adresse email"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    {mode === 'signup' ? 'Code / Mot de passe' : 'Mot de passe'}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1.5">
                  Confirmer le code / mot de passe
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl text-sm text-zinc-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                  />
                </div>
              </div>
            )}

            {mode === 'forgot' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs text-zinc-400 hover:text-zinc-100 font-semibold cursor-pointer"
                >
                  &larr; Retour à la connexion
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-sm shadow-md shadow-rose-500/20 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Vérification...</span>
              ) : mode === 'login' ? (
                <>
                  <span>Se connecter</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'signup' ? (
                <>
                  <span>Créer mon compte</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <span>Envoyer le lien de réinitialisation</span>
              )}
            </button>
          </form>

          {/* Social Google Login */}
          {mode !== 'forgot' && (
            <>
              <div className="relative flex items-center justify-center">
                <div className="border-t border-zinc-800 w-full" />
                <span className="bg-zinc-900/70 px-3 text-[11px] uppercase font-bold text-zinc-500 tracking-wider">
                  ou
                </span>
                <div className="border-t border-zinc-800 w-full" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-zinc-900/70 border border-zinc-800 hover:bg-zinc-800/60 rounded-xl text-xs font-bold text-zinc-200 transition cursor-pointer flex items-center justify-center gap-2.5 shadow-2xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continuer avec Google</span>
              </button>
            </>
          )}

          {/* Privacy & Partitioning Notice */}
          <div className="pt-2 text-[11px] text-zinc-500 text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Données isolées et sécurisées par UID utilisateur</span>
          </div>
        </div>

        {/* Bottom configuration bar */}
        <div className="px-8 py-3 bg-zinc-950/50 border-t border-zinc-800/70 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isFirebaseConfigured() || isSupabaseConfigured() ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
            />
            <span>
              {isFirebaseConfigured()
                ? 'Firebase Cloud connecté'
                : isSupabaseConfigured()
                  ? 'Supabase Cloud connecté'
                  : 'Mode Espace Dédié'}
            </span>
          </span>

          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="text-zinc-300 hover:text-zinc-50 font-medium flex items-center gap-1 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Paramètres Firebase</span>
          </button>
        </div>
      </div>

      {/* Public Legal Footer Links (/terms & /privacy & TikTok Portal) */}
      <footer className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-500">
        <button
          type="button"
          onClick={() => setShowTikTokPortalModal(true)}
          className="px-3 py-1 rounded-lg bg-zinc-800 text-rose-400 hover:text-rose-300 font-bold border border-zinc-700 transition cursor-pointer"
        >
          Ressources &amp; URLs (Logo 1024x1024)
        </button>
        <span>&bull;</span>
        <a
          href="/terms"
          onClick={(e) => {
            e.preventDefault();
            if (onNavigateTerms) onNavigateTerms();
            else window.location.href = '/terms';
          }}
          className="hover:text-white transition underline underline-offset-4 cursor-pointer"
        >
          Conditions d'Utilisation (CGU)
        </a>
        <span>&bull;</span>
        <a
          href="/privacy"
          onClick={(e) => {
            e.preventDefault();
            if (onNavigatePrivacy) onNavigatePrivacy();
            else window.location.href = '/privacy';
          }}
          className="hover:text-white transition underline underline-offset-4 cursor-pointer"
        >
          Politique de Confidentialité (RGPD)
        </a>
      </footer>

      {/* Firebase Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900/70 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/70">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-zinc-100" />
                <h3 className="font-bold text-zinc-50 text-base">Configuration Firebase</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Pour connecter votre projet Google Firebase officiel (Auth, Cloud Firestore & Cloud Storage), renseignez vos identifiants ci-dessous :
            </p>

            {configErrorNotice && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{configErrorNotice}</span>
              </div>
            )}

            {configSavedNotice && (
              <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{configSavedNotice}</span>
              </div>
            )}

            <form onSubmit={handleSaveFirebaseConfig} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-200 uppercase">
                  API Key
                </label>
                <input
                  type="text"
                  required
                  value={fbConfig.apiKey}
                  onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full mt-1 px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-200 uppercase">
                    Project ID
                  </label>
                  <input
                    type="text"
                    required
                    value={fbConfig.projectId}
                    onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                    placeholder="mon-projet-resonantia"
                    className="w-full mt-1 px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-200 uppercase">
                    Auth Domain
                  </label>
                  <input
                    type="text"
                    value={fbConfig.authDomain}
                    onChange={(e) => setFbConfig({ ...fbConfig, authDomain: e.target.value })}
                    placeholder="mon-projet.firebaseapp.com"
                    className="w-full mt-1 px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-200 uppercase">
                  Storage Bucket
                </label>
                <input
                  type="text"
                  value={fbConfig.storageBucket}
                  onChange={(e) => setFbConfig({ ...fbConfig, storageBucket: e.target.value })}
                  placeholder="mon-projet.appspot.com"
                  className="w-full mt-1 px-3 py-2 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearFirebaseConfig();
                    setConfigErrorNotice(null);
                    setFbConfig({
                      apiKey: '',
                      authDomain: '',
                      projectId: '',
                      storageBucket: '',
                      messagingSenderId: '',
                      appId: '',
                    });
                    setConfigSavedNotice('Configuration réinitialisée au mode local sécurisé.');
                    setTimeout(() => setConfigSavedNotice(null), 2500);
                  }}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                >
                  Effacer
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800/80 rounded-lg cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 rounded-lg cursor-pointer shadow-xs"
                  >
                    Enregistrer la configuration
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* TikTok Developer Portal Modal (Logo 1024x1024 + URLs) */}
      <TikTokDeveloperPortalModal
        isOpen={showTikTokPortalModal}
        onClose={() => setShowTikTokPortalModal(false)}
        onOpenTerms={() => {
          if (onNavigateTerms) onNavigateTerms();
          else window.location.href = '/terms';
        }}
        onOpenPrivacy={() => {
          if (onNavigatePrivacy) onNavigatePrivacy();
          else window.location.href = '/privacy';
        }}
      />
    </div>
  );
};
