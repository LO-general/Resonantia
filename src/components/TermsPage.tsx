import React from 'react';
import {
  FileText,
  Shield,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Lock,
  Scale,
  Users,
  Film,
  Zap,
  HelpCircle,
} from 'lucide-react';

interface TermsPageProps {
  onNavigateHome: () => void;
  onNavigatePrivacy: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({
  onNavigateHome,
  onNavigatePrivacy,
}) => {
  return (
    <div className="relative min-h-screen bg-[#09090b] text-zinc-50 selection:bg-rose-500/30 selection:text-white">
      <div className="aurora-bg" aria-hidden="true">
        <div className="aurora-grid" />
      </div>
      <div className="relative z-10">
      {/* Top Header */}
      <header className="bg-zinc-950/70 backdrop-blur-2xl border-b border-zinc-800/80 sticky top-0 z-30 shadow-sm shadow-black/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-200 hover:bg-zinc-800/80 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour à l'application</span>
            </button>
            <div className="h-4 w-px bg-zinc-700 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white flex items-center justify-center font-black text-xs">
                R
              </div>
              <span className="font-extrabold text-sm text-zinc-50 hidden sm:inline">
                Resonantia
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigatePrivacy}
              className="text-xs text-zinc-300 hover:text-zinc-50 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 transition cursor-pointer"
            >
              Politique de Confidentialité
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        {/* Title & Meta banner */}
        <div className="space-y-4 border-b border-zinc-800 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30">
              <Scale className="w-3.5 h-3.5" />
              <span>Document Juridique Officiel &bull; Resonantia</span>
            </div>
            <div className="text-xs text-zinc-400 font-mono bg-zinc-800 px-3 py-1 rounded-lg border border-zinc-800">
              URL : <strong>/terms</strong>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-50 tracking-tight">
            Conditions Générales d&apos;Utilisation (CGU)
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Dernière mise à jour : 21 novembre 2026 &bull; Version 1.3 &bull; Service indépendant Resonantia
          </p>
        </div>

        {/* Notice: Information to customize */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm space-y-2">
          <div className="font-bold flex items-center gap-2 text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Mention légale pour l'administrateur de l'application</span>
          </div>
          <p className="leading-relaxed">
            Les mentions encadrées entre crochets <code>[EXEMPLE]</code> représentent vos informations personnelles et juridiques à renseigner lors de la publication définitive de votre service (raison sociale, tribunal compétent, hébergeur).
          </p>
        </div>

        {/* Sections Content */}
        <div className="space-y-8 text-sm sm:text-base leading-relaxed text-zinc-200">
          {/* Article 1 */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">1</span>
              <span>Objet du Service</span>
            </h2>
            <p>
              L&apos;application web <strong>Resonantia</strong> (ci-après le « Service ») est une plateforme SaaS francophone d&apos;aide à la création, à la programmation et à l&apos;analyse de performances de vidéos courtes destinées aux créateurs indépendants.
            </p>
            <p>Le Service regroupe notamment :</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-300 text-sm">
              <li><strong>Studio Création :</strong> importation de vidéos originales, extraction d&apos;images clés pour analyse visuelle, génération de propositions de légendes et de hashtags, et programmation de publications.</li>
              <li><strong>Mon Visionnaire :</strong> évaluation pré-publication des montages préparés (résonance, rétention, adéquation éditoriale).</li>
              <li><strong>Analytics &amp; Mon Coach :</strong> tableau de bord d&apos;analyse des performances relié au compte créateur autorisé par l&apos;utilisateur, analyse causale approfondie, orientation éditoriale multi-passions et calculs statistiques déterministes.</li>
            </ul>
          </section>

          {/* Article 2 */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">2</span>
              <span>Accès au Service et Inscription</span>
            </h2>
            <p>
              L'accès au Service requiert la création d'un compte utilisateur personnel protégé par identifiant et mot de passe ou via authentification sécurisée Google Firebase.
            </p>
            <p>
              L'Utilisateur s'engage à fournir des informations exactes et à préserver la stricte confidentialité de ses identifiants. Toute action effectuée depuis un compte est présumée émaner de son titulaire légitime.
            </p>
          </section>

          {/* Article 3 */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">3</span>
              <span>Intégrations avec des Services Tiers</span>
            </h2>
            <div className="space-y-3 text-zinc-300 text-sm">
              <div className="p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800/70 space-y-1">
                <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-rose-400" />
                  <span>Réseau Social TikTok (ByteDance Ltd.)</span>
                </div>
                <p>
                  Le Service permet à l&apos;Utilisateur de connecter son compte via les interfaces officielles d&apos;authentification OAuth 2.0 (Login Kit et Display API). L&apos;Utilisateur reconnaît être soumis aux <a href="https://www.tiktok.com/legal/page/row/terms-of-service/fr" target="_blank" rel="noopener noreferrer" className="text-rose-400 underline font-semibold">Conditions d&apos;Utilisation du service tiers</a> et à ses Règles Communautaires. <strong>Resonantia</strong> est une application indépendante : elle n&apos;est ni affiliée, ni approuvée, ni sponsorisée par TikTok ou ByteDance Ltd.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800/70 space-y-1">
                <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span>API Google Gemini (Alphabet Inc.)</span>
                </div>
                <p>
                  Le Service fait appel aux modèles d'intelligence artificielle Gemini (Google Cloud) pour l'analyse visuelle de photogrammes et la suggestion de légendes. L'Utilisateur est informé que les propositions générées par l'IA ont une valeur purement indicative et créative et ne remplacent pas sa validation éditoriale.
                </p>
              </div>
            </div>
          </section>

          {/* Article 4 */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">4</span>
              <span>Engagements et Responsabilités de l'Utilisateur</span>
            </h2>
            <p>L'Utilisateur s'interdit formellement d'importer ou de programmer via le Service des contenus qui :</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300 text-sm">
              <li>Violent les droits de propriété intellectuelle, droits d'auteur ou marques de tiers.</li>
              <li>Contiennent des propos haineux, diffamatoires, violents, pédopornographiques ou contraires aux lois en vigueur.</li>
              <li>Cherchent à manipuler artificiellement les métriques TikTok par du spam ou des comportements inauthentiques coordonnés.</li>
            </ul>
            <p className="text-xs text-zinc-400 italic">
              L'Utilisateur demeure l'unique responsable civil et pénal du contenu qu'il importe, programme et publie sur ses comptes.
            </p>
          </section>

          {/* Article 5 */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">5</span>
              <span>Propriété Intellectuelle</span>
            </h2>
            <p>
              <strong>Vos Vidéos et Créations :</strong> L'Utilisateur conserve l'entière et exclusive propriété intellectuelle de toutes les vidéos, images, légendes et ressources qu'il importe ou crée sur le Service. Aucune cession de droit n'est consentie à l'Éditeur du Service.
            </p>
            <p>
              <strong>Logiciel &amp; Plateforme :</strong> L&apos;interface, l&apos;architecture logicielle, les logos, marques et codes sources de Resonantia sont la propriété exclusive de l&apos;Éditeur.
            </p>
          </section>

          {/* Article 6 */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">6</span>
              <span>Disponibilité et Limitations de Garantie</span>
            </h2>
            <p>
              Le Service est fourni « en l'état ». L'Éditeur met en œuvre des moyens raisonnables pour garantir une haute disponibilité, mais ne saurait garantir une absence totale d'interruption temporaire (maintien de serveurs, pannes réseau, limitations des quotas des API tierces TikTok ou Gemini).
            </p>
            <p>
              L'Éditeur ne garantit aucun résultat chiffré concernant le nombre de vues, l'engagement ou la viralité algorithmique d'une publication, ces éléments dépendant exclusivement des algorithmes tiers de TikTok et de l'intérêt du public.
            </p>
          </section>

          {/* Article 7 */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">7</span>
              <span>Résiliation et Suppression de Compte</span>
            </h2>
            <p>
              L'Utilisateur peut demander à tout moment la clôture de son compte et l'effacement de ses données personnelles directement depuis l'application ou en adressant un email au Responsable du Traitement.
            </p>
            <p>
              L'Éditeur se réserve le droit de suspendre sans préavis l'accès au compte d'un Utilisateur en cas de violation caractérisée des présentes CGU ou des règles de sécurité du Service.
            </p>
          </section>

          {/* Article 8 */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">8</span>
              <span>Mentions Légales & Informations à Compléter</span>
            </h2>
            <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 space-y-2 text-xs">
              <div className="font-bold text-zinc-100">
                Informations légales à personnaliser par le propriétaire de l'application :
              </div>
              <ul className="space-y-1 text-zinc-300 font-mono">
                <li>&bull; Éditeur du service : <code>[Nom ou Raison Sociale de votre société]</code></li>
                <li>&bull; Forme juridique & capital : <code>[Ex : SAS / SARL au capital de XXX €]</code></li>
                <li>&bull; Siège social : <code>[Adresse postale complète]</code></li>
                <li>&bull; Numéro RCS / SIRET : <code>[Numéro d'immatriculation]</code></li>
                <li>&bull; Directeur de publication : <code>[Nom et prénom du responsable légal]</code></li>
                <li>&bull; Email de contact juridique : <code>[contact@votre-domaine.com]</code></li>
                <li>&bull; Hébergeur cloud : <code>Google Cloud Platform (Europe) / Firebase</code></li>
                <li>&bull; Juridiction compétente : <code>[Tribunal de commerce de votre ville / Paris]</code></li>
              </ul>
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <div>&copy; {new Date().getFullYear()} Resonantia &bull; Tous droits réservés.</div>
          <div className="flex items-center gap-4">
            <button
              onClick={onNavigatePrivacy}
              className="hover:text-zinc-50 font-semibold cursor-pointer underline"
            >
              Consulter la Politique de Confidentialité
            </button>
            <button
              onClick={onNavigateHome}
              className="hover:text-zinc-50 font-semibold cursor-pointer underline"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </main>
      </div>
    </div>
  );
};
