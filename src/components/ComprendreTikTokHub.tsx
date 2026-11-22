import React, { useEffect, useMemo, useState } from 'react';
import { CentralAccountAnalytics, PrePublishChecklistItem } from '../types';
import { getComplianceChecklist, saveComplianceChecklist } from '../services/db';
import {
  DEFAULT_PRE_PUBLISH_CHECKLIST,
  SANCTION_APPEAL_GUIDE,
  TIKTOK_OFFICIAL_DOCS,
  TIKTOK_RULE_CATEGORIES,
  TIKTOK_VISIBILITY_STATES,
  bindOfficialDocsWithAccountData,
  getDocsByCategory,
  searchOfficialDocs,
} from '../utils/tiktokOfficialDocsEngine';
import {
  BookOpen,
  CheckSquare,
  ExternalLink,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

interface ComprendreTikTokHubProps {
  userId: string;
  centralAnalytics?: CentralAccountAnalytics | null;
}

type HubSection = 'regles_officiel' | 'eviter_restrictions' | 'checklist' | 'sanctions_appels';

const DOC_CATEGORIES = [
  'Toutes',
  'Distribution & Recommandation',
  'Création & Contenu',
  'Creator Search Insights & SEO',
  'Formats & Durées',
  'Communauté & Sécurité',
];

export const ComprendreTikTokHub: React.FC<ComprendreTikTokHubProps> = ({
  userId,
  centralAnalytics,
}) => {
  const [activeSection, setActiveSection] = useState<HubSection>('regles_officiel');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Toutes');
  const [checklist, setChecklist] = useState<PrePublishChecklistItem[]>(
    DEFAULT_PRE_PUBLISH_CHECKLIST
  );
  const [checklistSavedMsg, setChecklistSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const saved = await getComplianceChecklist(userId);
      if (saved && saved.length > 0) setChecklist(saved);
    })();
  }, [userId]);

  const boundDocs = useMemo(
    () => bindOfficialDocsWithAccountData(centralAnalytics, TIKTOK_OFFICIAL_DOCS),
    [centralAnalytics]
  );

  const visibleDocs = useMemo(() => {
    const byCat = getDocsByCategory(selectedCategory, boundDocs);
    return searchOfficialDocs(searchQuery, byCat);
  }, [boundDocs, selectedCategory, searchQuery]);

  const handleToggleChecklist = async (id: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setChecklist(updated);
    await saveComplianceChecklist(userId, updated);
    setChecklistSavedMsg('Checklist sauvegardée.');
  };

  const handleResetChecklist = async () => {
    const reset = DEFAULT_PRE_PUBLISH_CHECKLIST.map((item) => ({ ...item, checked: false }));
    setChecklist(reset);
    await saveComplianceChecklist(userId, reset);
    setChecklistSavedMsg('Checklist réinitialisée pour votre prochaine vidéo.');
  };

  const checkedCount = checklist.filter((c) => c.checked).length;

  return (
    <div className="space-y-6">
      <div className="surface p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Documentation officielle vérifiée · Reliée à vos statistiques réelles</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight text-balance">
              Guide &amp; Règles — Distribution &amp; Conformité
            </h1>
            <p className="text-sm text-zinc-300 mt-1 max-w-3xl">
              Chaque sujet distingue rigoureusement : les faits officiels confirmés, ce que vos chiffres montrent, ce qui reste une hypothèse à tester et les critères non publiés.
            </p>
          </div>
          <div className="text-xs text-zinc-400 tabular-nums shrink-0">
            Vérification avant publication : {checkedCount}/{checklist.length}
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-zinc-800/70">
          {[
            { id: 'regles_officiel' as const, label: 'Distribution & Faits officiels' },
            { id: 'eviter_restrictions' as const, label: 'Publier sans restrictions évitables' },
            { id: 'checklist' as const, label: `Checklist avant publication (${checkedCount}/${checklist.length})` },
            { id: 'sanctions_appels' as const, label: 'Sanctions & Appels' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                activeSection === tab.id
                  ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white border-rose-500'
                  : 'bg-zinc-900/70 text-zinc-200 border-zinc-800 hover:bg-zinc-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1 : Official Docs + Live Account Binding */}
      {activeSection === 'regles_officiel' && (
        <div className="space-y-4">
          <div className="surface p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une règle, Creator Search, complétion, droits…"
                className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs border border-zinc-700 rounded-lg bg-zinc-900/70"
            >
              {DOC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {visibleDocs.map((doc) => (
              <div key={doc.id} className="surface p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-zinc-400">
                      {doc.category} · {doc.sourceName} · {doc.lastUpdated}
                    </div>
                    <h2 className="text-base font-semibold text-zinc-50 mt-1">{doc.title}</h2>
                  </div>
                  <a
                    href={doc.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-200 hover:text-zinc-50 shrink-0"
                  >
                    <span>Source</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <p className="text-xs text-zinc-200 leading-relaxed bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                  {doc.officialExcerpt}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="font-semibold text-emerald-300 mb-1">1. Faits officiels TikTok</div>
                    <ul className="space-y-1 text-zinc-200">
                      {doc.confirmedByTikTok.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-50 mb-1">2. Observé sur votre compte</div>
                    <ul className="space-y-1 text-zinc-200">
                      {doc.observedByAccountData.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold text-indigo-300 mb-1">3. Hypothèse à tester</div>
                    <ul className="space-y-1 text-zinc-200">
                      {doc.hypothesesToTest.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold text-amber-300 mb-1">4. Non divulgué / Inconnu</div>
                    <ul className="space-y-1 text-zinc-300">
                      {doc.unknownOrUndocumented.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2 : 5 visibility states + 10 rule categories */}
      {activeSection === 'eviter_restrictions' && (
        <div className="space-y-6">
          <div className="surface p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-50">
              Les 5 statuts de visibilité TikTok
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TIKTOK_VISIBILITY_STATES.map((st) => (
                <div key={st.id} className="p-4 rounded-lg border border-zinc-800 bg-zinc-950/50 space-y-2">
                  <div className="text-xs font-semibold text-zinc-50">{st.label}</div>
                  <p className="text-xs text-zinc-200 leading-relaxed">{st.meaning}</p>
                  <p className="text-xs text-zinc-300 pt-2 border-t border-zinc-800">
                    Action : {st.recommendedAction}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-50">
              Les 10 catégories de règles communautaires et légales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TIKTOK_RULE_CATEGORIES.map((rule) => (
                <div key={rule.id} className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/70 space-y-1.5">
                  <h3 className="text-sm font-semibold text-zinc-50">{rule.title}</h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">{rule.summary}</p>
                  <p className="text-xs text-zinc-100 pt-1">
                    Bonne pratique : {rule.safePractice}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3 : Interactive Pre-Publish Checklist */}
      {activeSection === 'checklist' && (
        <div className="surface p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-zinc-100" />
              <h2 className="text-base font-semibold text-zinc-50">
                Checklist interactive avant publication ({checkedCount}/{checklist.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={handleResetChecklist}
              className="px-3 py-1.5 text-xs font-medium border border-zinc-700 rounded-lg hover:bg-zinc-800/60 text-zinc-200"
            >
              Réinitialiser pour la prochaine vidéo
            </button>
          </div>

          <div className="divide-y divide-zinc-800">
            {checklist.map((item) => (
              <label
                key={item.id}
                className="py-3.5 flex items-start gap-3 cursor-pointer hover:bg-zinc-800/60 px-2 rounded-lg transition-colors"
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => handleToggleChecklist(item.id)}
                  className="mt-1 rounded border-zinc-700"
                />
                <div>
                  <div className={`text-sm font-medium ${item.checked ? 'text-emerald-300' : 'text-zinc-50'}`}>
                    {item.label}
                  </div>
                  <div className="text-xs text-zinc-300 mt-0.5">{item.description}</div>
                </div>
              </label>
            ))}
          </div>

          {checkedCount === checklist.length && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Toutes les vérifications préalables sont validées pour cette publication.</span>
            </div>
          )}
          {checklistSavedMsg && (
            <div className="text-xs text-zinc-400">{checklistSavedMsg}</div>
          )}
        </div>
      )}

      {/* SECTION 4 : Sanctions & Appeals */}
      {activeSection === 'sanctions_appels' && (
        <div className="surface p-6 space-y-5">
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300 leading-relaxed space-y-1">
              <div className="font-semibold">Mise au point factuelle (« shadowban » vs données vérifiables)</div>
              <p>{SANCTION_APPEAL_GUIDE.shadowbanClarification}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-50">
              Procédure officielle de vérification et d’appel
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SANCTION_APPEAL_GUIDE.steps.map((st) => (
                <div key={st.stepNumber} className="p-4 rounded-lg border border-zinc-800 bg-zinc-950/50 space-y-2">
                  <div className="text-xs font-medium text-zinc-400 tabular-nums">Étape 0{st.stepNumber}</div>
                  <div className="text-sm font-semibold text-zinc-50">{st.title}</div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{st.description}</p>
                  <a
                    href={st.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-100 hover:underline pt-1"
                  >
                    <span>Consulter la page officielle</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex flex-wrap gap-3">
            {SANCTION_APPEAL_GUIDE.officialLinks.map((lnk) => (
              <a
                key={lnk.url}
                href={lnk.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-100 hover:bg-zinc-800/60"
              >
                <span>{lnk.label}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
