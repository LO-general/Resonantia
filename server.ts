import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

let analyticsEngineCache: typeof import('./src/utils/analyticsEngine') | null = null;
async function getAnalyticsEngine() {
  if (!analyticsEngineCache) analyticsEngineCache = await import('./src/utils/analyticsEngine');
  return analyticsEngineCache;
}

let centralDataEngineCache: typeof import('./src/utils/centralDataEngine') | null = null;
async function getCentralDataEngine() {
  if (!centralDataEngineCache) centralDataEngineCache = await import('./src/utils/centralDataEngine');
  return centralDataEngineCache;
}

let learningMemoryEngineCache: typeof import('./src/utils/learningMemoryEngine') | null = null;
async function getLearningMemoryEngine() {
  if (!learningMemoryEngineCache) learningMemoryEngineCache = await import('./src/utils/learningMemoryEngine');
  return learningMemoryEngineCache;
}

let visionnaireEngineCache: typeof import('./src/utils/visionnaireEngine') | null = null;
async function getVisionnaireEngine() {
  if (!visionnaireEngineCache) visionnaireEngineCache = await import('./src/utils/visionnaireEngine');
  return visionnaireEngineCache;
}

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.basename(__dirname) === 'api' ? path.resolve(__dirname, '..') : __dirname;
const IS_VERCEL = Boolean(process.env.VERCEL);
const RUNTIME_WRITABLE_DIR = IS_VERCEL ? '/tmp' : PROJECT_ROOT;
let inMemoryVerificationToken: string | null = null;

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Security headers (allow iframe embedding for AI Studio preview; anti-MIME sniffing & clean referrer policy)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeVerificationContent(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith('tiktok-developers-site-verification=')
    ? trimmed
    : `tiktok-developers-site-verification=${trimmed}`;
}

// Serve public directory explicitly (guarantees logo-1024.png, logo-1024.jpg, and verification files return raw binaries/text)
app.use(express.static(path.resolve(PROJECT_ROOT, 'public')));

// TikTok Developer Ownership Verification File handler (matches root AND any URL prefix like /api/auth/tiktok*.txt or /terms/tiktok*.txt)
app.get(/\/tiktok[^/]*\.txt$/, (req, res) => {
  const reqFileName = path.basename(req.path).replace(/[^a-zA-Z0-9._-]/g, '');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (inMemoryVerificationToken) {
    return res.send(inMemoryVerificationToken);
  }

  const candidatePaths = [
    reqFileName ? path.resolve(RUNTIME_WRITABLE_DIR, reqFileName) : '',
    path.resolve(RUNTIME_WRITABLE_DIR, 'tiktok-developers-site-verification.txt'),
    reqFileName ? path.resolve(PROJECT_ROOT, 'public', reqFileName) : '',
    path.resolve(PROJECT_ROOT, 'public', 'tiktok-developers-site-verification.txt'),
    reqFileName ? path.resolve(PROJECT_ROOT, 'dist', reqFileName) : '',
    path.resolve(PROJECT_ROOT, 'dist', 'tiktok-developers-site-verification.txt'),
  ].filter(Boolean);

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return res.sendFile(candidate);
    }
  }

  if (process.env.TIKTOK_VERIFICATION_TOKEN) {
    return res.send(normalizeVerificationContent(process.env.TIKTOK_VERIFICATION_TOKEN));
  }

  return res.send('tiktok-developers-site-verification=NdEl8xTGVSrLyPtfm5AvlhCBqQWWrIqW');
});

// TikTok Verification Status and Save endpoints
app.get('/api/tiktok/verification-status', (req, res) => {
  const candidatePaths = [
    path.resolve(RUNTIME_WRITABLE_DIR, 'tiktok-developers-site-verification.txt'),
    path.resolve(PROJECT_ROOT, 'public', 'tiktok-developers-site-verification.txt'),
    path.resolve(PROJECT_ROOT, 'dist', 'tiktok-developers-site-verification.txt'),
  ];
  const existingPath = candidatePaths.find((p) => fs.existsSync(p));
  let content: string | null = inMemoryVerificationToken;
  if (!content && existingPath) {
    try {
      content = fs.readFileSync(existingPath, 'utf-8').trim();
    } catch {
      // ignore
    }
  }
  if (!content && process.env.TIKTOK_VERIFICATION_TOKEN) {
    content = normalizeVerificationContent(process.env.TIKTOK_VERIFICATION_TOKEN);
  }
  if (!content) {
    content = 'tiktok-developers-site-verification=NdEl8xTGVSrLyPtfm5AvlhCBqQWWrIqW';
  }

  res.json({
    isConfigured: Boolean(content),
    isServerless: IS_VERCEL,
    fileName: 'tiktok-developers-site-verification.txt',
    content,
    url: '/tiktok-developers-site-verification.txt',
  });
});

app.post('/api/tiktok/save-verification', (req, res) => {
  try {
    const { token, fileName, content } = req.body || {};
    if (!token && !content) {
      return res.status(400).json({ error: 'Token ou contenu du fichier manquant.' });
    }

    const writeDir = IS_VERCEL ? RUNTIME_WRITABLE_DIR : path.resolve(PROJECT_ROOT, 'public');
    if (!fs.existsSync(writeDir)) {
      fs.mkdirSync(writeDir, { recursive: true });
    }

    const targetFileName = (fileName || 'tiktok-developers-site-verification.txt').replace(/[^a-zA-Z0-9._-]/g, '');
    const rawValue = String(content || token || '').trim();
    const stdContent = normalizeVerificationContent(rawValue);
    inMemoryVerificationToken = stdContent;

    fs.writeFileSync(path.resolve(writeDir, targetFileName), stdContent, 'utf-8');

    // Always keep standard filename synchronized
    if (targetFileName !== 'tiktok-developers-site-verification.txt') {
      fs.writeFileSync(path.resolve(writeDir, 'tiktok-developers-site-verification.txt'), stdContent, 'utf-8');
    }

    // Also write tiktok<token>.txt so exact token-named URL prefix checks succeed immediately
    const extractedToken = stdContent.replace(/^tiktok-developers-site-verification=/i, '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (extractedToken.length >= 8) {
      fs.writeFileSync(path.resolve(writeDir, `tiktok${extractedToken}.txt`), stdContent, 'utf-8');
    }

    return res.json({
      success: true,
      isServerless: IS_VERCEL,
      fileName: targetFileName,
      fileUrl: `/${targetFileName}`,
      content: stdContent,
      message: IS_VERCEL
        ? `Fichier ${targetFileName} activé ! Conseil Vercel : ajoute aussi la variable d’environnement TIKTOK_VERIFICATION_TOKEN="${stdContent}" dans Vercel → Settings → Environment Variables puis Redeploy pour qu’elle reste active en permanence sur tous les serveurs.`
        : `Fichier ${targetFileName} enregistré avec succès. Le portail développeur peut désormais le vérifier.`,
    });
  } catch (error: any) {
    console.error('Error saving TikTok verification file:', error);
    return res.status(500).json({
      error: error?.message || "Erreur lors de l'enregistrement du fichier de vérification.",
    });
  }
});

// Direct logo download endpoint for Resonantia
app.get('/api/download-logo', (req, res) => {
  const filePath = path.resolve(__dirname, 'public', 'logo-1024.png');
  res.download(filePath, 'resonantia_logo_1024x1024.png', (err) => {
    if (err && !res.headersSent) {
      res.status(404).send('Logo file not found');
    }
  });
});

app.get('/api/download-logo-jpg', (req, res) => {
  const filePath = path.resolve(__dirname, 'public', 'logo-1024.jpg');
  res.download(filePath, 'resonantia_logo_1024x1024.jpg', (err) => {
    if (err && !res.headersSent) {
      res.status(404).send('Logo file not found');
    }
  });
});

app.get('/api/download-src-zip', (req, res) => {
  const filePath = path.resolve(__dirname, 'public', 'src-and-tests.zip');
  res.download(filePath, 'src-and-tests.zip', (err) => {
    if (err && !res.headersSent) {
      res.status(404).send('Archive src-and-tests.zip introuvable');
    }
  });
});

app.get('/api/download-full-zip', (req, res) => {
  const filePath = path.resolve(__dirname, 'public', 'resonantia-source.zip');
  res.download(filePath, 'resonantia-source.zip', (err) => {
    if (err && !res.headersSent) {
      res.status(404).send('Archive resonantia-source.zip introuvable');
    }
  });
});

// Explicit route to return the exact public URLs (zero "tiktok" in URLs)
app.get(['/api/public-urls', '/api/tiktok/public-urls'], (req, res) => {
  const host = req.get('host') || 'ais-pre-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app';
  const proto = req.get('x-forwarded-proto') || 'https';
  const baseUrl = (process.env.APP_URL || `${proto}://${host}`).replace(/\/$/, '');

  res.json({
    baseUrl,
    webUrl: `${baseUrl}/`,
    termsUrl: `${baseUrl}/terms`,
    privacyUrl: `${baseUrl}/privacy`,
    redirectUri: `${baseUrl}/api/auth/callback`,
    logoPngUrl: `${baseUrl}/logo-1024.png`,
    logoJpgUrl: `${baseUrl}/logo-1024.jpg`,
    logoDownloadUrl: `${baseUrl}/api/download-logo`,
  });
});

// API Routes

// Health check / System status
app.get('/api/system-status', (req, res) => {
  res.json({
    deterministicEngine: true,
    tiktokApiReady: Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ============================================================================
// OFFICIAL TIKTOK OAUTH 2.0 & DISPLAY API (Login Kit, user.info.stats, video.list)
// ============================================================================

interface TikTokServerSession {
  openId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
  account: {
    openId: string;
    unionId?: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    profileDeepLink?: string;
    isVerified: boolean;
    followerCount: number;
    followingCount: number;
    likesCount: number;
    videoCount: number;
    connectedAt: string;
    scopesGranted: string[];
    source: 'official_api';
  };
}

const SESSION_FILE = path.resolve(RUNTIME_WRITABLE_DIR, '.tiktok_session.json');
const SESSIONS_BY_USER_FILE = path.resolve(RUNTIME_WRITABLE_DIR, '.tiktok_sessions_by_user.json');
const KEYS_FILE = path.resolve(RUNTIME_WRITABLE_DIR, '.tiktok_keys.json');
const VIDEOS_CACHE_FILE = path.resolve(RUNTIME_WRITABLE_DIR, '.tiktok_videos.json');
const VIDEOS_BY_ACCOUNT_FILE = path.resolve(RUNTIME_WRITABLE_DIR, '.tiktok_videos_by_account.json');
const SNAPSHOTS_FILE = path.resolve(RUNTIME_WRITABLE_DIR, '.tiktok_snapshots.json');
const CORRECTIONS_FILE = path.resolve(RUNTIME_WRITABLE_DIR, '.tiktok_corrections.json');
const FOLLOWERS_HISTORY_FILE = path.resolve(RUNTIME_WRITABLE_DIR, '.tiktok_followers.json');

function readJsonArrayFile(filePath: string): any[] {
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.warn(`Could not read ${path.basename(filePath)}:`, e);
  }
  return [];
}

function readJsonObjectFile(filePath: string): Record<string, any> {
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    }
  } catch (e) {
    console.warn(`Could not read ${path.basename(filePath)}:`, e);
  }
  return {};
}

function writeJsonSecureFile(filePath: string, payload: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), { encoding: 'utf-8', mode: 0o600 });
  } catch (e) {
    console.warn(`Could not write ${path.basename(filePath)}:`, e);
  }
}

function resolveRequestUserId(req: express.Request): string {
  const raw =
    (req.get('x-user-id') || (req.query.user_id as string) || (req.body?.userId as string) || '').trim();
  if (!raw) return 'default';
  return raw.replace(/[^a-zA-Z0-9._:@-]/g, '').slice(0, 128) || 'default';
}

function saveCachedVideosForAccount(openId: string | undefined, videos: any[]) {
  if (!openId) {
    writeJsonSecureFile(VIDEOS_CACHE_FILE, videos);
    return;
  }
  const map = readJsonObjectFile(VIDEOS_BY_ACCOUNT_FILE);
  map[openId] = videos;
  writeJsonSecureFile(VIDEOS_BY_ACCOUNT_FILE, map);
}

function loadCachedVideosForAccount(openId?: string): any[] {
  if (openId) {
    const map = readJsonObjectFile(VIDEOS_BY_ACCOUNT_FILE);
    if (Array.isArray(map[openId])) return map[openId];
  }
  const legacy = readJsonArrayFile(VIDEOS_CACHE_FILE);
  if (openId) {
    return legacy.filter((v: any) => !v?.accountId || v.accountId === openId);
  }
  return legacy;
}

function getTikTokCredentials(): { clientKey: string; clientSecret: string } {
  let clientKey = (process.env.TIKTOK_CLIENT_KEY || process.env.CLIENT_ID || '').trim();
  let clientSecret = (process.env.TIKTOK_CLIENT_SECRET || process.env.CLIENT_SECRET || '').trim();

  if ((!clientKey || !clientSecret) && fs.existsSync(KEYS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8'));
      if (data.clientKey && !clientKey) clientKey = String(data.clientKey).trim();
      if (data.clientSecret && !clientSecret) clientSecret = String(data.clientSecret).trim();
      if (clientKey) process.env.TIKTOK_CLIENT_KEY = clientKey;
      if (clientSecret) process.env.TIKTOK_CLIENT_SECRET = clientSecret;
    } catch (e) {
      // ignore
    }
  }

  return { clientKey, clientSecret };
}

function loadAllSessionsByUser(): Record<string, TikTokServerSession> {
  const map = readJsonObjectFile(SESSIONS_BY_USER_FILE) as Record<string, TikTokServerSession>;
  // Backward compatibility: migrate legacy single session into 'default' if map is empty
  if (Object.keys(map).length === 0 && fs.existsSync(SESSION_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
      if (parsed && parsed.accessToken && parsed.openId) {
        map.default = parsed;
      }
    } catch {
      // ignore
    }
  }
  return map;
}

function saveTikTokSessionForUser(userId: string, session: TikTokServerSession | null) {
  const key = userId || 'default';
  const map = loadAllSessionsByUser();
  if (session) {
    map[key] = session;
    writeJsonSecureFile(SESSIONS_BY_USER_FILE, map);
    if (key === 'default') {
      writeJsonSecureFile(SESSION_FILE, session);
    }
  } else {
    delete map[key];
    writeJsonSecureFile(SESSIONS_BY_USER_FILE, map);
    if (key === 'default' && fs.existsSync(SESSION_FILE)) {
      try {
        fs.unlinkSync(SESSION_FILE);
      } catch {
        // ignore
      }
    }
  }
}

function loadTikTokSessionForUser(userId: string): TikTokServerSession | null {
  const key = userId || 'default';
  const map = loadAllSessionsByUser();
  const found = map[key];
  if (found && found.accessToken && found.openId) {
    return found;
  }
  return null;
}

async function getValidTikTokSessionForUser(
  userId: string,
  forceRefresh = false
): Promise<TikTokServerSession | null> {
  const session = loadTikTokSessionForUser(userId);
  if (!session) return null;

  const now = Date.now();
  const isExpired = !session.accessToken || (session.expiresAt && now >= session.expiresAt - 60 * 1000);

  if ((isExpired || forceRefresh) && session.refreshToken) {
    const { clientKey, clientSecret } = getTikTokCredentials();
    if (clientKey && clientSecret) {
      try {
        console.log(`[TikTok Auth] Refreshing token for user=${userId} via grant_type: refresh_token...`);
        const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cache-Control': 'no-cache',
          },
          body: new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token: session.refreshToken,
          }).toString(),
        });

        if (res.ok) {
          const resJson = await res.json();
          const newAccessToken = resJson.access_token || resJson.data?.access_token;
          if (newAccessToken) {
            session.accessToken = newAccessToken;
            if (resJson.refresh_token || resJson.data?.refresh_token) {
              session.refreshToken = resJson.refresh_token || resJson.data?.refresh_token;
            }
            const expiresIn = resJson.expires_in || resJson.data?.expires_in || 86400;
            session.expiresAt = Date.now() + Number(expiresIn) * 1000;
            saveTikTokSessionForUser(userId, session);
            console.log('[TikTok Auth] Token refreshed successfully!');
          }
        } else {
          console.warn('[TikTok Auth] Refresh failed with status:', res.status);
        }
      } catch (err) {
        console.error('[TikTok Auth] Error refreshing token:', err);
      }
    }
  }

  return session;
}

// 1. Get TikTok API Status & Environment Configuration (scoped per authenticated user)
app.get(['/api/tiktok/status', '/api/tiktok/auth/status'], async (req, res) => {
  const userId = resolveRequestUserId(req);
  const session = await getValidTikTokSessionForUser(userId);

  const { clientKey, clientSecret } = getTikTokCredentials();
  const isConfigured = Boolean(clientKey && clientSecret);

  const appUrl = (process.env.APP_URL || 'https://ais-dev-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app').replace(/\/$/, '');
  const redirectUri = `${appUrl}/api/auth/callback`;

  const requiredScopes = ['user.info.basic', 'user.info.stats', 'video.list'];
  const granted = session?.account?.scopesGranted || [];
  const missingScopes = requiredScopes.filter((s) => !granted.includes(s));

  res.json({
    isConfigured,
    isSandbox: clientKey.startsWith('sb'),
    isConnected: Boolean(session),
    account: session ? session.account : null,
    redirectUri,
    requiredScopes,
    missingScopes,
    serverMessage: !isConfigured
      ? "Clés API manquantes : veuillez renseigner TIKTOK_CLIENT_KEY et TIKTOK_CLIENT_SECRET."
      : !session
      ? "En attente d'autorisation OAuth via le bouton officiel TikTok."
      : "Compte connecté avec succès via l'API officielle TikTok.",
  });
});

// Save TikTok API Keys (Client Key & Client Secret) from settings
app.post('/api/tiktok/save-keys', (req, res) => {
  try {
    const { clientKey, clientSecret } = req.body;
    if (!clientKey || !clientSecret) {
      return res.status(400).json({ error: 'Client Key et Client Secret sont obligatoires.' });
    }

    const trimmedKey = String(clientKey).trim();
    const trimmedSecret = String(clientSecret).trim();

    process.env.TIKTOK_CLIENT_KEY = trimmedKey;
    process.env.TIKTOK_CLIENT_SECRET = trimmedSecret;

    // Persist to .tiktok_keys.json (server-only, chmod 600)
    try {
      fs.writeFileSync(
        KEYS_FILE,
        JSON.stringify({ clientKey: trimmedKey, clientSecret: trimmedSecret }, null, 2),
        { encoding: 'utf-8', mode: 0o600 }
      );
    } catch (e) {
      console.warn('Could not update .tiktok_keys.json file:', e);
    }

    // Persist to .env file if possible (chmod 600)
    try {
      const envPath = path.resolve(__dirname, '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }
      envContent = envContent
        .split('\n')
        .filter((line) => !line.startsWith('TIKTOK_CLIENT_KEY=') && !line.startsWith('TIKTOK_CLIENT_SECRET='))
        .join('\n');
      envContent += `\nTIKTOK_CLIENT_KEY=${trimmedKey}\nTIKTOK_CLIENT_SECRET=${trimmedSecret}\n`;
      fs.writeFileSync(envPath, envContent.trim() + '\n', { encoding: 'utf-8', mode: 0o600 });
    } catch (e) {
      console.warn('Could not update .env file:', e);
    }

    return res.json({
      success: true,
      message: 'Clés API TikTok enregistrées avec succès.',
      isConfigured: true,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erreur lors de la sauvegarde des clés TikTok.' });
  }
});

// 2. Generate Official OAuth Authorization URL (opened in direct popup)
app.get('/api/tiktok/auth-url', (req, res) => {
  const { clientKey } = getTikTokCredentials();
  const host = (req.get('x-forwarded-host') || req.get('host') || '').toLowerCase();
  const referer = (req.get('referer') || '').toLowerCase();

  let defaultAppUrl = 'https://ais-dev-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app';
  if (referer.includes('ais-pre-') || host.includes('ais-pre-')) {
    defaultAppUrl = 'https://ais-pre-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app';
  } else if (process.env.APP_URL) {
    defaultAppUrl = process.env.APP_URL.replace(/\/$/, '');
  }

  // Exact redirectUri requested by client or default derived URL (no "tiktok" in URI)
  const redirectUri = (req.query.redirect_uri as string) || `${defaultAppUrl}/api/auth/callback`;

  if (!clientKey) {
    return res.status(400).json({
      error: "Clé client manquante (TIKTOK_CLIENT_KEY). Veuillez la renseigner sur le serveur.",
      redirectUri,
    });
  }

  // Pack the exact redirectUri and userId into OAuth state parameter so callback isolates each user cleanly
  const userId = resolveRequestUserId(req);
  const csrf = Math.random().toString(36).substring(2, 10);
  const uidB64 = Buffer.from(userId).toString('base64url');
  const uriB64 = Buffer.from(redirectUri).toString('base64url');
  const csrfState = `rs_${csrf}_uid_${uidB64}_ruri_${uriB64}`;

  const scopes = (req.query.scope as string) || 'user.info.basic,user.info.stats,video.list';
  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${encodeURIComponent(
    clientKey
  )}&scope=${encodeURIComponent(scopes)}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${encodeURIComponent(csrfState)}`;

  return res.json({
    url: authUrl,
    redirectUri,
    scopes: scopes.split(','),
  });
});

// 3. OAuth Callback (canonical /api/auth/callback + legacy alias)
app.get(['/api/auth/callback', '/api/auth/callback/', '/api/tiktok/callback', '/api/tiktok/callback/'], async (req, res) => {
  const { code, error, error_description, state } = req.query;

  if (error) {
    const errorMsg =
      (error_description as string) || (error as string) || "Accès refusé ou annulé par l'utilisateur.";
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Erreur Connexion TikTok</title></head>
        <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: white; margin: 0;">
          <div style="background: #1e293b; padding: 32px; border-radius: 16px; border: 1px solid #334155; text-align: center; max-width: 480px;">
            <div style="font-size: 40px; margin-bottom: 16px;">⚠️</div>
            <h2 style="color: #f87171; margin: 0 0 12px 0;">Échec de l'autorisation TikTok</h2>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">${escapeHtml(errorMsg)}</p>
            <p style="color: #64748b; font-size: 12px; margin-top: 16px;">Fermeture automatique...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'TIKTOK_OAUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
              setTimeout(() => window.close(), 3000);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send("Code d'autorisation TikTok manquant.");
  }

  const { clientKey, clientSecret } = getTikTokCredentials();

  if (!clientKey || !clientSecret) {
    return res.status(500).send("Configuration TikTok incomplète sur le serveur (TIKTOK_CLIENT_KEY ou TIKTOK_CLIENT_SECRET manquant).");
  }

  // 1. Recover the exact redirectUri and userId from the state parameter
  let stateRedirectUri = '';
  let stateUserId = 'default';
  const stateStr = String(state || '');
  if (stateStr.includes('_uid_')) {
    try {
      const uidPart = stateStr.split('_uid_')[1].split('_ruri_')[0];
      const decodedUid = Buffer.from(uidPart, 'base64url').toString('utf-8').trim();
      if (decodedUid) {
        stateUserId = decodedUid.replace(/[^a-zA-Z0-9._:@-]/g, '').slice(0, 128) || 'default';
      }
    } catch (e) {
      console.warn('[TIKTOK CALLBACK] Error decoding state userId:', e);
    }
  }
  if (stateStr.includes('_ruri_')) {
    try {
      const rawB64 = stateStr.split('_ruri_')[1];
      const decoded = Buffer.from(rawB64, 'base64url').toString('utf-8');
      if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
        stateRedirectUri = decoded;
        console.log('[TIKTOK CALLBACK] Successfully decoded exact redirect_uri from state:', stateRedirectUri);
      }
    } catch (e) {
      console.warn('[TIKTOK CALLBACK] Error decoding state redirect_uri:', e);
    }
  }

  // Build ordered list of candidate redirect URIs to try
  const candidates: string[] = [];
  if (stateRedirectUri) candidates.push(stateRedirectUri);

  const host = (req.get('x-forwarded-host') || req.get('host') || '').toLowerCase();
  const proto = req.get('x-forwarded-proto') || 'https';
  if (host.includes('ais-pre-')) {
    candidates.push('https://ais-pre-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app/api/auth/callback');
  } else if (host) {
    candidates.push(`${proto}://${host}/api/auth/callback`);
  }

  candidates.push('https://ais-pre-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app/api/auth/callback');
  candidates.push('https://ais-dev-qcf5shvygx4juhsres3eel-92488514361.europe-west3.run.app/api/auth/callback');

  const uniqueCandidates = candidates.filter((u, i, arr) => Boolean(u) && arr.indexOf(u) === i);
  console.log('[TIKTOK CALLBACK] Attempting token exchange with candidate URIs:', uniqueCandidates);

  try {
    let tokenData: any = null;
    let usedUri = '';
    let lastErrorDesc = '';

    for (const candidateUri of uniqueCandidates) {
      console.log('[TIKTOK TOKEN EXCHANGE] Trying redirect_uri:', candidateUri);
      const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache',
        },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code: code as string,
          grant_type: 'authorization_code',
          redirect_uri: candidateUri,
        }).toString(),
      });

      const resJson = await tokenRes.json();
      const accessToken = resJson.access_token || resJson.data?.access_token;
      console.log(
        `[TIKTOK TOKEN RESPONSE for ${candidateUri}]:`,
        JSON.stringify({
          status: tokenRes.status,
          hasAccessToken: Boolean(accessToken),
          hasRefreshToken: Boolean(resJson.refresh_token || resJson.data?.refresh_token),
          scope: resJson.scope || resJson.data?.scope || null,
          error: resJson.error || null,
        })
      );

      if (accessToken) {
        tokenData = resJson;
        usedUri = candidateUri;
        console.log(`[TIKTOK TOKEN SUCCESS] Connected successfully with redirect_uri: ${usedUri}`);
        break;
      }

      const desc = resJson.error_description || resJson.error?.message || resJson.message || '';
      lastErrorDesc = desc || `Échec échange jeton (HTTP ${tokenRes.status})`;

      // If the error is not a mismatch, stopping early preserves diagnostics
      if (!desc.toLowerCase().includes('redirect uri does not match')) {
        tokenData = resJson;
        break;
      }
    }

    const access_token = tokenData?.access_token || tokenData?.data?.access_token;
    const open_id = tokenData?.open_id || tokenData?.data?.open_id;
    const refresh_token = tokenData?.refresh_token || tokenData?.data?.refresh_token || '';
    const expires_in = tokenData?.expires_in || tokenData?.data?.expires_in || 7200;
    const scope = tokenData?.scope || tokenData?.data?.scope || '';

    if (!access_token || !open_id) {
      const errMsg =
        tokenData?.error_description ||
        lastErrorDesc ||
        tokenData?.error?.message ||
        "Échec de l'échange de jeton avec TikTok.";
      console.error('[TIKTOK TOKEN ERROR]', errMsg, { error: tokenData?.error || null });
      throw new Error(errMsg);
    }

    // 2. Fetch User Profile Info using authorized scopes
    const hasStatsScope = (scope || '').includes('user.info.stats');
    const hasProfileScope = (scope || '').includes('user.info.profile');
    const permittedUserFields = ['open_id', 'union_id', 'avatar_url', 'display_name'];
    if (hasStatsScope) {
      permittedUserFields.push('follower_count', 'following_count', 'likes_count', 'video_count');
    }
    if (hasProfileScope) {
      permittedUserFields.push('username', 'profile_deep_link', 'is_verified');
    }

    let userData: any = null;
    try {
      const userRes = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${permittedUserFields.join(',')}`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      if (userRes.ok) {
        const userJson = await userRes.json();
        userData = userJson.data?.user || null;
      }
    } catch (userErr) {
      console.warn('Could not fetch user fields from TikTok:', userErr);
    }

    const scopesGranted = (scope || 'user.info.basic,user.info.stats,video.list')
      .split(',')
      .map((s: string) => s.trim());

    const fallbackUsername = userData?.username
      ? `@${userData.username}`
      : userData?.display_name
      ? `@${userData.display_name.replace(/\s+/g, '_')}`
      : `@tiktok_${String(open_id).slice(-6)}`;

    const accountData = {
      openId: open_id,
      unionId: userData?.union_id,
      username: fallbackUsername,
      displayName: userData?.display_name || 'Compte TikTok',
      avatarUrl: userData?.avatar_url || '',
      profileDeepLink: userData?.profile_deep_link || `https://www.tiktok.com/${fallbackUsername}`,
      isVerified: Boolean(userData?.is_verified),
      followerCount: Number(userData?.follower_count || 0),
      followingCount: Number(userData?.following_count || 0),
      likesCount: Number(userData?.likes_count || 0),
      videoCount: Number(userData?.video_count || 0),
      connectedAt: new Date().toISOString(),
      scopesGranted,
      source: 'official_api' as const,
    };

    const newSession: TikTokServerSession = {
      openId: open_id,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + (Number(expires_in) || 86400) * 1000,
      scope: scope || '',
      account: accountData,
    };
    saveTikTokSessionForUser(stateUserId, newSession);

    // Immediately pre-sync videos during OAuth callback so Mon Coach & TikTok Analytics already have all data
    let initialSyncedVideos: any[] = [];
    const hasVideoScope = (scope || '').includes('video.list');
    if (hasVideoScope) {
      try {
        const videoFields =
          'id,create_time,title,video_description,duration,cover_image_url,share_url,view_count,like_count,comment_count,share_count';
        let cursor: number | undefined = undefined;
        let hasMore = true;
        let pageCount = 0;
        const maxPages = 10;
        let rawVideos: any[] = [];

        while (hasMore && pageCount < maxPages) {
          pageCount++;
          const payload: any = { max_count: 20 };
          if (cursor !== undefined) payload.cursor = cursor;
          const listRes = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${videoFields}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          if (!listRes.ok) break;
          const listData = await listRes.json();
          const pageVideos = listData.data?.videos || [];
          rawVideos = rawVideos.concat(pageVideos);
          hasMore = Boolean(listData.data?.has_more);
          cursor = listData.data?.cursor;
          if (!hasMore || pageVideos.length === 0) break;
        }

        if (rawVideos.length > 0) {
          const videoWithShareUrl = rawVideos.find((v) => v.share_url);
          if (videoWithShareUrl?.share_url) {
            const handleMatch = videoWithShareUrl.share_url.match(/@([a-zA-Z0-9_.-]+)/);
            if (handleMatch) {
              const extractedHandle = `@${handleMatch[1]}`;
              newSession.account.username = extractedHandle;
              newSession.account.profileDeepLink = `https://www.tiktok.com/${extractedHandle}`;
              saveTikTokSessionForUser(stateUserId, newSession);
            }
          }

          const { safePercent, buildSnapshotAndCorrectionUpdate } = await getCentralDataEngine();
          const nowIso = new Date().toISOString();
          initialSyncedVideos = rawVideos.map((v) => {
            const views = Number(v.view_count ?? 0);
            const likes = Number(v.like_count ?? 0);
            const comments = Number(v.comment_count ?? 0);
            const shares = Number(v.share_count ?? 0);
            const rawDuration = v.duration !== undefined && v.duration !== null ? Number(v.duration) : 0;
            const engagementRate = safePercent(likes + comments + shares, views, 2) ?? 0;

            return {
              id: String(v.id),
              accountId: open_id,
              createTime: Number(v.create_time || Math.floor(Date.now() / 1000)),
              title: v.title || v.video_description || `Vidéo #${String(v.id).slice(-4)}`,
              videoDescription: v.video_description || '',
              duration: rawDuration,
              durationStatus: rawDuration > 0 ? ('measured' as const) : ('not_provided_by_tiktok' as const),
              coverImageUrl: v.cover_image_url || '',
              shareUrl: v.share_url || '',
              viewCount: views,
              viewCountStatus: v.view_count === 0 ? ('verified_zero' as const) : ('measured' as const),
              likeCount: likes,
              likeCountStatus: v.like_count === 0 ? ('verified_zero' as const) : ('measured' as const),
              commentCount: comments,
              commentCountStatus: v.comment_count === 0 ? ('verified_zero' as const) : ('measured' as const),
              shareCount: shares,
              shareCountStatus: v.share_count === 0 ? ('verified_zero' as const) : ('measured' as const),
              favoriteCount: null,
              favoriteCountStatus: 'not_provided_by_tiktok' as const,
              attributedFollowers: null,
              attributedFollowersSource: 'unavailable' as const,
              engagementRate,
              source: 'official_api' as const,
              lastSyncedAt: nowIso,
            };
          });

          saveCachedVideosForAccount(open_id, initialSyncedVideos);
          const accountSnapshots = readJsonArrayFile(SNAPSHOTS_FILE);
          const { newSnapshots, corrections } = buildSnapshotAndCorrectionUpdate(
            accountSnapshots.filter((s: any) => s.accountId === open_id),
            initialSyncedVideos,
            nowIso
          );
          if (newSnapshots.length > 0) {
            writeJsonSecureFile(SNAPSHOTS_FILE, [...accountSnapshots, ...newSnapshots]);
          }
          if (corrections.length > 0) {
            const accountCorrections = readJsonArrayFile(CORRECTIONS_FILE);
            writeJsonSecureFile(CORRECTIONS_FILE, [...accountCorrections, ...corrections]);
          }
        }
      } catch (preSyncErr) {
        console.warn('[TIKTOK CALLBACK] Pre-sync skipped (will retry on client):', preSyncErr);
      }
    }

    const finalAccountData = newSession.account;

    // Return popup postMessage script conforming to oauth-integration skill
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Connexion TikTok Autorisée</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 32px; text-align: center; max-width: 420px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
            .icon { width: 56px; height: 56px; border-radius: 50%; background: #10b981; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 16px; }
            h2 { margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #ffffff; }
            p { margin: 0 0 16px 0; font-size: 14px; color: #94a3b8; }
            .user-chip { display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); padding: 8px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; color: #34d399; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h2>Connexion TikTok Réussie</h2>
            <p>Votre compte et vos statistiques ont été synchronisés avec succès.</p>
            <div class="user-chip">
              <span>${escapeHtml(finalAccountData.displayName)}</span>
              <span>(${escapeHtml(finalAccountData.username)})</span>
            </div>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'TIKTOK_OAUTH_SUCCESS',
                openId: ${JSON.stringify(open_id)},
                account: ${JSON.stringify(finalAccountData)},
                videos: ${JSON.stringify(initialSyncedVideos)}
              }, '*');
              setTimeout(() => {
                window.close();
              }, 1000);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error('Error in TikTok OAuth callback:', err?.message || err);
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Erreur Connexion TikTok</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; border: 1px solid #ef4444; border-radius: 20px; padding: 32px; text-align: center; max-width: 440px; }
            h2 { margin: 0 0 8px 0; color: #f87171; }
            p { color: #94a3b8; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Erreur lors de la connexion TikTok</h2>
            <p>${escapeHtml(err?.message || "Une erreur inconnue est survenue lors de l'échange de jeton avec TikTok.")}</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'TIKTOK_OAUTH_ERROR',
                error: ${JSON.stringify(err.message || 'Erreur lors de la connexion')}
              }, '*');
              setTimeout(() => window.close(), 3000);
            }
          </script>
        </body>
      </html>
    `);
  }
});

// 4. Synchronize Account Stats & Video List (user.info.stats + video.list with pagination)
app.post('/api/tiktok/sync', async (req, res) => {
  const userId = resolveRequestUserId(req);
  let session = await getValidTikTokSessionForUser(userId);

  if (!session || !session.accessToken) {
    return res.status(401).json({
      error: "Aucun compte TikTok n'est actuellement connecté via OAuth. Veuillez d'abord connecter votre compte.",
      requiresAuth: true,
    });
  }

  let currentAccessToken = session.accessToken;
  const { openId, scope } = session;
  const hasStatsScope = (scope || '').includes('user.info.stats');
  const hasVideoScope = (scope || '').includes('video.list');

  try {
    // 1. Refresh User Profile Info (include permitted fields according to scopes)
    const hasProfileScope = (scope || '').includes('user.info.profile');
    const permittedUserFields = ['open_id', 'union_id', 'avatar_url', 'display_name'];
    if (hasStatsScope) {
      permittedUserFields.push('follower_count', 'following_count', 'likes_count', 'video_count');
    }
    if (hasProfileScope) {
      permittedUserFields.push('username', 'profile_deep_link', 'is_verified');
    }

    let userRes = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${permittedUserFields.join(',')}`, {
      headers: { Authorization: `Bearer ${currentAccessToken}` },
    });

    if (userRes.status === 401) {
      session = await getValidTikTokSessionForUser(userId, true);
      if (session?.accessToken) {
        currentAccessToken = session.accessToken;
        userRes = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${permittedUserFields.join(',')}`, {
          headers: { Authorization: `Bearer ${currentAccessToken}` },
        });
      }
    }

    if (userRes.ok) {
      const userJson = await userRes.json();
      const u = userJson.data?.user;
      if (u && session) {
        session.account = {
          ...session.account,
          displayName: u.display_name || session.account.displayName,
          avatarUrl: u.avatar_url || session.account.avatarUrl,
          followerCount: hasStatsScope ? Number(u.follower_count || 0) : session.account.followerCount,
          followingCount: hasStatsScope ? Number(u.following_count || 0) : session.account.followingCount,
          likesCount: hasStatsScope ? Number(u.likes_count || 0) : session.account.likesCount,
          videoCount: hasStatsScope ? Number(u.video_count || 0) : session.account.videoCount,
        };
      }
    }

    // 2. Fetch video.list only if authorized (video.list scope)
    let allRawVideos: any[] = [];
    let lastApiError: any = null;
    if (hasVideoScope) {
      const videoFields =
        'id,create_time,title,video_description,duration,cover_image_url,share_url,view_count,like_count,comment_count,share_count';
      let cursor: number | undefined = undefined;
      let hasMore = true;
      let pageCount = 0;
      const maxPages = 15; // Up to 300 videos

      while (hasMore && pageCount < maxPages) {
        pageCount++;
        const payload: any = { max_count: 20 };
        if (cursor !== undefined) {
          payload.cursor = cursor;
        }

        let listRes = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${videoFields}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (listRes.status === 401) {
          console.log('[TikTok Sync] Access token expired, attempting refresh...');
          session = await getValidTikTokSessionForUser(userId, true);
          if (session?.accessToken) {
            currentAccessToken = session.accessToken;
            listRes = await fetch(`https://open.tiktokapis.com/v2/video/list/?fields=${videoFields}`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${currentAccessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            });
          }
        }

        if (!listRes.ok) {
          const errJson = await listRes.json().catch(() => ({}));
          console.warn('TikTok video.list response on page', pageCount, listRes.status, errJson);
          lastApiError = {
            status: listRes.status,
            code: errJson?.error?.code || 'api_error',
            message: errJson?.error?.message || `Erreur TikTok API (${listRes.status})`,
          };
          break;
        }

        const listData = await listRes.json();
        const pageVideos = listData.data?.videos || [];
        allRawVideos = allRawVideos.concat(pageVideos);
        hasMore = Boolean(listData.data?.has_more);
        cursor = listData.data?.cursor;

        if (!hasMore || pageVideos.length === 0) break;
      }
    }

    // If an error occurred and no videos were fetched, do not pretend success!
    if (allRawVideos.length === 0 && lastApiError) {
      const isAuthProblem =
        lastApiError.status === 401 ||
        lastApiError.code === 'access_token_invalid' ||
        lastApiError.code === 'scope_not_authorized';
      return res.status(lastApiError.status === 401 ? 401 : 500).json({
        success: false,
        requiresReauth: isAuthProblem,
        error: isAuthProblem
          ? "Votre session TikTok a expiré ou nécessite une ré-autorisation. Veuillez cliquer sur « Reconnecter TikTok » pour actualiser vos métriques."
          : `Erreur lors de la synchronisation TikTok : ${lastApiError.message}`,
        details: lastApiError,
      });
    }

    // Extract real TikTok handle from first video's share_url if available
    if (session) {
      const videoWithShareUrl = allRawVideos.find((v) => v.share_url);
      if (videoWithShareUrl?.share_url) {
        const handleMatch = videoWithShareUrl.share_url.match(/@([a-zA-Z0-9_.-]+)/);
        if (handleMatch) {
          const extractedHandle = `@${handleMatch[1]}`;
          session.account.username = extractedHandle;
          session.account.profileDeepLink = `https://www.tiktok.com/${extractedHandle}`;
        }
      } else if (session.account.displayName) {
        const fallback = `@${session.account.displayName.replace(/\s+/g, '_')}`;
        session.account.username = fallback;
        session.account.profileDeepLink = `https://www.tiktok.com/${fallback}`;
      }
      saveTikTokSessionForUser(userId, session);
    }

    // 3. Transform and preserve strict provenance & missingness
    const { safePercent, buildSnapshotAndCorrectionUpdate } = await getCentralDataEngine();
    const nowIso = new Date().toISOString();
    const mappedVideos = allRawVideos.map((v) => {
      const views = Number(v.view_count ?? 0);
      const likes = Number(v.like_count ?? 0);
      const comments = Number(v.comment_count ?? 0);
      const shares = Number(v.share_count ?? 0);
      const rawDuration = v.duration !== undefined && v.duration !== null ? Number(v.duration) : 0;
      const engagementRate = safePercent(likes + comments + shares, views, 2) ?? 0;

      return {
        id: String(v.id),
        accountId: openId,
        createTime: Number(v.create_time || Math.floor(Date.now() / 1000)),
        title: v.title || v.video_description || `Vidéo #${String(v.id).slice(-4)}`,
        videoDescription: v.video_description || '',
        duration: rawDuration,
        durationStatus: rawDuration > 0 ? ('measured' as const) : ('not_provided_by_tiktok' as const),
        coverImageUrl: v.cover_image_url || '',
        shareUrl: v.share_url || '',
        viewCount: views,
        viewCountStatus: v.view_count === 0 ? ('verified_zero' as const) : ('measured' as const),
        likeCount: likes,
        likeCountStatus: v.like_count === 0 ? ('verified_zero' as const) : ('measured' as const),
        commentCount: comments,
        commentCountStatus: v.comment_count === 0 ? ('verified_zero' as const) : ('measured' as const),
        shareCount: shares,
        shareCountStatus: v.share_count === 0 ? ('verified_zero' as const) : ('measured' as const),
        favoriteCount: null,
        favoriteCountStatus: 'not_provided_by_tiktok' as const,
        attributedFollowers: null,
        attributedFollowersSource: 'unavailable' as const,
        engagementRate,
        source: 'official_api' as const,
        lastSyncedAt: nowIso,
      };
    });

    // 4. Calculate global performance aggregates
    const totalViews = mappedVideos.reduce((acc, v) => acc + v.viewCount, 0);
    const totalLikes = mappedVideos.reduce((acc, v) => acc + v.likeCount, 0);
    const totalComments = mappedVideos.reduce((acc, v) => acc + v.commentCount, 0);
    const totalShares = mappedVideos.reduce((acc, v) => acc + v.shareCount, 0);
    const globalEngagementRate =
      safePercent(totalLikes + totalComments + totalShares, totalViews, 2) ?? 0;

    // Day & time analysis
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayBreakdown: Record<string, { views: number; count: number; totalEng: number }> = {};
    dayNames.forEach((d) => {
      dayBreakdown[d] = { views: 0, count: 0, totalEng: 0 };
    });

    mappedVideos.forEach((v) => {
      const date = new Date(v.createTime * 1000);
      const day = dayNames[date.getDay()];
      if (dayBreakdown[day]) {
        dayBreakdown[day].views += v.viewCount;
        dayBreakdown[day].count += 1;
        dayBreakdown[day].totalEng += v.engagementRate;
      }
    });

    // Save mapped videos + append chronological snapshots + detect counter corrections
    let accountSnapshots = readJsonArrayFile(SNAPSHOTS_FILE);
    let accountCorrections = readJsonArrayFile(CORRECTIONS_FILE);
    if (mappedVideos.length > 0) {
      saveCachedVideosForAccount(openId, mappedVideos);
      const { newSnapshots, corrections } = buildSnapshotAndCorrectionUpdate(
        accountSnapshots.filter((s: any) => s.accountId === openId),
        mappedVideos,
        nowIso
      );
      accountSnapshots = [...accountSnapshots, ...newSnapshots];
      writeJsonSecureFile(SNAPSHOTS_FILE, accountSnapshots);
      if (corrections.length > 0) {
        accountCorrections = [...accountCorrections, ...corrections];
        writeJsonSecureFile(CORRECTIONS_FILE, accountCorrections);
      }
    }

    // Track global follower history when stats scope is available
    let followersHistory = readJsonArrayFile(FOLLOWERS_HISTORY_FILE);
    if (hasStatsScope && session?.account) {
      const acctFol = followersHistory.filter((f: any) => f.accountId === openId);
      const prevFol = acctFol.length > 0 ? acctFol[acctFol.length - 1] : null;
      const newCount = Number(session.account.followerCount || 0);
      if (!prevFol || prevFol.followerCount !== newCount || Date.now() - new Date(prevFol.recordedAt).getTime() > 3600000) {
        followersHistory.push({
          id: `fol_${openId}_${Date.now()}`,
          accountId: openId,
          recordedAt: nowIso,
          followerCount: newCount,
          source: 'tiktok_api',
          deltaSincePrevious: prevFol ? newCount - prevFol.followerCount : null,
        });
        writeJsonSecureFile(FOLLOWERS_HISTORY_FILE, followersHistory);
      }
    }

    return res.json({
      success: true,
      account: session ? session.account : null,
      videos: mappedVideos,
      snapshots: accountSnapshots.filter((s: any) => s.accountId === openId),
      corrections: accountCorrections.filter((c: any) => c.accountId === openId),
      followerHistory: followersHistory.filter((f: any) => f.accountId === openId),
      hasStatsScope,
      hasVideoScope,
      isPartial: !hasStatsScope || !hasVideoScope,
      summary: {
        totalVideosFetched: mappedVideos.length,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        globalEngagementRate,
        syncedAt: nowIso,
        dayBreakdown,
      },
      message: !hasStatsScope || !hasVideoScope
        ? "Profil relié avec succès via Login Kit (Profil seul). Pour afficher vos abonnés, vos likes et vos vidéos certifiées, autorisez le mode complet via le bouton 'Se connecter avec TikTok (Complet)'."
        : undefined,
    });
  } catch (error: any) {
    console.error('Error syncing TikTok data:', error);
    return res.status(500).json({
      error: error?.message || "Erreur lors de la synchronisation avec l'API TikTok.",
    });
  }
});

// GET /api/tiktok/videos - Fetch cached real videos instantly for Analytics and Coach (user-isolated)
app.get('/api/tiktok/videos', (req, res) => {
  const userId = resolveRequestUserId(req);
  const session = loadTikTokSessionForUser(userId);
  const openId = (req.query.open_id as string) || session?.openId;
  const videos = openId ? loadCachedVideosForAccount(openId) : [];
  const snapshots = openId
    ? readJsonArrayFile(SNAPSHOTS_FILE).filter((s: any) => s.accountId === openId)
    : [];
  const corrections = openId
    ? readJsonArrayFile(CORRECTIONS_FILE).filter((c: any) => c.accountId === openId)
    : [];
  const followerHistory = openId
    ? readJsonArrayFile(FOLLOWERS_HISTORY_FILE).filter((f: any) => f.accountId === openId)
    : [];
  return res.json({
    success: true,
    videos,
    count: videos.length,
    account: session?.account || null,
    snapshots,
    corrections,
    followerHistory,
  });
});

// GET /api/tiktok/snapshots - Return chronological snapshots, counter corrections & follower history
app.get('/api/tiktok/snapshots', (req, res) => {
  const userId = resolveRequestUserId(req);
  const session = loadTikTokSessionForUser(userId);
  const openId = (req.query.accountId as string) || session?.openId;
  const snapshots = openId
    ? readJsonArrayFile(SNAPSHOTS_FILE).filter((s: any) => s.accountId === openId)
    : [];
  const corrections = openId
    ? readJsonArrayFile(CORRECTIONS_FILE).filter((c: any) => c.accountId === openId)
    : [];
  const followerHistory = openId
    ? readJsonArrayFile(FOLLOWERS_HISTORY_FILE).filter((f: any) => f.accountId === openId)
    : [];
  return res.json({
    success: true,
    snapshots,
    corrections,
    followerHistory,
  });
});

// POST /api/tiktok/follower-history - Manual follower count entry
app.post('/api/tiktok/follower-history', (req, res) => {
  try {
    const userId = resolveRequestUserId(req);
    const session = loadTikTokSessionForUser(userId);
    const { followerCount, accountId } = req.body || {};
    const targetId = accountId || session?.openId || userId || 'local';
    const numeric = Number(followerCount);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return res.status(400).json({ error: 'Nombre d’abonnés invalide.' });
    }
    const history = readJsonArrayFile(FOLLOWERS_HISTORY_FILE);
    const forAcct = history.filter((h: any) => h.accountId === targetId);
    const prev = forAcct.length > 0 ? forAcct[forAcct.length - 1] : null;
    const entry = {
      id: `fol_manual_${targetId}_${Date.now()}`,
      accountId: targetId,
      recordedAt: new Date().toISOString(),
      followerCount: Math.round(numeric),
      source: 'manual_input',
      deltaSincePrevious: prev ? Math.round(numeric) - prev.followerCount : null,
    };
    history.push(entry);
    writeJsonSecureFile(FOLLOWERS_HISTORY_FILE, history);
    return res.json({ success: true, entry, followerHistory: history.filter((h: any) => h.accountId === targetId) });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erreur sauvegarde abonnés.' });
  }
});

// 5. Disconnect TikTok Account (only disconnects current user's session)
app.post('/api/tiktok/disconnect', (req, res) => {
  const userId = resolveRequestUserId(req);
  const existing = loadTikTokSessionForUser(userId);
  if (existing?.openId) {
    saveCachedVideosForAccount(existing.openId, []);
  }
  saveTikTokSessionForUser(userId, null);
  res.json({ success: true, message: 'Compte TikTok déconnecté.' });
});

// TikTok Account Public Verification (Fallback / Handle Lookup)
app.get('/api/tiktok-account', async (req, res) => {
  try {
    const handleQuery = req.query.handle as string;
    if (!handleQuery) {
      return res.status(400).json({ error: "Nom d'utilisateur requis." });
    }

    const cleanHandle = handleQuery.trim().replace(/^@/, '');
    const profileUrl = `https://www.tiktok.com/@${cleanHandle}`;

    let oembedData: any = null;
    let isReachable = false;

    try {
      const oembedRes = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(profileUrl)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (oembedRes.ok) {
        oembedData = await oembedRes.json();
        isReachable = true;
      }
    } catch (e) {
      console.warn('TikTok oEmbed lookup fallback:', e);
    }

    return res.json({
      success: true,
      handle: `@${cleanHandle}`,
      profileUrl,
      authorName: oembedData?.author_name || cleanHandle,
      isVerifiedOnTikTok: isReachable,
      hasOEmbed: Boolean(oembedData),
      requiresOAuthForPrivateMetrics: true,
      oauthScopesNeeded: ['user.info.basic', 'user.info.stats', 'video.list'],
      notes: isReachable
        ? `Compte @${cleanHandle} identifié sur TikTok. Pour synchroniser automatiquement vos vues privées et vos statistiques en temps réel, connectez votre application via TikTok Login Kit.`
        : `Compte @${cleanHandle} enregistré. La consultation des statistiques privées nécessite l'autorisation OAuth officielle de TikTok.`,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Erreur lors de la vérification du compte TikTok.',
    });
  }
});

// Deterministic Hashtag Helper (no external AI API key required)
app.post('/api/generate-hashtags', (req, res) => {
  const { title = '', subject = '', caption = '', category = '' } = req.body || {};
  const rawTokens = `${title} ${subject} ${caption} ${category}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !['pour', 'avec', 'dans', 'plus', 'cette', 'vous', 'nous', 'tout', 'video', 'tiktok'].includes(w));

  const uniqueWords = Array.from(new Set(rawTokens)).slice(0, 6);
  const nicheTags = uniqueWords.map((w) => `#${w.charAt(0).toUpperCase()}${w.slice(1)}`);
  const trendingTags = ['#PourToi', '#TikTokFrance', '#Resonantia'];
  const communityTags = ['#CreateurDeContenu', '#Storytelling', '#Communaute'];
  const allCombined = Array.from(new Set([...nicheTags, ...trendingTags, ...communityTags]));

  return res.json({
    success: true,
    tags: {
      trendingTags,
      nicheTags: nicheTags.length > 0 ? nicheTags : ['#Creation', '#Inspiration', '#FormatCourt'],
      communityTags,
      allCombined,
    },
  });
});

// Deterministic Video Structure Helper (no external AI API key required)
app.post('/api/analyze-video', (req, res) => {
  const { fileName, duration, customNotes } = req.body || {};
  const cleanTitle = String(fileName || 'Nouvelle vidéo')
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();
  const dur = Number(duration) > 0 ? Math.round(Number(duration)) : 20;

  return res.json({
    success: true,
    analysis: {
      title: cleanTitle || 'Nouvelle vidéo',
      subject: customNotes || `Séquence de ${dur}s préparée pour TikTok.`,
      ambiance: dur <= 18 ? 'Rythmé & direct' : 'Narratif & immersif',
      visualStyle: 'Format vertical 9:16',
      targetAudience: 'Audience francophone sensible au format court',
      hook: 'Entre directement dans l’action dès la première seconde.',
      caption: `${cleanTitle || 'Nouvelle vidéo'}\n\nDis-moi ce que tu en penses en commentaire.`,
      hashtags: ['#PourToi', '#TikTokFrance', '#CreationDeContenu'],
      recommendedPostingTime: 'Consultez votre Agenda Analytics pour vos créneaux réels.',
      contentTips: [
        'Vérifiez que les 2 premières secondes posent clairement l’émotion ou la tension.',
        'Ajustez l’entrée musicale sur le mouvement clé.',
      ],
    },
  });
});

// Deterministic Caption Variants Helper (no external AI API key required)
app.post('/api/regenerate-caption', (req, res) => {
  const { currentTitle = 'Ta vidéo', tone = 'Direct' } = req.body || {};
  const variants = [
    {
      variantName: `${tone} — Accroche directe`,
      caption: `${currentTitle}\n\nCe détail change tout quand on prend le temps de l’observer.`,
      hashtags: ['#PourToi', '#TikTokFrance', '#Createur'],
      whyItWorks: 'Va droit au but sans surcharger la lecture.',
    },
    {
      variantName: 'Storytelling & résonance',
      caption: `${currentTitle}\n\nSi ce moment te parle, enregistre la vidéo pour y revenir plus tard.`,
      hashtags: ['#Storytelling', '#TikTokFrance', '#Emotion'],
      whyItWorks: 'Encourage l’enregistrement sans promesse artificielle.',
    },
    {
      variantName: 'Question ouverte',
      caption: `${currentTitle}\n\nEt toi, tu aurais réagi comment à ce moment précis ?`,
      hashtags: ['#Discussion', '#PourToi', '#Communaute'],
      whyItWorks: 'Invite naturellement au commentaire.',
    },
  ];
  return res.json({ success: true, variants });
});

// TikTok Link Lookup Helper (oEmbed only, no external AI API key required)
app.post('/api/analyze-tiktok-link', async (req, res) => {
  try {
    const { url, userNotes } = req.body || {};
    if (!url || typeof url !== 'string' || !url.includes('tiktok.com')) {
      return res.status(400).json({
        error: 'Veuillez fournir un lien TikTok valide (contenant tiktok.com).',
      });
    }

    let oembedData: any = null;
    try {
      const oembedRes = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (oembedRes.ok) {
        oembedData = await oembedRes.json();
      }
    } catch (e) {
      console.warn('Oembed fetch fallback:', e);
    }

    const handleMatch = url.match(/@([a-zA-Z0-9_.-]+)/);
    const authorName = oembedData?.author_name || (handleMatch ? `@${handleMatch[1]}` : 'Créateur TikTok');

    return res.json({
      success: true,
      data: {
        url,
        title: oembedData?.title || 'Vidéo TikTok découverte',
        authorName,
        authorUrl: oembedData?.author_url || '',
        thumbnailUrl: oembedData?.thumbnail_url || '',
        category: 'Référence',
        repostReason: userNotes || 'Sélectionnée manuellement dans votre bibliothèque de reposts.',
        suggestedComment: `Crédit : ${authorName}`,
        recommendedTiming: 'Planifiez selon vos créneaux observés dans Analytics.',
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || "Erreur lors de l'analyse du lien TikTok.",
    });
  }
});

// Deterministic Video Causal Analysis (100% local pedagogical engine, zero external API keys)
app.post('/api/tiktok/video-causal-analysis', async (req, res) => {
  const { video, allVideos, siblingVideos, retentionData, memory, qualitativeTraits } = req.body || {};

  if (!video) {
    return res.status(400).json({ error: 'Vidéo manquante.' });
  }

  const { generatePedagogicalAnalysis } = await getLearningMemoryEngine();
  const pedagogical = generatePedagogicalAnalysis(
    video,
    allVideos || [],
    memory,
    qualitativeTraits,
    retentionData
  );

  const deterministicAnalysis = {
    causalVerdict: pedagogical.finalSynthesis.whatWorksSummary,
    reachVsEngagementAnalysis: pedagogical.finalSynthesis.whatFailsSummary,
    duplicateVarianceAnalysis:
      siblingVideos && siblingVideos.length > 0
        ? `Cette publication (${video.duration}s) fait partie d'un groupe de ${siblingVideos.length + 1} publications sur ce sujet. L'écart de diffusion découle de la cadence et de la complétude du format.`
        : 'Aucun doublon direct identifié pour ce sujet spécifique.',
    hookAndRetentionTips: pedagogical.module3Improvements.map((m) => m.howToImprove),
    actionPlan: pedagogical.module3Improvements.map((m) => `${m.targetElement} : ${m.concreteTest}`),
  };

  return res.json({ success: true, analysis: deterministicAnalysis, pedagogicalAnalysis: pedagogical });
});

// Compare Two Videos Pedagogically (1-to-1 deep comparison)
app.post('/api/tiktok/compare-videos', async (req, res) => {
  const { videoA, videoB, memory } = req.body || {};
  if (!videoA || !videoB) {
    return res.status(400).json({ error: 'Les deux vidéos à comparer sont requises.' });
  }

  try {
    const { compareTwoVideosPedagogically } = await getLearningMemoryEngine();
    const comparison = compareTwoVideosPedagogically(videoA, videoB, memory);
    return res.json({ success: true, comparison });
  } catch (err: any) {
    console.error('Error in compare-videos:', err);
    return res.status(500).json({ error: err.message || 'Erreur lors de la comparaison des vidéos.' });
  }
});

// Mon Visionnaire TikTok - Pre-publication Intelligent Analysis
app.post('/api/tiktok/visionnaire-analyze', async (req, res) => {
  const { video, memory } = req.body || {};
  if (!video) {
    return res.status(400).json({ error: 'Données vidéo manquantes pour l’analyse pré-publication.' });
  }

  try {
    const { analyzeVideoPrePublication } = await getVisionnaireEngine();
    const analysis = analyzeVideoPrePublication(video, memory);
    return res.json({ success: true, analysis });
  } catch (err: any) {
    console.error('Error in visionnaire-analyze:', err);
    return res.status(500).json({ error: err.message || 'Erreur lors de l’analyse Visionnaire.' });
  }
});

// ============================================================================
// ÉTAPE 2 : BIBLIOTHÈQUE DE VIDÉOS PÉDAGOGIQUES (PARTAGÉE + PROGRESSIONS ISOLÉES + RBAC ADMIN)
// ============================================================================

const PEDAGOGICAL_VIDEOS_DIR = path.resolve(RUNTIME_WRITABLE_DIR, '.pedagogical_videos');
const PEDAGOGICAL_VIDEOS_META_FILE = path.resolve(RUNTIME_WRITABLE_DIR, '.pedagogical_videos_meta.json');
const PEDAGOGICAL_PROGRESS_FILE = path.resolve(RUNTIME_WRITABLE_DIR, '.pedagogical_progress.json');
const PEDAGOGICAL_ADMINS_FILE = path.resolve(RUNTIME_WRITABLE_DIR, '.pedagogical_admins.json');

let pedagogicalLogicCache: typeof import('./src/utils/pedagogicalVideosLogic') | null = null;
async function getPedagogicalLogic() {
  if (!pedagogicalLogicCache) {
    pedagogicalLogicCache = await import('./src/utils/pedagogicalVideosLogic');
  }
  return pedagogicalLogicCache;
}

function getAllowedAdminEmails(): string[] {
  const emails = new Set<string>(['loris.novel@gmail.com']);
  const envRaw = process.env.ADMIN_EMAILS || process.env.PEDAGOGICAL_ADMIN_EMAILS || '';
  envRaw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .forEach((e) => emails.add(e));

  try {
    if (fs.existsSync(PEDAGOGICAL_ADMINS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PEDAGOGICAL_ADMINS_FILE, 'utf-8'));
      if (parsed?.workspaceOwnerEmail) {
        emails.add(String(parsed.workspaceOwnerEmail).trim().toLowerCase());
      }
      if (Array.isArray(parsed?.extraAdmins)) {
        parsed.extraAdmins.forEach((e: string) => {
          if (e) emails.add(String(e).trim().toLowerCase());
        });
      }
    }
  } catch {
    // ignore
  }

  return Array.from(emails);
}

async function isServerPedagogicalAdmin(email?: string | null): Promise<boolean> {
  const { isPedagogicalAdminIdentity } = await getPedagogicalLogic();
  return isPedagogicalAdminIdentity({
    email,
    allowedAdminEmails: getAllowedAdminEmails(),
  });
}

function loadPedagogicalVideosMeta(): any[] {
  return readJsonArrayFile(PEDAGOGICAL_VIDEOS_META_FILE);
}

function savePedagogicalVideosMeta(items: any[]) {
  writeJsonSecureFile(PEDAGOGICAL_VIDEOS_META_FILE, items);
}

function readProgressMap(): Record<string, any> {
  try {
    if (fs.existsSync(PEDAGOGICAL_PROGRESS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PEDAGOGICAL_PROGRESS_FILE, 'utf-8'));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    }
  } catch {
    // ignore
  }
  return {};
}

// Check current user's pedagogical admin permission
app.get('/api/pedagogical-videos/permissions', async (req, res) => {
  const email = (req.query.email as string) || req.get('x-user-email') || '';
  const isAdmin = await isServerPedagogicalAdmin(email);
  return res.json({ isAdmin });
});

// Bootstrap first workspace owner on clean local environment (never overrides an existing owner)
app.post('/api/pedagogical-videos/register-owner', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email invalide.' });
    }
    if (!fs.existsSync(PEDAGOGICAL_ADMINS_FILE)) {
      writeJsonSecureFile(PEDAGOGICAL_ADMINS_FILE, {
        workspaceOwnerEmail: email,
        registeredAt: new Date().toISOString(),
      });
      return res.json({ registered: true, isAdmin: true });
    }
    const isAdmin = await isServerPedagogicalAdmin(email);
    return res.json({ registered: false, isAdmin });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erreur lors de la vérification des droits.' });
  }
});

// List shared pedagogical videos (accessible to all authenticated users)
app.get('/api/pedagogical-videos', async (req, res) => {
  try {
    const { sortPedagogicalVideos } = await getPedagogicalLogic();
    const videos = sortPedagogicalVideos(loadPedagogicalVideosMeta()).map((v: any) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      category: v.category,
      order: v.order,
      videoUrl: v.videoUrl,
      fileName: v.fileName,
      mimeType: v.mimeType,
      fileSize: v.fileSize,
      durationSeconds: v.durationSeconds,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      createdBy: v.createdBy,
    }));
    return res.json({ success: true, videos });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erreur lors du chargement des vidéos pédagogiques.' });
  }
});

// Stream a pedagogical video file (supports HTTP Range 206 seeking for mobile & desktop)
app.get('/api/pedagogical-videos/stream/:id', (req, res) => {
  const id = String(req.params.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) {
    return res.status(400).json({ error: 'Identifiant vidéo invalide.' });
  }
  const list = loadPedagogicalVideosMeta();
  const item = list.find((v: any) => v.id === id);
  if (!item || !item.storedFileName) {
    return res.status(404).json({ error: 'Vidéo pédagogique introuvable.' });
  }

  const resolved = path.resolve(PEDAGOGICAL_VIDEOS_DIR, path.basename(item.storedFileName));
  if (path.dirname(resolved) !== PEDAGOGICAL_VIDEOS_DIR || !fs.existsSync(resolved)) {
    return res.status(404).json({ error: 'Fichier vidéo introuvable sur le serveur.' });
  }

  if (item.mimeType) {
    res.setHeader('Content-Type', item.mimeType);
  }
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.sendFile(resolved);
});

// Admin-only: Upload a new pedagogical video
app.post(
  '/api/pedagogical-videos',
  express.raw({
    type: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'application/octet-stream'],
    limit: '260mb',
  }),
  async (req, res) => {
    try {
      const userEmail = req.get('x-user-email') || '';
      if (!(await isServerPedagogicalAdmin(userEmail))) {
        return res.status(403).json({
          error: 'Accès refusé : seul un administrateur peut importer des vidéos pédagogiques.',
        });
      }

      const rawMetaHeader = req.get('x-video-meta');
      if (!rawMetaHeader) {
        return res.status(400).json({ error: 'Métadonnées vidéo manquantes.' });
      }

      let meta: any;
      try {
        meta = JSON.parse(decodeURIComponent(rawMetaHeader));
      } catch {
        return res.status(400).json({ error: 'Format des métadonnées vidéo invalide.' });
      }

      const fileBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const { validatePedagogicalVideoFile, validatePedagogicalVideoMetadata, sortPedagogicalVideos } =
        await getPedagogicalLogic();

      const fileValidation = validatePedagogicalVideoFile({
        fileName: String(meta.fileName || 'lesson.mp4'),
        mimeType: String(meta.mimeType || req.get('content-type') || ''),
        fileSize: fileBuffer.length,
      });
      if (!fileValidation.valid) {
        return res.status(400).json({ error: fileValidation.error });
      }

      const metaValidation = validatePedagogicalVideoMetadata({
        title: meta.title,
        description: meta.description,
        category: meta.category,
        order: meta.order,
      });
      if (!metaValidation.valid) {
        return res.status(400).json({ error: metaValidation.error });
      }

      if (!fs.existsSync(PEDAGOGICAL_VIDEOS_DIR)) {
        fs.mkdirSync(PEDAGOGICAL_VIDEOS_DIR, { recursive: true });
      }

      const id = `pv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const storedFileName = `${id}${fileValidation.extension}`;
      const targetPath = path.resolve(PEDAGOGICAL_VIDEOS_DIR, storedFileName);
      fs.writeFileSync(targetPath, fileBuffer);

      const nowIso = new Date().toISOString();
      const durationNumeric = Number(meta.durationSeconds);
      const newEntry = {
        id,
        title: metaValidation.cleaned.title,
        description: metaValidation.cleaned.description,
        category: metaValidation.cleaned.category,
        order: metaValidation.cleaned.order,
        videoUrl: `/api/pedagogical-videos/stream/${id}`,
        storedFileName,
        fileName: String(meta.fileName || storedFileName),
        mimeType: fileValidation.normalizedMimeType,
        fileSize: fileBuffer.length,
        durationSeconds:
          Number.isFinite(durationNumeric) && durationNumeric > 0 ? Math.round(durationNumeric) : undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: userEmail || 'admin',
      };

      const existing = loadPedagogicalVideosMeta();
      const updated = sortPedagogicalVideos([...existing, newEntry]);
      savePedagogicalVideosMeta(updated);

      const { storedFileName: _hidden, ...publicVideo } = newEntry;
      return res.status(201).json({ success: true, video: publicVideo });
    } catch (err: any) {
      console.error('Error uploading pedagogical video:', err);
      return res.status(500).json({ error: err?.message || 'Erreur lors de l’import vidéo.' });
    }
  }
);

// Admin-only: Update video metadata (title, description, category, display order)
app.patch('/api/pedagogical-videos/:id', async (req, res) => {
  try {
    const userEmail = req.get('x-user-email') || '';
    if (!(await isServerPedagogicalAdmin(userEmail))) {
      return res.status(403).json({
        error: 'Accès refusé : seul un administrateur peut modifier les vidéos pédagogiques.',
      });
    }

    const id = String(req.params.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const list = loadPedagogicalVideosMeta();
    const idx = list.findIndex((v: any) => v.id === id);
    if (idx < 0) {
      return res.status(404).json({ error: 'Vidéo pédagogique introuvable.' });
    }

    const { validatePedagogicalVideoMetadata, sortPedagogicalVideos } = await getPedagogicalLogic();
    const current = list[idx];
    const metaValidation = validatePedagogicalVideoMetadata({
      title: req.body?.title ?? current.title,
      description: req.body?.description ?? current.description,
      category: req.body?.category ?? current.category,
      order: req.body?.order ?? current.order,
    });
    if (!metaValidation.valid) {
      return res.status(400).json({ error: metaValidation.error });
    }

    list[idx] = {
      ...current,
      title: metaValidation.cleaned.title,
      description: metaValidation.cleaned.description,
      category: metaValidation.cleaned.category,
      order: metaValidation.cleaned.order,
      updatedAt: new Date().toISOString(),
    };

    const sorted = sortPedagogicalVideos(list);
    savePedagogicalVideosMeta(sorted);
    const { storedFileName: _hidden, ...publicVideo } = list[idx];
    return res.json({ success: true, video: publicVideo });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erreur lors de la mise à jour.' });
  }
});

// Admin-only: Replace video binary file
app.put(
  '/api/pedagogical-videos/:id/file',
  express.raw({
    type: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'application/octet-stream'],
    limit: '260mb',
  }),
  async (req, res) => {
    try {
      const userEmail = req.get('x-user-email') || '';
      if (!(await isServerPedagogicalAdmin(userEmail))) {
        return res.status(403).json({
          error: 'Accès refusé : seul un administrateur peut remplacer le fichier vidéo.',
        });
      }

      const id = String(req.params.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
      const list = loadPedagogicalVideosMeta();
      const idx = list.findIndex((v: any) => v.id === id);
      if (idx < 0) {
        return res.status(404).json({ error: 'Vidéo pédagogique introuvable.' });
      }

      const rawMetaHeader = req.get('x-video-meta');
      let meta: any = {};
      if (rawMetaHeader) {
        try {
          meta = JSON.parse(decodeURIComponent(rawMetaHeader));
        } catch {
          meta = {};
        }
      }

      const fileBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const { validatePedagogicalVideoFile } = await getPedagogicalLogic();
      const fileValidation = validatePedagogicalVideoFile({
        fileName: String(meta.fileName || list[idx].fileName || 'lesson.mp4'),
        mimeType: String(meta.mimeType || req.get('content-type') || ''),
        fileSize: fileBuffer.length,
      });
      if (!fileValidation.valid) {
        return res.status(400).json({ error: fileValidation.error });
      }

      if (!fs.existsSync(PEDAGOGICAL_VIDEOS_DIR)) {
        fs.mkdirSync(PEDAGOGICAL_VIDEOS_DIR, { recursive: true });
      }

      const oldStored = list[idx].storedFileName;
      const newStoredFileName = `${id}_${Date.now()}${fileValidation.extension}`;
      fs.writeFileSync(path.resolve(PEDAGOGICAL_VIDEOS_DIR, newStoredFileName), fileBuffer);

      if (oldStored && oldStored !== newStoredFileName) {
        const oldPath = path.resolve(PEDAGOGICAL_VIDEOS_DIR, path.basename(oldStored));
        if (path.dirname(oldPath) === PEDAGOGICAL_VIDEOS_DIR && fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const durationNumeric = Number(meta.durationSeconds);
      const ts = Date.now();
      list[idx] = {
        ...list[idx],
        storedFileName: newStoredFileName,
        fileName: String(meta.fileName || newStoredFileName),
        mimeType: fileValidation.normalizedMimeType,
        fileSize: fileBuffer.length,
        durationSeconds:
          Number.isFinite(durationNumeric) && durationNumeric > 0
            ? Math.round(durationNumeric)
            : list[idx].durationSeconds,
        videoUrl: `/api/pedagogical-videos/stream/${id}?v=${ts}`,
        updatedAt: new Date().toISOString(),
      };

      savePedagogicalVideosMeta(list);
      const { storedFileName: _hidden, ...publicVideo } = list[idx];
      return res.json({ success: true, video: publicVideo });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Erreur lors du remplacement du fichier.' });
    }
  }
);

// Admin-only: Delete a pedagogical video
app.delete('/api/pedagogical-videos/:id', async (req, res) => {
  try {
    const userEmail = req.get('x-user-email') || '';
    if (!(await isServerPedagogicalAdmin(userEmail))) {
      return res.status(403).json({
        error: 'Accès refusé : seul un administrateur peut supprimer une vidéo pédagogique.',
      });
    }

    const id = String(req.params.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const list = loadPedagogicalVideosMeta();
    const idx = list.findIndex((v: any) => v.id === id);
    if (idx < 0) {
      return res.status(404).json({ error: 'Vidéo pédagogique introuvable.' });
    }

    const removed = list[idx];
    if (removed.storedFileName) {
      const target = path.resolve(PEDAGOGICAL_VIDEOS_DIR, path.basename(removed.storedFileName));
      if (path.dirname(target) === PEDAGOGICAL_VIDEOS_DIR && fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
    }

    const remaining = list.filter((v: any) => v.id !== id);
    savePedagogicalVideosMeta(remaining);
    return res.json({ success: true, deletedId: id });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erreur lors de la suppression.' });
  }
});

// Per-user learning progress (strictly scoped per userId, separate from shared videos)
app.get('/api/pedagogical-videos/progress', (req, res) => {
  const userId = String(req.query.userId || '').trim();
  if (!userId) {
    return res.status(400).json({ error: 'userId requis.' });
  }
  const map = readProgressMap();
  const progress = map[userId] || {
    userId,
    watchedLessonIds: [],
    completedAtByLessonId: {},
    updatedAt: new Date().toISOString(),
  };
  return res.json({ success: true, progress });
});

app.post('/api/pedagogical-videos/progress', (req, res) => {
  const { userId, lessonId, watched, lastLessonId } = req.body || {};
  const cleanUserId = String(userId || '').trim();
  if (!cleanUserId) {
    return res.status(400).json({ error: 'userId requis.' });
  }

  const map = readProgressMap();
  const existing = map[cleanUserId] || {
    userId: cleanUserId,
    watchedLessonIds: [],
    completedAtByLessonId: {},
    updatedAt: new Date().toISOString(),
  };

  const watchedSet = new Set<string>(Array.isArray(existing.watchedLessonIds) ? existing.watchedLessonIds : []);
  const completedMap: Record<string, string> = { ...(existing.completedAtByLessonId || {}) };

  if (lessonId) {
    const cleanLessonId = String(lessonId);
    if (watched === false) {
      watchedSet.delete(cleanLessonId);
      delete completedMap[cleanLessonId];
    } else {
      watchedSet.add(cleanLessonId);
      if (!completedMap[cleanLessonId]) {
        completedMap[cleanLessonId] = new Date().toISOString();
      }
    }
  }

  const updatedProgress = {
    userId: cleanUserId,
    watchedLessonIds: Array.from(watchedSet),
    completedAtByLessonId: completedMap,
    lastLessonId: lastLessonId ? String(lastLessonId) : existing.lastLessonId,
    updatedAt: new Date().toISOString(),
  };

  map[cleanUserId] = updatedProgress;
  writeJsonSecureFile(PEDAGOGICAL_PROGRESS_FILE, map);
  return res.json({ success: true, progress: updatedProgress });
});

// Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    console.error('[Server] HTTP server error:', err);
    if (err.code === 'EADDRINUSE') {
      process.exit(1);
    }
  });

  if (!isProduction) {
    let viteMiddlewares: any = null;
    const vitePromise = import('vite')
      .then(async ({ createServer: createViteServer }) => {
        const vite = await createViteServer({
          server: {
            middlewareMode: true,
            allowedHosts: true,
            hmr: false,
            ws: false,
            watch: null,
          },
          appType: 'spa',
        });
        viteMiddlewares = vite.middlewares;
        console.log('[Dev Server] Vite middleware ready on port', PORT);
        return vite;
      })
      .catch((err) => {
        console.error('[Dev Server] Vite initialization failed:', err);
        throw err;
      });

    app.use(async (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/tiktok')) {
        return next();
      }
      if (viteMiddlewares) {
        return viteMiddlewares(req, res, next);
      }
      try {
        const vite = await vitePromise;
        return vite.middlewares(req, res, next);
      } catch (err) {
        return next(err);
      }
    });

    const shutdown = async () => {
      try {
        const vite = await vitePromise.catch(() => null);
        if (vite) await vite.close();
      } finally {
        httpServer.close(() => process.exit(0));
      }
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Bind port 3000 immediately after routes & middleware are registered so health probes succeed instantly
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Resonantia running on http://0.0.0.0:${PORT}`);
  });
}

if (!IS_VERCEL) {
  startServer();
}

export { app };
export default app;
