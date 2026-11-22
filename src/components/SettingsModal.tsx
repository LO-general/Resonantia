import React, { useEffect, useState } from 'react';
import { ContentMode } from '../types';
import { exportAllUserIndexedDBData, saveContentModeForUser } from '../services/db';
import { purgeLocalUserPreferences } from '../services/firebase';
import { TikTokUrlVerificationCard } from './TikTokUrlVerificationCard';
import { X, Download, Trash2, Check, Layers, ShieldAlert, FileArchive, ShieldCheck, Copy, Sliders } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string | null;
  currentMode: ContentMode;
  onModeChange: (newMode: ContentMode) => void;
  onDataPurged?: () => void;
}

const MODES: Array<{ value: ContentMode; label: string; description: string }> = [
  {
    value: 'creation',
    label: 'Création de contenu',
    description: 'Met en avant vos créations originales et masque le flux Repost.',
  },
  {
    value: 'repost',
    label: 'Repost de contenu',
    description: 'Priorise la gestion des droits, autorisations écrites et outils natifs.',
  },
  {
    value: 'both',
    label: 'Les deux (Création & Repost)',
    description: 'Affiche la comparaison neutre Création vs Repost et tous les outils.',
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  currentMode,
  onModeChange,
  onDataPurged,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'url_verification'>('general');
  const [copiedUrlKey, setCopiedUrlKey] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<ContentMode>(currentMode);
  const [saving, setSaving] = useState(false);
  const [modeSaved, setModeSaved] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmPurgeOpen, setConfirmPurgeOpen] = useState(false);

  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin.replace(/\/$/, '')
      : 'https://ais-pre-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app';

  const appUrls = [
    { key: 'web', label: 'Configure for Web / URL Prefix', value: `${baseUrl}/` },
    { key: 'terms', label: 'Terms of Service URL', value: `${baseUrl}/terms` },
    { key: 'privacy', label: 'Privacy Policy URL', value: `${baseUrl}/privacy` },
    { key: 'callback', label: 'Redirect URI (OAuth)', value: `${baseUrl}/api/auth/callback` },
  ];

  const handleCopyUrl = (key: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedUrlKey(key);
    setTimeout(() => setCopiedUrlKey(null), 2000);
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedMode(currentMode);
      setStatusMessage(null);
      setErrorMessage(null);
      setModeSaved(false);
    }
  }, [isOpen, currentMode]);

  if (!isOpen) return null;

  const handleSaveMode = async () => {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    setModeSaved(false);
    try {
      await saveContentModeForUser(userId, selectedMode);
      onModeChange(selectedMode);
      setModeSaved(true);
      setStatusMessage('Préférence de contenu enregistrée.');
      setTimeout(() => setModeSaved(false), 3000);
    } catch (err: any) {
      console.error('Error saving content mode:', err);
      setErrorMessage(err?.message || "Impossible d'enregistrer votre préférence.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportWorkspace = async () => {
    try {
      const dbExport = await exportAllUserIndexedDBData(userId);
      const localDump: Record<string, unknown> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('tiktok_') || key.startsWith('vision_') || key.startsWith('repost_'))) {
          try {
            localDump[key] = JSON.parse(localStorage.getItem(key) || 'null');
          } catch {
            localDump[key] = localStorage.getItem(key);
          }
        }
      }
      const payload = {
        ...dbExport,
        localPreferences: localDump,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resonantia_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Export JSON téléchargé avec vos données locales.');
    } catch {
      setStatusMessage("Impossible d'exporter le jeu de données.");
    }
  };

  const [downloadingZip, setDownloadingZip] = useState<'src' | 'full' | null>(null);

  const handleDownloadSourceZip = async (kind: 'src' | 'full') => {
    const endpoint = kind === 'src' ? '/api/download-src-zip' : '/api/download-full-zip';
    const fileName =
      kind === 'src' ? 'src-and-tests.zip' : 'resonantia-source.zip';
    setDownloadingZip(kind);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatusMessage(`Archive ${fileName} téléchargée avec succès.`);
    } catch (err: any) {
      setErrorMessage(
        err?.message
          ? `Impossible de télécharger ${fileName} (${err.message}).`
          : `Impossible de télécharger ${fileName}.`
      );
    } finally {
      setDownloadingZip(null);
    }
  };

  const handleConfirmPurge = () => {
    purgeLocalUserPreferences(userId);
    setConfirmPurgeOpen(false);
    setStatusMessage('Préférences et caches locaux réinitialisés.');
    if (onDataPurged) onDataPurged();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm animate-fadeIn flex items-center justify-center p-4">
      <div
        className={`surface animate-pop w-full shadow-xl overflow-hidden transition-all ${
          activeTab === 'url_verification' ? 'max-w-3xl' : 'max-w-lg'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-zinc-50">Paramètres de l’espace</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{userEmail || `Session ${userId.slice(0, 12)}`}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer les paramètres"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation par onglets dans Paramètres */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-3 border-b border-zinc-800 bg-zinc-950/40">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'general'
                ? 'bg-zinc-800 text-zinc-50 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Général</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url_verification')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'url_verification'
                ? 'bg-gradient-to-r from-rose-600/25 to-amber-500/20 text-zinc-50 border border-rose-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
            <span>Vérification d’URL</span>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {activeTab === 'url_verification' ? (
            <div className="space-y-6">
              {/* URLs de l'application prêtes à copier */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-50">URLs publiques de Resonantia</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Utilisez ces URLs sans mention de plateforme tierce dans votre portail développeur.
                  </p>
                </div>
                <div className="space-y-2">
                  {appUrls.map((item) => (
                    <div
                      key={item.key}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-zinc-400">{item.label}</div>
                        <code className="text-xs font-mono text-zinc-100 break-all">{item.value}</code>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(item.key, item.value)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors shrink-0 cursor-pointer self-start sm:self-center"
                      >
                        {copiedUrlKey === item.key ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copié</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copier</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outil complet de vérification de propriété d'URL */}
              <TikTokUrlVerificationCard />
            </div>
          ) : (
            <>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-zinc-200" />
              <h3 className="text-sm font-semibold text-zinc-50">Type de contenu publié</h3>
            </div>
            <div className="space-y-2.5">
              {MODES.map((m) => {
                const active = selectedMode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setSelectedMode(m.value)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-colors flex items-start justify-between gap-3 ${
                      active
                        ? 'border-rose-500 bg-zinc-950/50 text-zinc-50'
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-100'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium">{m.label}</div>
                      <div className="text-xs text-zinc-400 mt-0.5">{m.description}</div>
                    </div>
                    {active && <Check className="w-4 h-4 text-zinc-50 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
              {modeSaved && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md">
                  <Check className="w-3.5 h-3.5" />
                  Enregistré
                </span>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveMode}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer et appliquer'}
              </button>
            </div>
            {errorMessage && (
              <div className="mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                {errorMessage}
              </div>
            )}
          </div>

          <div className="pt-5 border-t border-zinc-800 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-50">Portabilité & Confidentialité (RGPD)</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Vos fiches éditoriales, expérimentations, catalogues musicaux et autorisations de repost sont stockés localement sur cet appareil sans partage tiers.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleExportWorkspace}
                className="inline-flex items-center gap-2 px-3.5 py-2 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800/60 text-zinc-100 text-xs font-medium rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter mes données (JSON)</span>
              </button>

              {!confirmPurgeOpen ? (
                <button
                  type="button"
                  onClick={() => setConfirmPurgeOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 border border-rose-500/30 bg-zinc-900 hover:bg-rose-500/10 text-rose-300 text-xs font-medium rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purger préférences locales</span>
                </button>
              ) : (
                <div className="w-full p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-rose-300">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Confirmer la suppression des préférences locales et mémoires de session ?</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmPurge}
                      className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-medium rounded-md"
                    >
                      Confirmer la purge
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmPurgeOpen(false)}
                      className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-medium rounded-md"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-5 border-t border-zinc-800 space-y-3">
            <div className="flex items-center gap-2">
              <FileArchive className="w-4 h-4 text-zinc-200" />
              <h3 className="text-sm font-semibold text-zinc-50">Code source de l’application (ZIP)</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Téléchargez directement depuis votre session le dossier <code className="font-mono">src/</code> + <code className="font-mono">tests/</code> ou l’application complète prête à exécuter.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={downloadingZip !== null}
                onClick={() => handleDownloadSourceZip('src')}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {downloadingZip === 'src' ? 'Téléchargement...' : 'Télécharger src/ + tests/ (.zip)'}
                </span>
              </button>
              <button
                type="button"
                disabled={downloadingZip !== null}
                onClick={() => handleDownloadSourceZip('full')}
                className="inline-flex items-center gap-2 px-3.5 py-2 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800/60 text-zinc-100 text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {downloadingZip === 'full' ? 'Téléchargement...' : 'Projet complet prêt à tourner (.zip)'}
                </span>
              </button>
            </div>
          </div>

          {statusMessage && (
            <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-800 text-xs text-zinc-100">
              {statusMessage}
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
