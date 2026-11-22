import React, { useEffect, useMemo, useState } from 'react';
import {
  MusicAmbiance,
  MusicCatalogTrack,
  TikTokOfficialVideo,
  VideoEditorialMetadata,
} from '../types';
import { getMusicCatalogTracks, saveMusicCatalogTracks } from '../services/db';
import {
  DEFAULT_INTERNAL_CATALOG,
  MUSIC_AMBIANCES,
  buildAccountSoundHistoryCatalog,
  exportMusicCatalogJson,
  parseImportedMusicCatalog,
  recommendMusicForBrief,
} from '../utils/musicAdvisorEngine';
import { Download, Info, Music, Plus, Upload } from 'lucide-react';

interface MusicAdvisorViewProps {
  videos: TikTokOfficialVideo[];
  editorialMap?: Record<string, VideoEditorialMetadata>;
}

export const MusicAdvisorView: React.FC<MusicAdvisorViewProps> = ({
  videos,
  editorialMap,
}) => {
  const [userCatalog, setUserCatalog] = useState<MusicCatalogTrack[]>([]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Sport / Musique');
  const [desiredEmotion, setDesiredEmotion] = useState('Émotion & progression');
  const [ambiance, setAmbiance] = useState<MusicAmbiance>('Cinématographique');
  const [desiredRhythm, setDesiredRhythm] = useState<'lent' | 'modéré' | 'rapide'>('modéré');
  const [sequenceType, setSequenceType] = useState('Récit voix off');
  const [accountType, setAccountType] = useState<'personnel' | 'business'>('personnel');
  const [territory, setTerritory] = useState('France');

  // Add track / JSON import states
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [catalogNotice, setCatalogNotice] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [newAmbiance, setNewAmbiance] = useState<MusicAmbiance>('Énergique');

  const loadCatalog = async () => {
    const stored = await getMusicCatalogTracks();
    setUserCatalog(stored);
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const mergedCatalog = useMemo(() => {
    const map = new Map<string, MusicCatalogTrack>();
    for (const t of DEFAULT_INTERNAL_CATALOG) map.set(t.id, t);
    for (const t of userCatalog) map.set(t.id, t);
    return Array.from(map.values());
  }, [userCatalog]);

  const recommendations = useMemo(
    () =>
      recommendMusicForBrief(
        {
          subject,
          category,
          desiredEmotion,
          ambiance,
          desiredRhythm,
          sequenceType,
          accountType,
          territory,
        },
        mergedCatalog,
        videos,
        editorialMap
      ),
    [
      subject,
      category,
      desiredEmotion,
      ambiance,
      desiredRhythm,
      sequenceType,
      accountType,
      territory,
      mergedCatalog,
      videos,
      editorialMap,
    ]
  );

  const accountSoundHistory = useMemo(
    () => buildAccountSoundHistoryCatalog(videos, editorialMap),
    [videos, editorialMap]
  );

  const handleAddTrack = async () => {
    if (!newTitle.trim()) return;
    const track: MusicCatalogTrack = {
      id: `user_track_${Date.now()}`,
      title: newTitle.trim(),
      artist: newArtist.trim() || 'Catalogue personnel',
      ambiance: newAmbiance,
      rhythm: desiredRhythm,
      idealSequenceTypes: [sequenceType],
      recommendedCategories: [category],
      emotionalKeywords: desiredEmotion
        .toLowerCase()
        .split(/[\s,]+/)
        .filter((w) => w.length >= 3),
      commercialMusicLibraryEligible:
        accountType === 'business' ? 'verified_cml' : 'personal_only_verify',
      territoryNote: `Vérifier les droits dans TikTok (${territory}) avant export.`,
      source: 'user_imported',
      addedAt: new Date().toISOString(),
    };
    await saveMusicCatalogTracks([track]);
    setNewTitle('');
    setNewArtist('');
    setCatalogNotice(`Piste « ${track.title} » ajoutée à votre catalogue local.`);
    await loadCatalog();
  };

  const handleImportJson = async () => {
    const { tracks, errors } = parseImportedMusicCatalog(importJson);
    if (tracks.length > 0) {
      await saveMusicCatalogTracks(tracks);
      await loadCatalog();
      setImportJson('');
      setCatalogNotice(
        `${tracks.length} piste(s) importée(s).${errors.length > 0 ? ` (${errors.length} ligne(s) ignorée(s))` : ''}`
      );
    } else {
      setCatalogNotice(errors.join(' ') || 'Aucune piste valide trouvée dans le JSON.');
    }
  };

  const handleExportCatalog = () => {
    const content = exportMusicCatalogJson(mergedCatalog);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalogue_musical_tiktok_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="surface p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1">
              <Music className="w-3.5 h-3.5" />
              <span>Catalogue local ({mergedCatalog.length} références) · Historique réel du compte</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight text-balance">
              Conseiller Musical
            </h1>
            <p className="text-sm text-zinc-300 mt-1 max-w-3xl">
              Croisez votre intention émotionnelle, le type de séquence, l’historique audio de vos vidéos et la conformité Compte Personnel vs Business (CML).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowImport((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-zinc-700 bg-zinc-900/70 hover:bg-zinc-800/60 text-xs font-medium text-zinc-100 rounded-lg"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importer / Ajouter</span>
            </button>
            <button
              type="button"
              onClick={handleExportCatalog}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-zinc-700 bg-zinc-900/70 hover:bg-zinc-800/60 text-xs font-medium text-zinc-100 rounded-lg"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter JSON</span>
            </button>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800 flex items-start gap-2.5 text-xs text-zinc-200">
          <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <p>
            Avertissement : la disponibilité réelle d’un son dépend du type de compte (Personnel vs Commercial Music Library) et du territoire ({territory}). Aucune musique ne garantit une portée algorithmique minimale : c’est la rétention visuelle et l’accroche qui priment.
          </p>
        </div>
      </div>

      {showImport && (
        <div className="surface p-6 space-y-5">
          <h2 className="text-sm font-semibold text-zinc-50">
            Enrichir le catalogue local (ajout manuel ou import JSON)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nom de la piste audio"
              className="px-3 py-2 text-xs border border-zinc-700 rounded-lg"
            />
            <input
              type="text"
              value={newArtist}
              onChange={(e) => setNewArtist(e.target.value)}
              placeholder="Artiste / Source CML"
              className="px-3 py-2 text-xs border border-zinc-700 rounded-lg"
            />
            <select
              value={newAmbiance}
              onChange={(e) => setNewAmbiance(e.target.value as MusicAmbiance)}
              className="px-3 py-2 text-xs border border-zinc-700 rounded-lg bg-zinc-900/70"
            >
              {MUSIC_AMBIANCES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddTrack}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-rose-600 to-amber-500 text-white text-xs font-medium rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter cette piste</span>
            </button>
          </div>

          <div className="space-y-2 pt-3 border-t border-zinc-800">
            <label className="block text-xs font-medium text-zinc-200">
              Import JSON (tableau d’objets avec champ <code>title</code>, <code>ambiance</code>, <code>rhythm</code>…)
            </label>
            <textarea
              rows={3}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='[{"title": "Nom du son", "artist": "Artiste", "ambiance": "Épique", "rhythm": "rapide"}]'
              className="w-full px-3 py-2 text-xs font-mono border border-zinc-700 rounded-lg"
            />
            <button
              type="button"
              onClick={handleImportJson}
              className="px-3.5 py-2 border border-zinc-700 bg-zinc-900/70 hover:bg-zinc-800/60 text-xs font-medium rounded-lg"
            >
              Importer le JSON
            </button>
          </div>

          {catalogNotice && (
            <div className="text-xs text-zinc-100 bg-zinc-800 px-3 py-2 rounded-lg">
              {catalogNotice}
            </div>
          )}
        </div>
      )}

      {/* Brief Inputs */}
      <div className="surface p-6 space-y-5">
        <h2 className="text-base font-semibold text-zinc-50">1. Définir le brief éditorial de la vidéo</h2>

        <div>
          <label className="block text-xs font-medium text-zinc-200 mb-2">
            Ambiance souhaitée (8 ambiances)
          </label>
          <div className="flex flex-wrap gap-2">
            {MUSIC_AMBIANCES.map((amb) => {
              const active = ambiance === amb;
              return (
                <button
                  key={amb}
                  type="button"
                  onClick={() => setAmbiance(amb)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    active
                      ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white border-rose-500'
                      : 'bg-zinc-900/70 text-zinc-200 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {amb}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-200 mb-1">Sujet de la vidéo</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex : Progression d'entraînement, récit..."
              className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-200 mb-1">Catégorie</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-200 mb-1">Émotion recherchée</label>
            <input
              type="text"
              value={desiredEmotion}
              onChange={(e) => setDesiredEmotion(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-200 mb-1">Rythme de montage</label>
            <select
              value={desiredRhythm}
              onChange={(e) => setDesiredRhythm(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg bg-zinc-900/70"
            >
              <option value="lent">Lent (plans posés)</option>
              <option value="modéré">Modéré (équilibré)</option>
              <option value="rapide">Rapide (cuts 1–2s)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-200 mb-1">Type de séquence</label>
            <input
              type="text"
              value={sequenceType}
              onChange={(e) => setSequenceType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-zinc-200 mb-1">Compte TikTok</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg bg-zinc-900/70"
              >
                <option value="personnel">Personnel</option>
                <option value="business">Business (CML)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-200 mb-1">Territoire</label>
              <input
                type="text"
                value={territory}
                onChange={(e) => setTerritory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-700 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="surface lg:col-span-8 p-6 space-y-4">
          <h2 className="text-base font-semibold text-zinc-50">
            2. Recommandations classées par adéquation ({recommendations.length})
          </h2>
          <div className="divide-y divide-zinc-800">
            {recommendations.slice(0, 6).map((rec) => (
              <div key={rec.track.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-zinc-50">{rec.track.title}</div>
                    <div className="text-xs text-zinc-400">
                      {rec.track.artist} · Ambiance {rec.track.ambiance} · Rythme {rec.track.rhythm}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-zinc-200 tabular-nums">
                    Adéquation {rec.matchScore}/100
                  </div>
                </div>
                <p className="text-xs text-zinc-200 leading-relaxed">{rec.justification}</p>
                {rec.historicalSoundStats && (
                  <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-1.5 tabular-nums">
                    Historique mesuré sur votre compte : {rec.historicalSoundStats.matchedVideoCount} vidéo(s) · médiane {rec.historicalSoundStats.medianViews.toLocaleString('fr-FR')} vues · engagement moyen {rec.historicalSoundStats.meanEngagementRate}%
                  </p>
                )}
                <p className="text-xs text-zinc-400">{rec.availabilityNotice}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Account Sound History */}
        <div className="surface lg:col-span-4 p-6 space-y-3">
          <h2 className="text-base font-semibold text-zinc-50">
            Sons mesurés sur votre compte
          </h2>
          <p className="text-xs text-zinc-300">
            Construit depuis les titres musicaux renseignés dans les fiches « Détails » de vos vidéos ou retournés lors de la synchronisation.
          </p>
          {accountSoundHistory.length === 0 ? (
            <div className="text-xs text-zinc-400 py-6 text-center border border-dashed border-zinc-800 rounded-lg">
              Aucun titre musical renseigné sur vos vidéos pour l’instant. Saisissez le nom du son dans « Détails » d’une publication pour suivre ses performances réelles ici.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {accountSoundHistory.slice(0, 8).map((s, idx) => (
                <div key={idx} className="py-3 text-xs space-y-1">
                  <div className="font-semibold text-zinc-50">{s.soundName}</div>
                  <div className="text-zinc-300 tabular-nums">
                    {s.matchedVideoCount} vidéo(s) · Médiane {s.medianViews.toLocaleString('fr-FR')} vues · {s.meanEngagementRate}% eng.
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
