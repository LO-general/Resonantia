import React, { useEffect, useMemo, useState } from 'react';
import {
  RepostAuthorizationStatus,
  RepostItem,
  TikTokOfficialVideo,
  VideoEditorialMetadata,
} from '../types';
import {
  checkDuplicateRepost,
  deleteRepostItem,
  getRepostItems,
  saveRepostItem,
} from '../services/db';
import {
  REPOST_BEST_PRACTICES,
  compareCreationVsRepost,
  validateRepostRights,
} from '../utils/repostEngine';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Music,
  Plus,
  Repeat,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { MeterBar } from './ui';

interface MonRepostViewProps {
  userId: string;
  videos: TikTokOfficialVideo[];
  editorialMap?: Record<string, VideoEditorialMetadata>;
  onItemsUpdated?: () => void;
}

const AUTH_STATUS_LABELS: Record<RepostAuthorizationStatus, string> = {
  en_attente: 'En attente d’accord écrit',
  obtenue: 'Autorisation écrite obtenue',
  refusee: 'Autorisation refusée',
  non_requise_domaine_public: 'Licence libre / Domaine public vérifié',
};

const MODE_LABELS: Record<NonNullable<RepostItem['repostMode']>, string> = {
  native_repost: 'Bouton Reposter natif TikTok',
  duet: 'Duo (Duet) natif',
  stitch: 'Collage (Stitch) natif',
  authorized_reupload: 'Ré-upload autorisé par écrit',
};

export const MonRepostView: React.FC<MonRepostViewProps> = ({
  userId,
  videos,
  editorialMap,
  onItemsUpdated,
}) => {
  const [items, setItems] = useState<RepostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [creatorHandle, setCreatorHandle] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState('TikTok');
  const [contentType, setContentType] = useState('Extrait vidéo');
  const [category, setCategory] = useState('Éditorial');
  const [repostMode, setRepostMode] =
    useState<NonNullable<RepostItem['repostMode']>>('native_repost');
  const [authorizationStatus, setAuthorizationStatus] =
    useState<RepostAuthorizationStatus>('en_attente');
  const [authorizationDate, setAuthorizationDate] = useState('');
  const [usageTerms, setUsageTerms] = useState('');
  const [authorizationProof, setAuthorizationProof] = useState('');
  const [modificationAllowed, setModificationAllowed] = useState<boolean>(false);
  const [commercialUseAllowed, setCommercialUseAllowed] = useState<boolean>(false);
  const [musicRightsVerified, setMusicRightsVerified] = useState<boolean>(false);
  const [repostReason, setRepostReason] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('18:30');

  const reload = async () => {
    setLoading(true);
    try {
      const loaded = await getRepostItems(userId);
      setItems(loaded.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [userId]);

  const draftValidation = useMemo(
    () =>
      validateRepostRights({
        tiktokUrl,
        creatorHandle,
        repostMode,
        authorizationStatus,
        authorizationDate,
        usageTerms,
        authorizationProof,
        modificationAllowed,
        commercialUseAllowed,
        musicRightsVerified,
      }),
    [
      tiktokUrl,
      creatorHandle,
      repostMode,
      authorizationStatus,
      authorizationDate,
      usageTerms,
      authorizationProof,
      modificationAllowed,
      commercialUseAllowed,
      musicRightsVerified,
    ]
  );

  const creationVsRepost = useMemo(
    () => compareCreationVsRepost(videos, editorialMap),
    [videos, editorialMap]
  );

  const handleSaveDraft = async (targetStatus: 'scheduled' | 'reposted') => {
    setFormError(null);
    setFormSuccess(null);

    if (!title.trim()) {
      setFormError('Le titre descriptif du contenu est requis.');
      return;
    }

    if (targetStatus === 'reposted' && !draftValidation.isReadyForPublication) {
      setFormError(
        `Validation bloquée : ${draftValidation.blockingReasons.join(' ')}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const dup = await checkDuplicateRepost(tiktokUrl, scheduledDate, userId);
      if (dup.isDuplicate) {
        setFormError(
          `Ce lien source est déjà planifié à la date du ${scheduledDate} (« ${dup.conflictingItem?.title} »).`
        );
        return;
      }

      const newItem: RepostItem = {
        id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId,
        tiktokUrl: tiktokUrl.trim(),
        title: title.trim(),
        creatorHandle: creatorHandle.trim(),
        sourcePlatform,
        contentType,
        category,
        repostReason:
          repostReason.trim() || 'Apport de valeur éditoriale / commentaire',
        scheduledDate,
        scheduledTime,
        status: targetStatus,
        createdAt: new Date().toISOString(),
        repostedAt: targetStatus === 'reposted' ? new Date().toISOString() : undefined,
        repostMode,
        authorizationStatus,
        authorizationDate: authorizationDate || undefined,
        usageTerms: usageTerms.trim() || undefined,
        authorizationProof: authorizationProof.trim() || undefined,
        modificationAllowed,
        commercialUseAllowed,
        musicRightsVerified,
      };

      await saveRepostItem(newItem);
      await reload();
      if (onItemsUpdated) onItemsUpdated();

      setTitle('');
      setTiktokUrl('');
      setCreatorHandle('');
      setUsageTerms('');
      setAuthorizationProof('');
      setRepostReason('');
      setFormSuccess(
        targetStatus === 'reposted'
          ? 'Fiche repost validée et archivée avec son dossier de droits.'
          : 'Fiche enregistrée en préparation (vérification des droits requise avant publication).'
      );
    } catch (err: any) {
      console.error('Error saving repost item:', err);
      setFormError(err?.message || "Impossible d'enregistrer cette fiche repost.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidateExisting = async (item: RepostItem) => {
    const check = validateRepostRights(item);
    if (!check.isReadyForPublication) {
      setFormError(`Validation bloquée pour « ${item.title} » : ${check.blockingReasons.join(' ')}`);
      return;
    }
    try {
      await saveRepostItem({
        ...item,
        status: 'reposted',
        repostedAt: new Date().toISOString(),
      });
      await reload();
      if (onItemsUpdated) onItemsUpdated();
    } catch (err: any) {
      setFormError(err?.message || "Impossible de valider cette fiche repost.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRepostItem(id);
      setConfirmDeleteId(null);
      await reload();
      if (onItemsUpdated) onItemsUpdated();
    } catch (err: any) {
      setFormError(err?.message || "Impossible de supprimer cette fiche repost.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1">
              <Repeat className="w-3.5 h-3.5" />
              <span>Conformité & Droits d’auteur · Outils natifs TikTok</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight text-balance">
              Mon Repost — Gestion légale & valeur éditoriale
            </h1>
            <p className="text-sm text-zinc-300 mt-1 max-w-3xl">
              Enregistrez vos autorisations écrites, vérifiez les droits musicaux séparément et comparez objectivement vos performances Création vs Repost sans contournement.
            </p>
          </div>
          <div className="text-xs text-zinc-400 tabular-nums shrink-0">
            {items.length} fiche{items.length > 1 ? 's' : ''} archivée{items.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Neutral comparative KPI strip (Creation vs Repost) */}
      <div className="surface p-6">
        <h2 className="text-sm font-semibold text-zinc-50 mb-3">
          Comparaison neutre sur votre compte : Création vs Repost
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
            <div className="text-xs text-zinc-400">Créations originales classées</div>
            <div className="text-xl font-bold text-zinc-50 mt-1 tabular-nums">
              {creationVsRepost.creationCount} vidéo{creationVsRepost.creationCount > 1 ? 's' : ''}
            </div>
            <div className="text-xs text-zinc-300 mt-1 tabular-nums">
              {creationVsRepost.creationMedianViews !== null
                ? `Médiane ${creationVsRepost.creationMedianViews.toLocaleString('fr-FR')} vues · Eng. ${creationVsRepost.creationGlobalEngagementRate ?? 0}%`
                : 'Aucune vidéo classée en Création'}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
            <div className="text-xs text-zinc-400">Reposts classés</div>
            <div className="text-xl font-bold text-zinc-50 mt-1 tabular-nums">
              {creationVsRepost.repostCount} vidéo{creationVsRepost.repostCount > 1 ? 's' : ''}
            </div>
            <div className="text-xs text-zinc-300 mt-1 tabular-nums">
              {creationVsRepost.repostMedianViews !== null
                ? `Médiane ${creationVsRepost.repostMedianViews.toLocaleString('fr-FR')} vues · Eng. ${creationVsRepost.repostGlobalEngagementRate ?? 0}%`
                : 'Aucune vidéo classée en Repost'}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800">
            <div className="text-xs text-zinc-400">Abonnés attribués (saisies Studio)</div>
            <div className="text-sm font-semibold text-zinc-50 mt-1 tabular-nums">
              Création : {creationVsRepost.creationTotalAttributedFollowers !== null ? `${creationVsRepost.creationTotalAttributedFollowers} ab.` : 'Non saisi'} · Repost : {creationVsRepost.repostTotalAttributedFollowers !== null ? `${creationVsRepost.repostTotalAttributedFollowers} ab.` : 'Non saisi'}
            </div>
            <div className="text-xs text-zinc-300 mt-1">
              Classez la nature de chaque vidéo depuis son panneau « Détails ».
            </div>
          </div>
        </div>
        {creationVsRepost.creationCount > 0 && creationVsRepost.repostCount > 0 && (() => {
          const ce = Number(creationVsRepost.creationGlobalEngagementRate) || 0;
          const re = Number(creationVsRepost.repostGlobalEngagementRate) || 0;
          const sc = Math.max(ce, re, 0.01) * 1.25;
          return (
            <div className="mb-4 grid grid-cols-1 gap-5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 md:grid-cols-2">
              <MeterBar label="Engagement global : Création" value={ce} max={sc} color="#fb7185" hint={`${creationVsRepost.creationCount} vidéo(s)`} />
              <MeterBar label="Engagement global : Repost" value={re} max={sc} color="#818cf8" hint={`${creationVsRepost.repostCount} vidéo(s)`} />
            </div>
          );
        })()}
        <p className="text-xs text-zinc-300 leading-relaxed">{creationVsRepost.neutralObservation}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form: Rights sheet */}
        <div className="surface lg:col-span-7 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-zinc-100" />
            <h2 className="text-base font-semibold text-zinc-50">
              Nouvelle fiche Repost & Contrôle des droits
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-200 mb-1">
                Titre ou sujet de la publication *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Analyse du passage sur scène avec commentaire..."
                className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-200 mb-1">
                Lien exact de l’œuvre originale *
              </label>
              <input
                type="url"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="https://www.tiktok.com/@createur/video/..."
                className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-200 mb-1">
                Créateur / Ayant droit source (@pseudo) *
              </label>
              <input
                type="text"
                value={creatorHandle}
                onChange={(e) => setCreatorHandle(e.target.value)}
                placeholder="@createur_original"
                className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-200 mb-1">
                Mode de republication choisi
              </label>
              <select
                value={repostMode}
                onChange={(e) => setRepostMode(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg bg-zinc-900/70 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {Object.entries(MODE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-200 mb-1">
                Plateforme & Type source
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={sourcePlatform}
                  onChange={(e) => setSourcePlatform(e.target.value)}
                  className="px-3 py-2 text-sm border border-zinc-700 rounded-lg"
                  aria-label="Plateforme source"
                />
                <input
                  type="text"
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="px-3 py-2 text-sm border border-zinc-700 rounded-lg"
                  aria-label="Type de contenu"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-200 mb-1">
                Statut d’autorisation
              </label>
              <select
                value={authorizationStatus}
                onChange={(e) =>
                  setAuthorizationStatus(e.target.value as RepostAuthorizationStatus)
                }
                className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg bg-zinc-900/70 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {Object.entries(AUTH_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-200 mb-1">
                Date d’obtention de l’accord
              </label>
              <input
                type="date"
                value={authorizationDate}
                onChange={(e) => setAuthorizationDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-200 mb-1">
                Conditions d’utilisation accordées (crédit, périmètre, durée)
              </label>
              <input
                type="text"
                value={usageTerms}
                onChange={(e) => setUsageTerms(e.target.value)}
                placeholder="Ex : Crédit obligatoire en légende, pas de modification des images, usage non commercial"
                className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-200 mb-1">
                Référence de preuve écrite (e-mail, DM archivé, lien de licence CC BY 4.0)
              </label>
              <input
                type="text"
                value={authorizationProof}
                onChange={(e) => setAuthorizationProof(e.target.value)}
                placeholder="Ex : Accord reçu par e-mail le 12/11/2026 — objet Autorisation extrait"
                className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2 flex flex-wrap gap-4 pt-1">
              <label className="inline-flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modificationAllowed}
                  onChange={(e) => setModificationAllowed(e.target.checked)}
                  className="rounded border-zinc-700"
                />
                <span>Modification / montage autorisé</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={commercialUseAllowed}
                  onChange={(e) => setCommercialUseAllowed(e.target.checked)}
                  className="rounded border-zinc-700"
                />
                <span>Usage commercial autorisé</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={musicRightsVerified}
                  onChange={(e) => setMusicRightsVerified(e.target.checked)}
                  className="rounded border-zinc-700"
                />
                <span className="inline-flex items-center gap-1">
                  <Music className="w-3.5 h-3.5 text-zinc-400" />
                  Droits musicaux vérifiés séparément
                </span>
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-200 mb-1">
                Apport éditorial / Valeur ajoutée prévue
              </label>
              <input
                type="text"
                value={repostReason}
                onChange={(e) => setRepostReason(e.target.value)}
                placeholder="Pourquoi ce contenu apporte une analyse ou un angle nouveau à votre audience"
                className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-200 mb-1">
                Date prévue
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-200 mb-1">
                Heure prévue
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg"
              />
            </div>
          </div>

          {/* Live Compliance Gate Preview */}
          <div
            className={`p-4 rounded-lg border text-xs space-y-1.5 ${
              draftValidation.isReadyForPublication
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="font-semibold flex items-center gap-1.5">
              {draftValidation.isReadyForPublication ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Conditions minimales réunies pour validation</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-300" />
                  <span>Publication bloquée tant que ces éléments manquent :</span>
                </>
              )}
            </div>
            {draftValidation.blockingReasons.map((r, i) => (
              <div key={i}>• {r}</div>
            ))}
            {draftValidation.warnings.map((w, i) => (
              <div key={`w-${i}`} className="text-zinc-200">
                Attention : {w}
              </div>
            ))}
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
              {formSuccess}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSaveDraft('scheduled')}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-zinc-700 bg-zinc-900/70 hover:bg-zinc-800/60 text-zinc-50 text-xs font-medium rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enregistrer en attente</span>
            </button>
            <button
              type="button"
              disabled={submitting || !draftValidation.isReadyForPublication}
              onClick={() => handleSaveDraft('reposted')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-45"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Valider avec preuve de droits</span>
            </button>
          </div>
        </div>

        {/* Educational Legal & Native Best Practices */}
        <div className="lg:col-span-5 space-y-4">
          {REPOST_BEST_PRACTICES.map((sec) => (
            <div key={sec.id} className="surface p-5 space-y-2.5">
              <div className="text-xs font-medium text-zinc-400">{sec.badge}</div>
              <h3 className="text-sm font-semibold text-zinc-50">{sec.title}</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">{sec.summary}</p>
              <ul className="space-y-1.5 text-xs text-zinc-200 pt-1">
                {sec.points.map((pt, i) => (
                  <li key={i}>• {pt}</li>
                ))}
              </ul>
              <div className="pt-2 border-t border-zinc-800/70 space-y-1">
                <div className="text-xs font-medium text-rose-300">Idées reçues à écarter :</div>
                {sec.mythsToReject.map((m, i) => (
                  <p key={i} className="text-xs text-zinc-300 leading-relaxed">
                    {m}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stored Repost Archive List */}
      <div className="surface p-6">
        <h2 className="text-base font-semibold text-zinc-50 mb-4">
          Dossiers archivés ({items.length})
        </h2>
        {loading ? (
          <div className="text-xs text-zinc-400 py-6">Chargement des fiches…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-zinc-300 py-8 text-center border border-dashed border-zinc-800 rounded-lg">
            Aucune fiche Repost enregistrée pour le moment. Utilisez le formulaire ci-dessus pour documenter une autorisation ou une utilisation native.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {items.map((item) => {
              const check = validateRepostRights(item);
              return (
                <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span className="font-medium text-zinc-100">
                        {MODE_LABELS[item.repostMode || 'authorized_reupload']}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{AUTH_STATUS_LABELS[item.authorizationStatus || 'en_attente']}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {item.scheduledDate} {item.scheduledTime}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-zinc-50 truncate">{item.title}</div>
                    <div className="text-xs text-zinc-300">
                      Source : {item.creatorHandle || 'Non précisé'}
                      {item.authorizationProof ? ` · Preuve : ${item.authorizationProof}` : ''}
                    </div>
                    {!check.isReadyForPublication && (
                      <div className="text-xs text-amber-300">
                        Bloquant : {check.blockingReasons[0]}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.tiktokUrl && (
                      <a
                        href={item.tiktokUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-zinc-800 rounded-lg text-xs text-zinc-200 hover:bg-zinc-800/60"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Source</span>
                      </a>
                    )}
                    {item.status !== 'reposted' && (
                      <button
                        type="button"
                        disabled={!check.isReadyForPublication}
                        onClick={() => handleValidateExisting(item)}
                        className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-medium rounded-lg disabled:opacity-40"
                      >
                        Valider
                      </button>
                    )}
                    {item.status === 'reposted' && (
                      <span className="text-xs font-medium text-emerald-300 px-2">Validé</span>
                    )}

                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="px-2.5 py-1.5 bg-rose-700 text-white text-xs rounded-lg"
                        >
                          Supprimer
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1.5 border border-zinc-800 text-xs rounded-lg"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(item.id)}
                        aria-label={`Supprimer ${item.title}`}
                        className="p-1.5 text-zinc-500 hover:text-rose-300 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
