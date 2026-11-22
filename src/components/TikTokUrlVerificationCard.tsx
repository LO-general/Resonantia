import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Upload,
  ExternalLink,
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
  FileCode,
  ArrowRight,
} from 'lucide-react';

export const TikTokUrlVerificationCard: React.FC = () => {
  const [tokenInput, setTokenInput] = useState('');
  const [customFileName, setCustomFileName] = useState('tiktok-developers-site-verification.txt');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [currentVerification, setCurrentVerification] = useState<{
    isConfigured: boolean;
    fileName: string;
    content: string | null;
    url: string;
  } | null>(null);

  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    statusText: string;
    contentPreview?: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedPrefix, setCopiedPrefix] = useState(false);

  const baseUrl = (
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app'
  ).replace(/\/$/, '');

  const urlPrefixToVerify = `${baseUrl}/`;
  const isPreviewProxyHost =
    baseUrl.includes('ais-dev-') || baseUrl.includes('ais-pre-');

  const handleCopyPrefix = () => {
    navigator.clipboard?.writeText(urlPrefixToVerify).catch(() => {});
    setCopiedPrefix(true);
    setTimeout(() => setCopiedPrefix(false), 2000);
  };

  // Load verification status on mount
  const checkStatus = async () => {
    try {
      const res = await fetch('/api/tiktok/verification-status');
      if (res.ok) {
        const data = await res.json();
        setCurrentVerification(data);
      }
    } catch (e) {
      console.warn('Failed to load TikTok verification status', e);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);

    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setSaveError('Veuillez coller le code token ou le contenu du fichier fourni par TikTok.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/tiktok/save-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: trimmed,
          fileName: customFileName.trim() || 'tiktok-developers-site-verification.txt',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de l'enregistrement sur le serveur.");
      }

      setSaveSuccess(
        `✓ Fichier ${data.fileName} activé avec succès sur le serveur ! Vous pouvez maintenant cliquer sur 'Verify' dans TikTok.`
      );
      setTokenInput('');
      checkStatus();
      runLiveTest();
    } catch (err: any) {
      setSaveError(err.message || 'Impossible de sauvegarder le fichier.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        setTokenInput(text.trim());
      }
    };
    reader.readAsText(file);
  };

  const runLiveTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const testUrl = `/tiktok-developers-site-verification.txt?t=${Date.now()}`;
      const res = await fetch(testUrl);
      const text = await res.text();

      if (res.ok && (text.includes('tiktok-developers-site-verification') || text.length > 5)) {
        setTestResult({
          tested: true,
          success: true,
          statusText: 'HTTP 200 OK - Fichier accessible publiquement sans redirection.',
          contentPreview: text.length > 80 ? text.slice(0, 80) + '...' : text,
        });
      } else {
        setTestResult({
          tested: true,
          success: false,
          statusText: `Erreur HTTP ${res.status}: Fichier non configuré ou vide.`,
        });
      }
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        statusText: `Erreur de connexion : ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-zinc-900/70 rounded-3xl p-6 sm:p-8 border-2 border-rose-500/30 shadow-md space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-800/70 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Résolution : « This URL is not verified. Verify URL properties »</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-zinc-50 tracking-tight">
            Vérification de Propriété de l'URL pour TikTok
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl">
            TikTok exige de vérifier que vous contrôlez l'adresse web avant d'autoriser la sauvegarde des CGU et de la Confidentialité.
          </p>
        </div>

        {currentVerification?.isConfigured && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold self-start">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Fichier Actif sur le Serveur</span>
          </span>
        )}
      </div>

      {/* Exact URL to paste in Verify URL properties */}
      <div className="p-4 rounded-2xl bg-zinc-950/70 border border-rose-500/30 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="text-xs font-bold text-zinc-100">
              URL exacte à coller dans « Verify URL properties » → « URL prefix » :
            </div>
            <code className="block text-xs sm:text-sm font-mono text-amber-300 break-all">
              {urlPrefixToVerify}
            </code>
          </div>
          <button
            type="button"
            onClick={handleCopyPrefix}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-bold transition shrink-0 cursor-pointer self-start sm:self-center"
          >
            {copiedPrefix ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>URL copiée</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copier cette URL</span>
              </>
            )}
          </button>
        </div>

        {isPreviewProxyHost && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Attention (URL de prévisualisation) :</strong> les adresses <code>ais-dev-*</code> et <code>ais-pre-*</code> sont protégées par une page « Cookie check » qui bloque les robots externes. Pour que le bouton <strong>Verify</strong> passe, déployez Resonantia sur une vraie URL publique (Cloud Run, Render ou domaine personnalisé) puis ouvrez cette même page <strong>Paramètres → Vérification d’URL</strong> depuis l’URL déployée.
            </span>
          </div>
        )}
      </div>

      {/* 3 Simple Steps Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800 space-y-1.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold flex items-center justify-center text-xs">
            1
          </div>
          <strong className="text-zinc-50 block font-bold">Sur le portail développeur</strong>
          <p className="text-zinc-300 leading-normal">
            Cliquez sur <strong>« Verify URL properties »</strong>, choisissez <strong>« URL prefix »</strong> et collez l’URL exacte affichée juste au-dessus (<code>{urlPrefixToVerify}</code>).
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800 space-y-1.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold flex items-center justify-center text-xs">
            2
          </div>
          <strong className="text-zinc-50 block font-bold">Récupérer le code</strong>
          <p className="text-zinc-300 leading-normal">
            TikTok vous propose de télécharger <code>tiktok-developers-site-verification.txt</code> ou affiche une chaîne de caractères (token).
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800 space-y-1.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white font-bold flex items-center justify-center text-xs">
            3
          </div>
          <strong className="text-zinc-50 block font-bold">Activer et Valider</strong>
          <p className="text-zinc-300 leading-normal">
            Collez le code ci-dessous et cliquez sur « Enregistrer ». Retournez sur TikTok et cliquez sur le bouton vert <strong>« Verify »</strong> !
          </p>
        </div>
      </div>

      {/* Form to paste token or upload file */}
      <form onSubmit={handleSave} className="space-y-4 pt-1">
        {currentVerification?.content && (
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs space-y-1">
            <div className="text-[11px] font-semibold text-zinc-400">
              Signature actuellement active sur le serveur :
            </div>
            <code className="block font-mono text-emerald-300 break-all">
              {currentVerification.content}
            </code>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1.5">
            Token ou contenu de vérification d’URL
          </label>
          <div className="space-y-2">
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Ex: NdEl8xTGVSrLyPtfm5AvlhCBqQWWrIqW  ou  tiktok-developers-site-verification=..."
              className="w-full px-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs sm:text-sm font-mono text-zinc-50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            />
            <p className="text-[11px] text-zinc-500">
              Collez soit le token seul, soit la ligne complète <code>tiktok-developers-site-verification=VOTRE_TOKEN</code>.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1.5">
            Nom du fichier attendu (optionnel)
          </label>
          <input
            type="text"
            value={customFileName}
            onChange={(e) => setCustomFileName(e.target.value)}
            placeholder="tiktok-developers-site-verification.txt"
            className="w-full px-4 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer transition border border-zinc-800">
              <Upload className="w-3.5 h-3.5 text-zinc-400" />
              <span>Ou importer le fichier .txt téléchargé depuis TikTok</span>
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isSaving || !tokenInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs shadow-md shadow-zinc-900/10 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <span>Activation en cours...</span>
            ) : (
              <>
                <span>Enregistrer & Activer sur le serveur</span>
                <ArrowRight className="w-4 h-4 text-rose-400" />
              </>
            )}
          </button>
        </div>

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {saveError && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
      </form>

      {/* Live Checker Section */}
      <div className="pt-4 border-t border-zinc-800/70 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-zinc-100">
              Vérifier l'accessibilité publique du fichier
            </div>
            <div className="text-[11px] text-zinc-500">
              URL : <code className="text-zinc-200">{baseUrl}/tiktok-developers-site-verification.txt</code>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runLiveTest}
              disabled={isTesting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer border border-zinc-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>Tester la vérification en direct</span>
            </button>

            <a
              href="/tiktok-developers-site-verification.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 text-xs transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ouvrir</span>
            </a>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <div className="font-bold">{testResult.statusText}</div>
              {testResult.contentPreview && (
                <div className="text-[11px] font-mono opacity-80">
                  Contenu servi : {testResult.contentPreview}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
