import type { PedagogicalVideoCategory, PedagogicalVideoLesson } from '../types';

export const PEDAGOGICAL_VIDEO_CATEGORIES: PedagogicalVideoCategory[] = [
  'Émotion & Connexion',
  'Composition & Musique',
  'Attention & Rétention',
  'Audiences & Signaux',
  'Fondations Internet',
  'Droits & Éthique',
];

export const MAX_PEDAGOGICAL_VIDEO_BYTES = 250 * 1024 * 1024; // 250 Mo

export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v'] as const;
export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
] as const;

export function getExtensionFromFileName(fileName: string): string {
  const lower = String(fileName || '').trim().toLowerCase();
  const dotIdx = lower.lastIndexOf('.');
  return dotIdx >= 0 ? lower.slice(dotIdx) : '';
}

export function inferMimeFromExtension(ext: string): string {
  switch (ext) {
    case '.mp4':
    case '.m4v':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mov':
      return 'video/quicktime';
    default:
      return '';
  }
}

export function validatePedagogicalVideoFile(input: {
  fileName: string;
  mimeType?: string;
  fileSize: number;
}): {
  valid: boolean;
  error?: string;
  normalizedMimeType: string;
  extension: string;
} {
  const ext = getExtensionFromFileName(input.fileName);
  const rawMime = String(input.mimeType || '').trim().toLowerCase();

  const hasAllowedExt = (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(ext);
  const hasAllowedMime = (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(rawMime);

  if (!hasAllowedExt && !hasAllowedMime) {
    return {
      valid: false,
      error:
        'Format vidéo non pris en charge. Importez un fichier MP4 (recommandé), MOV, WebM ou M4V.',
      normalizedMimeType: '',
      extension: ext,
    };
  }

  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0) {
    return {
      valid: false,
      error: 'Le fichier vidéo est vide ou invalide.',
      normalizedMimeType: '',
      extension: ext,
    };
  }

  if (input.fileSize > MAX_PEDAGOGICAL_VIDEO_BYTES) {
    return {
      valid: false,
      error: 'La vidéo dépasse la taille maximale autorisée de 250 Mo.',
      normalizedMimeType: '',
      extension: ext,
    };
  }

  const normalizedMimeType = hasAllowedMime
    ? rawMime === 'video/x-m4v'
      ? 'video/mp4'
      : rawMime
    : inferMimeFromExtension(ext) || 'video/mp4';

  const extension = hasAllowedExt
    ? ext
    : normalizedMimeType === 'video/webm'
    ? '.webm'
    : normalizedMimeType === 'video/quicktime'
    ? '.mov'
    : '.mp4';

  return {
    valid: true,
    normalizedMimeType,
    extension,
  };
}

export function validatePedagogicalVideoMetadata(input: {
  title?: string;
  description?: string;
  category?: string;
  order?: number | string;
}): {
  valid: boolean;
  error?: string;
  cleaned: {
    title: string;
    description: string;
    category: PedagogicalVideoCategory;
    order: number;
  };
} {
  const title = String(input.title || '').trim();
  const description = String(input.description || '').trim();
  const rawCategory = String(input.category || '').trim() as PedagogicalVideoCategory;
  const parsedOrder = Number(input.order);

  if (!title || title.length < 2) {
    return {
      valid: false,
      error: 'Le titre de la vidéo pédagogique est obligatoire (au moins 2 caractères).',
      cleaned: {
        title,
        description,
        category: 'Émotion & Connexion',
        order: 1,
      },
    };
  }

  if (title.length > 140) {
    return {
      valid: false,
      error: 'Le titre ne doit pas dépasser 140 caractères.',
      cleaned: {
        title: title.slice(0, 140),
        description,
        category: 'Émotion & Connexion',
        order: 1,
      },
    };
  }

  if (description.length > 1200) {
    return {
      valid: false,
      error: 'La description ne doit pas dépasser 1200 caractères.',
      cleaned: {
        title,
        description: description.slice(0, 1200),
        category: 'Émotion & Connexion',
        order: 1,
      },
    };
  }

  const category: PedagogicalVideoCategory = PEDAGOGICAL_VIDEO_CATEGORIES.includes(rawCategory)
    ? rawCategory
    : 'Émotion & Connexion';

  const order = Number.isFinite(parsedOrder) && parsedOrder >= 1 ? Math.round(parsedOrder) : 1;

  return {
    valid: true,
    cleaned: {
      title,
      description,
      category,
      order,
    },
  };
}

export function sortPedagogicalVideos(
  videos: PedagogicalVideoLesson[]
): PedagogicalVideoLesson[] {
  return [...videos].sort((a, b) => {
    const orderDiff = (a.order || 9999) - (b.order || 9999);
    if (orderDiff !== 0) return orderDiff;
    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  });
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 o';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function formatVideoDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return 'Format court';
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`;
}

export function isPedagogicalAdminIdentity(params: {
  email?: string | null;
  allowedAdminEmails: string[];
}): boolean {
  const normalized = String(params.email || '').trim().toLowerCase();
  if (!normalized) return false;
  return params.allowedAdminEmails.some((e) => e.trim().toLowerCase() === normalized);
}
