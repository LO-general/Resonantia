import React from 'react';
import {
  Shield,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Database,
  Eye,
  Trash2,
  UserCheck,
  FileText,
  Mail,
  Server,
  Cpu,
  Clock,
  HelpCircle,
} from 'lucide-react';

interface PrivacyPolicyPageProps {
  onNavigateHome: () => void;
  onNavigateTerms: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({
  onNavigateHome,
  onNavigateTerms,
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
              onClick={onNavigateTerms}
              className="text-xs text-zinc-300 hover:text-zinc-50 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/80 transition cursor-pointer"
            >
              Conditions Générales (CGU)
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        {/* Title & Metadata Banner */}
        <div className="space-y-4 border-b border-zinc-800 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              <Shield className="w-3.5 h-3.5" />
              <span>Conformité RGPD &bull; Resonantia</span>
            </div>
            <div className="text-xs text-zinc-400 font-mono bg-zinc-800 px-3 py-1 rounded-lg border border-zinc-800">
              URL : <strong>/privacy</strong>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-50 tracking-tight">
            Politique de Confidentialité &amp; Protection des Données
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Dernière mise à jour : 21 novembre 2026 &bull; Conforme au Règlement Général sur la Protection des Données (RGPD 2016/679).
          </p>
        </div>

        {/* Notice for fields to customize */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm space-y-2">
          <div className="font-bold flex items-center gap-2 text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Mentions légales et coordonnées personnelles à compléter</span>
          </div>
          <p className="leading-relaxed">
            Complétez les informations entre crochets <code>[EXEMPLE]</code> avec vos coordonnées réelles (Nom, Raison sociale, Email de contact DPO) lors de la mise en production publique de Resonantia.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8 text-sm sm:text-base leading-relaxed text-zinc-200">
          {/* Section 1 : Responsable du traitement */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">1</span>
              <span>Responsable du Traitement</span>
            </h2>
            <p>
              Le traitement de vos données personnelles est effectué sous la responsabilité de :
            </p>
            <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 text-xs space-y-1 font-mono">
              <div>&bull; <strong>Responsable légal :</strong> <code>[Votre Nom et Prénom / Raison Sociale de votre société]</code></div>
              <div>&bull; <strong>Statut juridique :</strong> <code>[Ex : Auto-entrepreneur / SAS / SARL]</code></div>
              <div>&bull; <strong>Adresse postale :</strong> <code>[Adresse complète du siège social]</code></div>
              <div>&bull; <strong>Email de contact dédié à la confidentialité :</strong> <code>[privacy@votre-domaine.com]</code></div>
              <div>&bull; <strong>Délégué à la Protection des Données (DPO) :</strong> <code>[dpo@votre-domaine.com]</code></div>
            </div>
          </section>

          {/* Section 2 : Données du compte collectées */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">2</span>
              <span>Données du Compte Utilisateur Collectées</span>
            </h2>
            <p>
              Lors de votre inscription et de votre utilisation de la plateforme, nous collectons les données suivantes nécessaires au fonctionnement de votre espace créateur :
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-sm text-zinc-300">
              <li><strong>Données d'identification :</strong> adresse email, nom d'affichage ou pseudonyme, identifiant unique de compte utilisateur (<code>UID</code> généré par Firebase Auth ou le module de partition locale).</li>
              <li><strong>Sécurité des accès :</strong> mot de passe chiffré (cryptographique irréversible via Firebase Auth ou encodage sécurisé d'espace dédié). Les mots de passe en clair ne sont jamais enregistrés.</li>
              <li><strong>Données de navigation et journaux techniques :</strong> horodatage des connexions, adresse IP (à des fins exclusives de sécurité et de détection des abus).</li>
            </ul>
          </section>

          {/* Section 3 : Données récupérées auprès de TikTok avec autorisation */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">3</span>
              <span>Données Récupérées auprès de TikTok avec votre Autorisation</span>
            </h2>
            <p>
              Lorsque vous choisissez de connecter votre compte TikTok via le bouton officiel <strong>Login Kit</strong> et d'autoriser la <strong>TikTok Display API</strong>, nous collectons uniquement les informations pour lesquelles vous avez donné votre consentement explicite via l'écran d'autorisation OAuth 2.0 :
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800 space-y-1">
                <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Scope : user.info.basic & user.info.stats</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-zinc-300">
                  <li>Identifiant unique TikTok (<code>open_id</code> immuable).</li>
                  <li>Pseudonyme (<code>username</code>) et nom public.</li>
                  <li>Photo de profil (<code>avatar_url</code>) et lien public.</li>
                  <li>Nombre d'abonnés (<code>follower_count</code>).</li>
                  <li>Nombre d'abonnements (<code>following_count</code>).</li>
                  <li>Total des likes reçus sur le profil (<code>likes_count</code>).</li>
                  <li>Nombre total de vidéos publiées (<code>video_count</code>).</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800 space-y-1">
                <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span>Scope : video.list</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-zinc-300">
                  <li>Identifiant officiel de chaque vidéo (<code>id</code>).</li>
                  <li>Date et heure de publication (<code>create_time</code>).</li>
                  <li>Titre et description de la vidéo.</li>
                  <li>Image de couverture (<code>cover_image_url</code>).</li>
                  <li>Compteur de vues (<code>view_count</code>).</li>
                  <li>Compteur de likes (<code>like_count</code>).</li>
                  <li>Compteur de commentaires (<code>comment_count</code>).</li>
                  <li>Compteur de partages (<code>share_count</code>).</li>
                </ul>
              </div>
            </div>

            <p className="text-xs text-zinc-400 italic">
              <strong>Engagement de transparence :</strong> Nous ne demandons aucune permission d'écriture, nous ne modifions pas votre compte TikTok et nous ne simulons aucune donnée privée que l'API n'autorise pas.
            </p>
          </section>

          {/* Section 4 : Traitement des vidéos importées */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">4</span>
              <span>Traitement des Vidéos Importées</span>
            </h2>
            <p>
              Dans le cadre de l'<strong>Agent n°1 (Content Creator)</strong>, vous pouvez importer des vidéos originales depuis votre ordinateur ou votre smartphone (iPhone / Android) :
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-sm text-zinc-300">
              <li><strong>Vérification & compatibilité :</strong> lecture du flux binaire en mémoire du navigateur, normalisation du type MIME (<code>video/mp4</code>, <code>video/quicktime</code>, etc.) et contrôle de taille.</li>
              <li><strong>Extraction locale de photogrammes :</strong> capture dans le navigateur de 3 à 5 images fixes (frames) destinées exclusivement à être soumises au modèle Gemini pour en comprendre le sujet visuel. La vidéo complète originale n'est pas envoyée dans le prompt textuel de l'IA.</li>
              <li><strong>Conservation sécurisée :</strong> la vidéo est téléversée dans un bucket sécurisé ou conservée dans votre stockage persistant dédié.</li>
            </ul>
          </section>

          {/* Section 5 : Stockage via Firebase */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">5</span>
              <span>Stockage des Données via Google Firebase</span>
            </h2>
            <p>
              Les données sont stockées sur l'infrastructure européenne certifiée de Google Firebase :
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-sm text-zinc-300">
              <li><strong>Cloud Storage :</strong> stockage persistant des fichiers vidéo originaux dans le répertoire isolé propre à votre identifiant (<code>users/{'{uid}'}/videos/...</code>), protégé par des règles de sécurité garantissant que vous seul avez accès à vos fichiers.</li>
              <li><strong>Cloud Firestore :</strong> base de données sécurisée conservant vos métadonnées (titres, légendes, dates programmées, notes de reposts, snapshots de métriques TikTok synchronisées).</li>
              <li><strong>Chiffrement :</strong> toutes les données sont chiffrées en transit (TLS 1.3 / HTTPS) et au repos (chiffrement AES-256 standard Google Cloud).</li>
            </ul>
          </section>

          {/* Section 6 : Utilisation par Google Gemini */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">6</span>
              <span>Traitement des Données par l'Intelligence Artificielle (Google Gemini)</span>
            </h2>
            <p>
              L'application intègre le SDK officiel <code>@google/genai</code> pour générer des légendes accrocheuses, des hashtags ciblés et des recommandations hebdomadaires.
            </p>
            <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 space-y-2 text-xs">
              <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Garanties de Confidentialité de l'API Google Cloud :</span>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                Les appels à l'API Gemini sont réalisés via un canal sécurisé serveur-à-serveur avec clé d'API chiffrée. Conformément aux conditions d'utilisation des API professionnelles de Google Cloud, <strong>vos vidéos personnelles, images et textes ne sont pas utilisés pour entraîner ou perfectionner les modèles publics de Google</strong>. Les données soumises sont traitées de manière éphémère pour générer la réponse demandée.
              </p>
            </div>
          </section>

          {/* Section 7 : Durée de conservation */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">7</span>
              <span>Durée de Conservation des Données</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-zinc-800 rounded-xl overflow-hidden">
                <thead className="bg-zinc-800 text-zinc-200 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Catégorie de Données</th>
                    <th className="py-2.5 px-3">Durée de Conservation</th>
                    <th className="py-2.5 px-3">Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-zinc-100">Compte & Profil</td>
                    <td className="py-2.5 px-3">Tant que le compte est actif</td>
                    <td className="py-2.5 px-3">Exécution du contrat de service</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-zinc-100">Vidéos Originales</td>
                    <td className="py-2.5 px-3">Jusqu'à suppression par l'utilisateur</td>
                    <td className="py-2.5 px-3">Bibliothèque créateur</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-zinc-100">Métriques TikTok</td>
                    <td className="py-2.5 px-3">Durée du compte ou révocation du jeton</td>
                    <td className="py-2.5 px-3">Historique H+24/H+48/J+7 et rapports IA</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-zinc-100">Jetons OAuth TikTok</td>
                    <td className="py-2.5 px-3">Jusqu'à expiration ou déconnexion</td>
                    <td className="py-2.5 px-3">Accès API consenti</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 8 : Suppression du compte et des données */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">8</span>
              <span>Suppression du Compte et des Données (Droit à l'Oubli)</span>
            </h2>
            <p>
              Vous pouvez à tout moment demander l'effacement intégral de vos données :
            </p>
            <ol className="list-decimal list-inside space-y-2 pl-2 text-sm text-zinc-300">
              <li><strong>Suppression unitaire :</strong> vous pouvez supprimer n'importe quelle vidéo, légende ou programmation depuis l'onglet Bibliothèque. La suppression dans Cloud Storage et Firestore est définitive.</li>
              <li><strong>Révocation de l'accès TikTok :</strong> cliquez sur « Dissocier » dans l'onglet Analytics, ou révoquez l'autorisation dans les paramètres de sécurité de votre application TikTok (Profil &gt; Paramètres &gt; Sécurité &gt; Applications et autorisations).</li>
              <li><strong>Clôture de compte :</strong> adressez un email à <code>[privacy@votre-domaine.com]</code> avec pour objet « Suppression de compte ». Toutes les données rattachées à votre UID seront purgées sous 30 jours ouvrés maximum.</li>
            </ol>
          </section>

          {/* Section 9 : Vos droits RGPD */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">9</span>
              <span>Vos Droits Conformément au RGPD</span>
            </h2>
            <p>
              En application des articles 15 à 22 du Règlement (UE) 2016/679, vous bénéficiez des prérogatives suivantes :
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <li className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800">
                <strong className="text-zinc-50 block font-bold mb-0.5">Droit d'accès (Art. 15)</strong>
                Obtenir la confirmation du traitement de vos données et en recevoir une copie intégrale.
              </li>
              <li className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800">
                <strong className="text-zinc-50 block font-bold mb-0.5">Droit de rectification (Art. 16)</strong>
                Corriger des informations inexactes, incomplètes ou obsolètes.
              </li>
              <li className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800">
                <strong className="text-zinc-50 block font-bold mb-0.5">Droit à l'effacement (Art. 17)</strong>
                Exiger la suppression de vos données personnelles stockées sur nos serveurs.
              </li>
              <li className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800">
                <strong className="text-zinc-50 block font-bold mb-0.5">Droit à la portabilité (Art. 20)</strong>
                Recevoir vos données dans un format structuré et couramment lisible par machine (JSON / CSV).
              </li>
              <li className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800">
                <strong className="text-zinc-50 block font-bold mb-0.5">Droit de limitation (Art. 18)</strong>
                Geler temporairement l'utilisation de vos données en cas de contestation.
              </li>
              <li className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800">
                <strong className="text-zinc-50 block font-bold mb-0.5">Droit d'opposition (Art. 21)</strong>
                Vous opposer à tout moment aux traitements fondés sur notre intérêt légitime.
              </li>
            </ul>

            <div className="p-3.5 rounded-xl bg-zinc-800 border border-zinc-800 text-xs text-zinc-300">
              Pour exercer l'un de ces droits, contactez : <code>[privacy@votre-domaine.com]</code>. En cas de désaccord persistant, vous disposez du droit d'introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés — <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-emerald-300 underline font-semibold">www.cnil.fr</a>).
            </div>
          </section>

          {/* Section 10 : Coordonnées de contact */}
          <section className="bg-zinc-900/70 rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm shadow-black/20 space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-50 flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 text-white inline-flex items-center justify-center text-xs font-bold">10</span>
              <span>Coordonnées de Contact & Informations Personnelles à Renseigner</span>
            </h2>
            <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 space-y-2 text-xs">
              <div className="font-bold text-zinc-100">
                Pour finaliser votre politique de confidentialité avant mise en production :
              </div>
              <ul className="space-y-1 text-zinc-300 font-mono">
                <li>&bull; Identité du Responsable : <code>[Prénom et Nom du créateur ou Raison sociale]</code></li>
                <li>&bull; Adresse physique de contact : <code>[Adresse postale]</code></li>
                <li>&bull; Email officiel de contact : <code>[contact@votre-domaine.com]</code></li>
                <li>&bull; Email dédié au RGPD : <code>[privacy@votre-domaine.com]</code></li>
                <li>&bull; Délégué à la Protection des Données : <code>[dpo@votre-domaine.com]</code> (si désigné)</li>
              </ul>
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <div>&copy; {new Date().getFullYear()} Resonantia &bull; Tous droits réservés.</div>
          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateTerms}
              className="hover:text-zinc-50 font-semibold cursor-pointer underline"
            >
              Consulter les Conditions Générales d'Utilisation
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
