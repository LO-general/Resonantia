import React, { useState, useEffect, useRef } from 'react';
import { usePageReveal } from './components/ui';
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  FolderKanban,
  X,
  Sparkles,
  LogOut,
  ShieldCheck,
  BarChart3,
  Eye,
  Compass,
  BookOpen,
  Repeat,
  Music,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import {
  ActiveTab,
  ContentItem,
  ContentMode,
  TikTokAccountData,
  TikTokOfficialVideo,
  UserProfile,
  VideoEditorialMetadata,
} from './types';
import {
  getCurrentUser,
  onAuthChange,
  signOutUser,
  getUserPublications,
  deleteUserPublication,
} from './services/firebase';
import { getAllVideoEditorialMeta, getContentModeForUser } from './services/db';
import { computeCentralAccountAnalytics } from './utils/centralDataEngine';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { ContentCreatorAgent } from './components/ContentCreatorAgent';
import { TikTokCoach } from './components/TikTokCoach';
import { UnifiedCalendar } from './components/UnifiedCalendar';
import { Library } from './components/Library';
import { TermsPage } from './components/TermsPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TikTokDeveloperPortalView } from './components/TikTokDeveloperPortalView';
import { TikTokDeveloperPortalModal } from './components/TikTokDeveloperPortalModal';
import { MaVisionPage } from './components/MaVisionPage';
import { ComprendreInternetPage } from './components/ComprendreInternetPage';
import { TikTokConnectionPage } from './components/TikTokConnectionPage';
import { ContentModeOnboardingPage } from './components/ContentModeOnboardingPage';
import { SettingsModal } from './components/SettingsModal';
import { MonRepostView } from './components/MonRepostView';
import { MusicAdvisorView } from './components/MusicAdvisorView';
import { ComprendreTikTokHub } from './components/ComprendreTikTokHub';
import {
  CookieConsentBanner,
  CookieConsentChoice,
  getStoredCookieConsent,
  saveCookieConsent,
} from './components/CookieConsentBanner';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [guestStep, setGuestStep] = useState<'vision' | 'auth'>('vision');
  const [showCookieBanner, setShowCookieBanner] = useState<boolean>(() => !getStoredCookieConsent());

  // Public stable routing for /terms and /privacy (accessible without authentication)
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      const h = window.location.hash;
      const s = new URLSearchParams(window.location.search);
      if (p === '/terms' || h === '#/terms' || s.get('page') === 'terms') return '/terms';
      if (p === '/privacy' || h === '#/privacy' || s.get('page') === 'privacy') return '/privacy';
    }
    return '/';
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('coach');
  const mainRef = useRef<HTMLElement | null>(null);
  usePageReveal(mainRef, activeTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTikTokPortalModal, setShowTikTokPortalModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<ContentItem | null>(null);
  const [contentMode, setContentMode] = useState<ContentMode | null>(null);
  const [tiktokAccount, setTiktokAccount] = useState<TikTokAccountData | null>(null);
  const [officialVideos, setOfficialVideos] = useState<TikTokOfficialVideo[]>([]);
  const [editorialMap, setEditorialMap] = useState<Record<string, VideoEditorialMetadata>>({});
  const [pendingDeleteContentId, setPendingDeleteContentId] = useState<string | null>(null);
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);

  // Sync browser back/forward, search params and hash changes
  useEffect(() => {
    const handleLocationChange = () => {
      const p = window.location.pathname;
      const h = window.location.hash;
      const s = new URLSearchParams(window.location.search);
      if (p === '/terms' || h === '#/terms' || s.get('page') === 'terms') setCurrentPath('/terms');
      else if (p === '/privacy' || h === '#/privacy' || s.get('page') === 'privacy') setCurrentPath('/privacy');
      else setCurrentPath('/');
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Core Data State (strictly scoped to currentUser.uid)
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Subscribe to Auth changes
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Refresh user data whenever user changes or on data mutation
  const refreshData = async () => {
    if (!currentUser) {
      setContentItems([]);
      return;
    }

    setIsDataLoading(true);
    try {
      const contents = await getUserPublications(currentUser.uid);
      setContentItems(contents);
    } catch (err) {
      console.error('Failed to load user partitioned data:', err);
    } finally {
      setIsDataLoading(false);
    }
  };

  const getScopedAccountKey = (uid?: string) =>
    uid ? `tiktok_connected_profile_${uid}` : 'tiktok_connected_profile';

  const getOnboardingDoneKey = (uid: string) => `resonantia_onboarding_done_${uid}`;

  const refreshTikTokData = async (uidOverride?: string) => {
    const uid = uidOverride || currentUser?.uid;
    const headers: Record<string, string> = uid ? { 'x-user-id': uid } : {};
    const storageKey = getScopedAccountKey(uid);
    try {
      const [statusRes, videosRes, edMap] = await Promise.all([
        fetch('/api/tiktok/status', { headers }).catch(() => null),
        fetch('/api/tiktok/videos', { headers }).catch(() => null),
        getAllVideoEditorialMeta(),
      ]);
      setEditorialMap(edMap);

      let loadedAccount: TikTokAccountData | null = null;
      let isConnectedServer = false;

      if (statusRes && statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.isConnected && statusData.account) {
          isConnectedServer = true;
          loadedAccount = statusData.account;
          setTiktokAccount(statusData.account);
          try {
            localStorage.setItem(storageKey, JSON.stringify(statusData.account));
          } catch {
            // ignore
          }
        } else if (statusData.isConnected === false) {
          setTiktokAccount(null);
          try {
            localStorage.removeItem(storageKey);
          } catch {
            // ignore
          }
        }
      }

      let loadedVideos: TikTokOfficialVideo[] = [];
      if (videosRes && videosRes.ok) {
        const vData = await videosRes.json();
        if (Array.isArray(vData.videos)) {
          loadedVideos = vData.videos;
          setOfficialVideos(vData.videos);
        }
      }

      // If connected on server but no cached videos yet, automatically trigger one live sync
      if (isConnectedServer && loadedVideos.length === 0) {
        try {
          const syncRes = await fetch('/api/tiktok/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.account) {
              loadedAccount = syncData.account;
              setTiktokAccount(syncData.account);
              try {
                localStorage.setItem(storageKey, JSON.stringify(syncData.account));
              } catch {
                // ignore
              }
            }
            if (Array.isArray(syncData.videos) && syncData.videos.length > 0) {
              setOfficialVideos(syncData.videos);
            }
          }
        } catch (syncErr) {
          console.warn('Auto-sync fallback:', syncErr);
        }
      }
      void loadedAccount;
    } catch (err) {
      console.warn('TikTok sync error:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      try {
        const saved = localStorage.getItem(getScopedAccountKey(currentUser.uid));
        setTiktokAccount(saved ? JSON.parse(saved) : null);
      } catch {
        setTiktokAccount(null);
      }
      refreshData();
      refreshTikTokData(currentUser.uid);
      getContentModeForUser(currentUser.uid)
        .then((mode) => setContentMode(mode))
        .catch(() => {});
    } else {
      setContentMode(null);
      setTiktokAccount(null);
      setOfficialVideos([]);
    }
  }, [currentUser?.uid]);

  // Handlers for deleting from library & signing out (via in-app confirmation modals)
  const handleDeleteContent = (id: string) => {
    if (!currentUser) return;
    setPendingDeleteContentId(id);
  };

  const confirmDeleteContent = async () => {
    if (!currentUser || !pendingDeleteContentId) return;
    const idToDelete = pendingDeleteContentId;
    setPendingDeleteContentId(null);
    await deleteUserPublication(currentUser.uid, idToDelete);
    refreshData();
  };

  const handleSignOut = () => {
    setConfirmSignOutOpen(true);
  };

  const confirmSignOut = async () => {
    setConfirmSignOutOpen(false);
    await signOutUser();
    setCurrentUser(null);
    setContentItems([]);
    setContentMode(null);
    setTiktokAccount(null);
    setOfficialVideos([]);
    setActiveTab('coach');
    setGuestStep('vision');
  };

  const handleCookieSelect = (choice: CookieConsentChoice) => {
    saveCookieConsent(choice);
    setShowCookieBanner(false);
  };

  const centralAnalyticsForHub = React.useMemo(
    () =>
      computeCentralAccountAnalytics({
        videos: officialVideos,
        account: tiktokAccount,
        filterMode: contentMode || 'both',
        editorialMap,
      }),
    [officialVideos, tiktokAccount, contentMode, editorialMap]
  );

  // Public routes accessible without authentication (/terms and /privacy)
  if (currentPath === '/terms') {
    return (
      <TermsPage
        onNavigateHome={() => navigateTo('/')}
        onNavigatePrivacy={() => navigateTo('/privacy')}
      />
    );
  }

  if (currentPath === '/privacy') {
    return (
      <PrivacyPolicyPage
        onNavigateHome={() => navigateTo('/')}
        onNavigateTerms={() => navigateTo('/terms')}
      />
    );
  }

  // If loading authentication state, show clean spinner
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-zinc-400">
            Initialisation de Resonantia...
          </p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, start on Étape 1 (Re-build) + Cookie banner, then Inscription -> Mon Coach
  if (!currentUser) {
    if (guestStep === 'vision') {
      return (
        <>
          <MaVisionPage
            isAuthenticated={false}
            onNavigateNext={() => setGuestStep('auth')}
            onOpenCookieSettings={() => setShowCookieBanner(true)}
          />
          <CookieConsentBanner
            visible={showCookieBanner}
            onSelect={handleCookieSelect}
            onOpenPrivacy={() => navigateTo('/privacy')}
          />
        </>
      );
    }

    return (
      <>
        <AuthScreen
          initialMode="signup"
          onBackToRebuild={() => setGuestStep('vision')}
          onSuccess={(user, isNewSignup) => {
            setCurrentUser(user);
            let onboardingDone = false;
            try {
              onboardingDone = localStorage.getItem(getOnboardingDoneKey(user.uid)) === '1';
            } catch {
              onboardingDone = false;
            }
            if (isNewSignup || !onboardingDone) {
              setActiveTab('connect');
            } else {
              setActiveTab('coach');
            }
          }}
          onNavigateTerms={() => navigateTo('/terms')}
          onNavigatePrivacy={() => navigateTo('/privacy')}
        />
        <CookieConsentBanner
          visible={showCookieBanner}
          onSelect={handleCookieSelect}
          onOpenPrivacy={() => navigateTo('/privacy')}
        />
      </>
    );
  }

  const isTikTokConnected = () => {
    if (tiktokAccount?.openId || tiktokAccount?.username) return true;
    try {
      const saved = localStorage.getItem(getScopedAccountKey(currentUser.uid));
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      return Boolean(parsed.openId || parsed.handle || parsed.username);
    } catch {
      return false;
    }
  };

  const handleProceedFromRebuild = () => {
    if (!isTikTokConnected()) {
      setActiveTab('connect');
    } else {
      setActiveTab('comprendre');
    }
  };

  const handleProceedFromComprendre = () => {
    setActiveTab('content-mode');
  };

  type NavGroup = 'parcours' | 'outils' | 'studio';
  const navItems: Array<{
    id: ActiveTab;
    group: NavGroup;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string;
    badgeColor: string;
    activeColor: string;
    iconActive: string;
  }> = [
    {
      id: 'vision',
      group: 'parcours',
      label: 'Étape 1 : Re-build',
      icon: Compass,
      badge: 'Étape 1',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      activeColor: 'border-rose-500/60 bg-rose-950/30 text-rose-300 shadow-md',
      iconActive: 'text-rose-400',
    },
    {
      id: 'connect',
      group: 'parcours',
      label: 'Connexion du compte',
      icon: ShieldCheck,
      badge: 'Compte',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      activeColor: 'border-cyan-500/60 bg-cyan-950/30 text-cyan-300 shadow-md',
      iconActive: 'text-cyan-400',
    },
    {
      id: 'comprendre',
      group: 'parcours',
      label: 'Étape 2 : Internet avant de performer',
      icon: BookOpen,
      badge: 'Étape 2',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      activeColor: 'border-indigo-500/60 bg-indigo-950/30 text-indigo-300 shadow-md',
      iconActive: 'text-indigo-400',
    },
    {
      id: 'coach',
      group: 'parcours',
      label: 'Mon Coach (Tout-en-un)',
      icon: Sparkles,
      badge: 'Cockpit Unifié',
      badgeColor: 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 text-white border-transparent',
      activeColor: 'border-amber-500/60 bg-amber-950/30 text-amber-300 shadow-md',
      iconActive: 'text-amber-400',
    },
    {
      id: 'analytics',
      group: 'outils',
      label: '1 · Analytics',
      icon: BarChart3,
      badge: 'Données Réelles',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      activeColor: 'border-emerald-500/60 bg-emerald-950/30 text-emerald-300 shadow-md',
      iconActive: 'text-emerald-400',
    },
    {
      id: 'visionnaire',
      group: 'outils',
      label: '3 · Mon Visionnaire',
      icon: Eye,
      badge: 'Pré-Publi',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      activeColor: 'border-amber-500/60 bg-amber-950/30 text-amber-300 shadow-md',
      iconActive: 'text-amber-400',
    },
    ...(contentMode !== 'creation'
      ? [
          {
            id: 'repost' as ActiveTab,
            group: 'outils' as NavGroup,
            label: 'Mon Repost',
            icon: Repeat,
            badge: 'Droits & Sources',
            badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
            activeColor: 'border-indigo-500/60 bg-indigo-950/30 text-indigo-300 shadow-md',
            iconActive: 'text-indigo-400',
          },
        ]
      : []),
    {
      id: 'music-advisor',
      group: 'outils',
      label: 'Conseiller Musical',
      icon: Music,
      badge: 'Audio & Droits',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      activeColor: 'border-amber-500/60 bg-amber-950/30 text-amber-300 shadow-md',
      iconActive: 'text-amber-400',
    },
    {
      id: 'comprendre-tiktok',
      group: 'outils',
      label: 'Guide & Règles',
      icon: ShieldCheck,
      badge: 'Conformité',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      activeColor: 'border-cyan-500/60 bg-cyan-950/30 text-cyan-300 shadow-md',
      iconActive: 'text-cyan-400',
    },
    {
      id: 'dashboard',
      group: 'studio',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      badge: "Vue d'ensemble",
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      activeColor: 'border-purple-500/60 bg-purple-950/30 text-purple-300 shadow-md',
      iconActive: 'text-purple-400',
    },
    {
      id: 'calendar',
      group: 'studio',
      label: 'Calendrier',
      icon: CalendarIcon,
      badge: 'Planning',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      activeColor: 'border-blue-500/60 bg-blue-950/30 text-blue-300 shadow-md',
      iconActive: 'text-blue-400',
    },
    {
      id: 'library',
      group: 'studio',
      label: 'Bibliothèque',
      icon: FolderKanban,
      badge: 'Contenus',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      activeColor: 'border-teal-500/60 bg-teal-950/30 text-teal-300 shadow-md',
      iconActive: 'text-teal-400',
    },
    {
      id: 'tiktok-portal',
      group: 'studio',
      label: 'Ressources & URLs',
      icon: ShieldCheck,
      badge: '1024px & CGU',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      activeColor: 'border-rose-500/60 bg-rose-950/30 text-rose-300 shadow-md',
      iconActive: 'text-rose-400',
    },
  ];

  // Full-screen immersive view for "Resonantia" (Page 1):
  if (activeTab === 'vision') {
    return (
      <>
        <MaVisionPage
          isAuthenticated={true}
          onNavigateNext={handleProceedFromRebuild}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onOpenCookieSettings={() => setShowCookieBanner(true)}
        />
        <CookieConsentBanner
          visible={showCookieBanner}
          onSelect={handleCookieSelect}
          onOpenPrivacy={() => navigateTo('/privacy')}
        />
      </>
    );
  }

  // Dedicated view for "Connexion TikTok" (juste après inscription):
  if (activeTab === 'connect') {
    return (
      <TikTokConnectionPage
        userId={currentUser.uid}
        onAccountConnected={(acc) => {
          if (acc && 'openId' in acc && acc.openId) {
            setTiktokAccount(acc as TikTokAccountData);
            try {
              localStorage.setItem(getScopedAccountKey(currentUser.uid), JSON.stringify(acc));
            } catch {
              // ignore
            }
          } else if (!acc) {
            setTiktokAccount(null);
            setOfficialVideos([]);
          }
        }}
        onVideosSynced={(videos, acc) => {
          if (acc?.openId) {
            setTiktokAccount(acc);
            try {
              localStorage.setItem(getScopedAccountKey(currentUser.uid), JSON.stringify(acc));
            } catch {
              // ignore
            }
          }
          if (Array.isArray(videos) && videos.length > 0) {
            setOfficialVideos(videos);
          }
        }}
        onNavigateNext={() => {
          refreshTikTokData(currentUser.uid);
          setActiveTab('comprendre');
        }}
        onNavigateBack={() => setActiveTab('vision')}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />
    );
  }

  // Full-screen immersive view for "Comprendre ce qui retient vraiment l’attention humaine":
  if (activeTab === 'comprendre') {
    return (
      <ComprendreInternetPage
        currentUser={currentUser}
        onNavigateNext={handleProceedFromComprendre}
        onNavigateBack={() => setActiveTab('connect')}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />
    );
  }

  // Onboarding choice: Qu'est-ce que tu veux publier sur TikTok ? (Création / Repost / Les deux) -> Mon Coach
  if (activeTab === 'content-mode') {
    return (
      <ContentModeOnboardingPage
        userId={currentUser.uid}
        initialMode={contentMode}
        onComplete={(mode) => {
          setContentMode(mode);
          try {
            localStorage.setItem(getOnboardingDoneKey(currentUser.uid), '1');
          } catch {
            // ignore
          }
          refreshTikTokData(currentUser.uid);
          setActiveTab('coach');
        }}
        onSkipToCoach={() => {
          try {
            localStorage.setItem(getOnboardingDoneKey(currentUser.uid), '1');
          } catch {
            // ignore
          }
          refreshTikTokData(currentUser.uid);
          setActiveTab('coach');
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 text-white selection:bg-rose-500/30 selection:text-white overflow-x-hidden flex flex-col font-sans">
      {/* Fond vivant : aurore animée aux couleurs de l'Étape 1 */}
      <div className="aurora-bg" aria-hidden="true">
        <div className="aurora-grid" />
      </div>

      {/* TOP COMPACT NAVIGATION BAR (Gaining full width, dark theme, accessible 3-bar menu) */}
      <header className="sticky top-0 z-40 bg-zinc-950/70 border-b border-zinc-800/80 backdrop-blur-2xl px-4 sm:px-8 py-3 flex items-center justify-between shadow-xl shadow-black/30">
        <div className="absolute inset-x-0 bottom-0 h-px shimmer-line opacity-60 pointer-events-none" />
        {/* Left: 3-Bars Hamburger Button & Brand Logo */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* THE THREE BARS BUTTON (Menu déroulant pour gagner de la place) */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-zinc-800/90 hover:bg-zinc-700/90 text-white border border-zinc-700/90 hover:border-rose-500/50 shadow-md transition-all cursor-pointer group"
            title="Ouvrir le menu déroulant avec tous les agents"
            aria-label="Menu des agents"
          >
            <div className="flex flex-col gap-1 w-4 h-3.5 justify-center">
              <span className="w-full h-0.5 bg-rose-400 rounded-full transition-all group-hover:bg-rose-300" />
              <span className="w-full h-0.5 bg-amber-400 rounded-full transition-all group-hover:bg-amber-300" />
              <span className="w-full h-0.5 bg-indigo-400 rounded-full transition-all group-hover:bg-indigo-300" />
            </div>
            <span className="text-xs font-bold tracking-tight hidden sm:inline">
              Menu &middot; Tous les Agents
            </span>
          </button>

          {/* Logo & Brand Name */}
          <div
            onClick={() => setActiveTab('vision')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-600 to-amber-500 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-rose-950/50 group-hover:scale-110 group-hover:-rotate-6 transition">
              R
            </div>
            <div className="hidden md:block">
              <div className="font-extrabold text-xs tracking-tight text-white flex items-center gap-1.5 leading-none">
                <span>Resonantia</span>
                <span className="live-dot" />
              </div>
              <div className="text-[10px] text-zinc-400 font-medium mt-0.5">
                Studio &amp; Stratégie
              </div>
            </div>
          </div>
        </div>

        {/* Center: Quick Breadcrumb Stepper (Visibilité directe des étapes) */}
        <div className="hidden lg:flex items-center gap-1.5 bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-1 text-xs">
          <button
            onClick={() => setActiveTab('vision')}
            className="px-3 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 text-zinc-400 hover:text-white"
          >
            <span>Étape 1 : Re-build</span>
          </button>

          <span className="text-zinc-700 font-bold">&rarr;</span>

          <button
            onClick={() => setActiveTab('connect')}
            className="px-2.5 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 text-zinc-400 hover:text-white"
          >
            <span>Connexion</span>
          </button>

          <span className="text-zinc-700 font-bold">&rarr;</span>

          <button
            onClick={() => setActiveTab('comprendre')}
            className="px-3 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 text-zinc-400 hover:text-white"
          >
            <span>Étape 2 : Internet</span>
          </button>

          <span className="text-zinc-700 font-bold">&rarr;</span>

          <button
            onClick={() => setActiveTab('coach')}
            className={`px-3.5 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'coach' || activeTab === 'stratege' || activeTab === 'visionnaire' || activeTab === 'analytics'
                ? 'bg-gradient-to-r from-amber-500/30 via-rose-500/30 to-indigo-500/30 text-amber-200 border border-amber-500/50 font-bold shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Mon Coach (Tout-en-un)</span>
          </button>
        </div>

        {/* Right: Actions, Settings, URLs & User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold transition cursor-pointer"
            title="Mode de création, export JSON et confidentialité"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-300" />
            <span className="hidden sm:inline">Paramètres</span>
          </button>

          <button
            onClick={() => setShowTikTokPortalModal(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-bold transition cursor-pointer"
          >
            URLs &amp; 1024px
          </button>

          {/* User profile pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'R'}
            </div>
            <button
              onClick={handleSignOut}
              title="Se déconnecter"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* LE MENU DÉROULANT DES TROIS BARRES (ACCESSIBLE PARTOUT, GAIN DE PLACE & THÈME ÉTAPE 1/2) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start justify-start animate-fadeIn"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-full max-w-sm sm:max-w-md h-full bg-zinc-950/95 backdrop-blur-2xl border-r border-zinc-800 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Section */}
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-rose-600 to-amber-500 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-rose-950/50">
                    R
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Menu des Agents &amp; Outils</h3>
                    <p className="text-[11px] text-zinc-400">Navigation complète du Studio</p>
                  </div>
                </div>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                  title="Fermer le menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items (Grouped Pedagogically) */}
              <div className="space-y-5">
                {/* 1. Parcours Stratégique */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3">
                    Parcours Stratégique &amp; Compréhension
                  </div>
                  {navItems
                    .filter((item) => item.group === 'parcours')
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition cursor-pointer border ${
                            isActive
                              ? `${item.activeColor}`
                              : 'border-transparent text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${isActive ? item.iconActive : 'text-zinc-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>

                {/* 2. Outils Intégrés dans Mon Coach */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3">
                    Outils Intégrés &amp; Modules Experts
                  </div>
                  {navItems
                    .filter((item) => item.group === 'outils')
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition cursor-pointer border ${
                            isActive
                              ? `${item.activeColor}`
                              : 'border-transparent text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${isActive ? item.iconActive : 'text-zinc-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>

                {/* 3. Espace Studio & Publications */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3">
                    Gestion du Studio &amp; Planning
                  </div>
                  {navItems
                    .filter((item) => item.group === 'studio')
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition cursor-pointer border ${
                            isActive
                              ? `${item.activeColor}`
                              : 'border-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${isActive ? item.iconActive : 'text-zinc-400'}`} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Bottom Drawer Actions */}
            <div className="pt-5 border-t border-zinc-800 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {currentUser.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'R'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {currentUser.displayName || 'Mon Compte'}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      {currentUser.email}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  title="Se déconnecter"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between px-2 text-[11px] text-zinc-500">
                <a
                  href="/terms"
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    navigateTo('/terms');
                  }}
                  className="hover:text-zinc-300 underline transition cursor-pointer"
                >
                  Conditions (CGU)
                </a>
                <span>&bull;</span>
                <a
                  href="/privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    navigateTo('/privacy');
                  }}
                  className="hover:text-zinc-300 underline transition cursor-pointer"
                >
                  Confidentialité
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport (Utilizing full screen width, no rigid 280px sidebar) */}
      <main ref={mainRef} className="legacy-bridge flex-1 min-w-0 p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full relative z-10">
        {isDataLoading && contentItems.length === 0 ? (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_24px_rgba(244,63,94,.45)]" />
              <p className="text-xs font-semibold text-zinc-500">
                On prépare ton studio…
              </p>
            </div>
          </div>
        ) : (
          <div key={activeTab} className="page-enter">
            {activeTab === 'dashboard' && (
              <Dashboard
                contentItems={contentItems}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenContentItem={(item) => {
                  setSelectedItemForEdit(item);
                  setActiveTab('visionnaire');
                }}
              />
            )}

            {activeTab === 'creator' && (
              <ContentCreatorAgent
                items={contentItems}
                currentUser={currentUser}
                initialItemToEdit={selectedItemForEdit}
                onClearInitialItemToEdit={() => setSelectedItemForEdit(null)}
                onRefresh={refreshData}
              />
            )}

            {(activeTab === 'coach' || activeTab === 'stratege') && (
              <TikTokCoach
                contentItems={contentItems}
                onRefresh={refreshData}
                onNavigateTab={(tab) => setActiveTab(tab)}
                initialPillar={activeTab === 'stratege' ? 'coach' : 'analytics'}
                userId={currentUser.uid}
                contentMode={contentMode}
                initialOfficialVideos={officialVideos}
                initialAccount={tiktokAccount}
                onDataMutated={() => refreshTikTokData(currentUser.uid)}
              />
            )}

            {activeTab === 'analytics' && (
              <TikTokCoach
                contentItems={contentItems}
                onRefresh={refreshData}
                onNavigateTab={(tab) => setActiveTab(tab)}
                initialPillar="analytics"
                userId={currentUser.uid}
                contentMode={contentMode}
                initialOfficialVideos={officialVideos}
                initialAccount={tiktokAccount}
                onDataMutated={() => refreshTikTokData(currentUser.uid)}
              />
            )}

            {activeTab === 'visionnaire' && (
              <TikTokCoach
                contentItems={contentItems}
                onRefresh={refreshData}
                onNavigateTab={(tab) => setActiveTab(tab)}
                initialPillar="visionnaire"
                userId={currentUser.uid}
                contentMode={contentMode}
                initialOfficialVideos={officialVideos}
                initialAccount={tiktokAccount}
                onDataMutated={refreshTikTokData}
              />
            )}

            {activeTab === 'repost' && (
              <MonRepostView
                userId={currentUser.uid}
                videos={officialVideos}
                editorialMap={editorialMap}
                onItemsUpdated={refreshTikTokData}
              />
            )}

            {activeTab === 'music-advisor' && (
              <MusicAdvisorView videos={officialVideos} editorialMap={editorialMap} />
            )}

            {activeTab === 'comprendre-tiktok' && (
              <ComprendreTikTokHub
                userId={currentUser.uid}
                centralAnalytics={centralAnalyticsForHub}
              />
            )}

            {activeTab === 'calendar' && (
              <UnifiedCalendar
                contentItems={contentItems}
                onSelectContentItem={(item) => {
                  setSelectedItemForEdit(item);
                  setActiveTab('creator');
                }}
                onNewContent={() => {
                  setSelectedItemForEdit(null);
                  setActiveTab('creator');
                }}
              />
            )}

            {activeTab === 'library' && (
              <Library
                contentItems={contentItems}
                onOpenContentItem={(item) => {
                  setSelectedItemForEdit(item);
                  setActiveTab('creator');
                }}
                onDeleteContentItem={handleDeleteContent}
              />
            )}

            {activeTab === 'tiktok-portal' && (
              <TikTokDeveloperPortalView
                onOpenTerms={() => navigateTo('/terms')}
                onOpenPrivacy={() => navigateTo('/privacy')}
              />
            )}

            {/* Application Public Footer */}
            <footer className="mt-16 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center font-bold text-[10px]">
                  R
                </span>
                <span className="font-semibold text-zinc-300">Resonantia</span>
                <span>&bull;</span>
                <span>&copy; {new Date().getFullYear()}</span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-zinc-400">
                <button
                  type="button"
                  onClick={() => setShowTikTokPortalModal(true)}
                  className="text-rose-400 hover:text-rose-300 font-bold underline underline-offset-4 cursor-pointer"
                >
                  Ressources &amp; URLs (Logo 1024x1024)
                </button>
                <span>&bull;</span>
                <a
                  href="/terms"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('/terms');
                  }}
                  className="hover:text-white transition underline underline-offset-4 cursor-pointer font-medium"
                >
                  Conditions Générales d'Utilisation (CGU)
                </a>
                <span>&bull;</span>
                <a
                  href="/privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('/privacy');
                  }}
                  className="hover:text-white transition underline underline-offset-4 cursor-pointer font-medium"
                >
                  Politique de Confidentialité (RGPD)
                </a>
              </div>
            </footer>
          </div>
        )}
      </main>

      {/* Global TikTok Developer Portal Modal (Logo 1024x1024 + URLs) */}
      <TikTokDeveloperPortalModal
        isOpen={showTikTokPortalModal}
        onClose={() => setShowTikTokPortalModal(false)}
        onOpenTerms={() => navigateTo('/terms')}
        onOpenPrivacy={() => navigateTo('/privacy')}
      />

      {/* Settings Modal (Mode Création / Repost / Les deux + Export RGPD) */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        userId={currentUser.uid}
        userEmail={currentUser.email}
        currentMode={contentMode || 'both'}
        onModeChange={(newMode) => {
          setContentMode(newMode);
          if (newMode === 'creation' && activeTab === 'repost') {
            setActiveTab('coach');
          }
        }}
        onDataPurged={() => {
          setContentMode(null);
          setEditorialMap({});
          refreshData();
        }}
      />

      {/* In-app confirmation modal: Delete Content */}
      {pendingDeleteContentId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="surface max-w-md w-full p-6 space-y-4 animate-pop">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirmer la suppression</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Voulez-vous vraiment supprimer cette vidéo de votre bibliothèque ? Cette action est
              définitive.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPendingDeleteContentId(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteContent}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app confirmation modal: Sign Out */}
      {confirmSignOutOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="surface max-w-md w-full p-6 space-y-4 animate-pop">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <LogOut className="w-5 h-5" />
              <span>Se déconnecter</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Voulez-vous vous déconnecter de votre compte studio ?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmSignOutOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={confirmSignOut}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
