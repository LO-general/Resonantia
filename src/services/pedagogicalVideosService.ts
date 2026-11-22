import {
  PedagogicalUserProgress,
  PedagogicalVideoCategory,
  PedagogicalVideoLesson,
  UserProfile,
} from '../types';
import { isUserAdmin } from './firebase';

function buildAdminHeaders(user: UserProfile | null | undefined): Record<string, string> {
  const headers: Record<string, string> = {};
  if (user?.email) {
    headers['x-user-email'] = user.email;
  }
  if (user?.uid) {
    headers['x-user-uid'] = user.uid;
  }
  return headers;
}

export async function resolvePedagogicalAdminStatus(
  user: UserProfile | null | undefined
): Promise<boolean> {
  if (!user || !user.email) return false;
  try {
    // If client-side workspace marks the very first local account as admin, register once on clean server
    if (isUserAdmin(user)) {
      await fetch('/api/pedagogical-videos/register-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      }).catch(() => null);
    }

    const res = await fetch(
      `/api/pedagogical-videos/permissions?email=${encodeURIComponent(user.email)}`,
      { headers: buildAdminHeaders(user) }
    );
    if (res.ok) {
      const data = await res.json();
      return Boolean(data.isAdmin);
    }
  } catch {
    // fallback below
  }
  return isUserAdmin(user);
}

export async function fetchPedagogicalVideos(): Promise<PedagogicalVideoLesson[]> {
  const res = await fetch('/api/pedagogical-videos');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Impossible de charger les vidéos pédagogiques.');
  }
  const data = await res.json();
  return Array.isArray(data.videos) ? data.videos : [];
}

export function uploadPedagogicalVideo(params: {
  user: UserProfile;
  file: File;
  title: string;
  description: string;
  category: PedagogicalVideoCategory;
  order: number;
  durationSeconds?: number;
  onProgress?: (percent: number) => void;
}): Promise<PedagogicalVideoLesson> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/pedagogical-videos', true);
    xhr.setRequestHeader('Content-Type', params.file.type || 'video/mp4');
    if (params.user.email) xhr.setRequestHeader('x-user-email', params.user.email);
    if (params.user.uid) xhr.setRequestHeader('x-user-uid', params.user.uid);
    xhr.setRequestHeader(
      'x-video-meta',
      encodeURIComponent(
        JSON.stringify({
          title: params.title,
          description: params.description,
          category: params.category,
          order: params.order,
          fileName: params.file.name,
          mimeType: params.file.type || 'video/mp4',
          durationSeconds: params.durationSeconds,
        })
      )
    );

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && params.onProgress) {
        const pct = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
        params.onProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && data.video) {
          resolve(data.video as PedagogicalVideoLesson);
        } else {
          reject(new Error(data.error || `Échec de l’import vidéo (HTTP ${xhr.status}).`));
        }
      } catch {
        reject(new Error(`Réponse serveur invalide (HTTP ${xhr.status}).`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Erreur réseau lors de l’envoi de la vidéo.'));
    };

    xhr.send(params.file);
  });
}

export async function updatePedagogicalVideoMetadata(params: {
  user: UserProfile;
  id: string;
  title: string;
  description: string;
  category: PedagogicalVideoCategory;
  order: number;
}): Promise<PedagogicalVideoLesson> {
  const res = await fetch(`/api/pedagogical-videos/${encodeURIComponent(params.id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...buildAdminHeaders(params.user),
    },
    body: JSON.stringify({
      title: params.title,
      description: params.description,
      category: params.category,
      order: params.order,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.video) {
    throw new Error(data.error || 'Impossible de modifier la vidéo.');
  }
  return data.video as PedagogicalVideoLesson;
}

export function replacePedagogicalVideoFile(params: {
  user: UserProfile;
  id: string;
  file: File;
  durationSeconds?: number;
  onProgress?: (percent: number) => void;
}): Promise<PedagogicalVideoLesson> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `/api/pedagogical-videos/${encodeURIComponent(params.id)}/file`, true);
    xhr.setRequestHeader('Content-Type', params.file.type || 'video/mp4');
    if (params.user.email) xhr.setRequestHeader('x-user-email', params.user.email);
    if (params.user.uid) xhr.setRequestHeader('x-user-uid', params.user.uid);
    xhr.setRequestHeader(
      'x-video-meta',
      encodeURIComponent(
        JSON.stringify({
          fileName: params.file.name,
          mimeType: params.file.type || 'video/mp4',
          durationSeconds: params.durationSeconds,
        })
      )
    );

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && params.onProgress) {
        const pct = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
        params.onProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && data.video) {
          resolve(data.video as PedagogicalVideoLesson);
        } else {
          reject(new Error(data.error || `Échec du remplacement vidéo (HTTP ${xhr.status}).`));
        }
      } catch {
        reject(new Error(`Réponse serveur invalide (HTTP ${xhr.status}).`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Erreur réseau lors du remplacement de la vidéo.'));
    };

    xhr.send(params.file);
  });
}

export async function deletePedagogicalVideo(params: {
  user: UserProfile;
  id: string;
}): Promise<void> {
  const res = await fetch(`/api/pedagogical-videos/${encodeURIComponent(params.id)}`, {
    method: 'DELETE',
    headers: buildAdminHeaders(params.user),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Impossible de supprimer la vidéo.');
  }
}

const PROGRESS_KEY_PREFIX = 'pedagogical_video_progress_v1_';

export async function fetchPedagogicalUserProgress(
  userId: string
): Promise<PedagogicalUserProgress> {
  const localFallback = (): PedagogicalUserProgress => {
    try {
      const raw = localStorage.getItem(`${PROGRESS_KEY_PREFIX}${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.watchedLessonIds)) return parsed;
      }
    } catch {
      // ignore
    }
    return {
      userId,
      watchedLessonIds: [],
      completedAtByLessonId: {},
      updatedAt: new Date().toISOString(),
    };
  };

  try {
    const res = await fetch(
      `/api/pedagogical-videos/progress?userId=${encodeURIComponent(userId)}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.progress) {
        try {
          localStorage.setItem(`${PROGRESS_KEY_PREFIX}${userId}`, JSON.stringify(data.progress));
        } catch {
          // ignore
        }
        return data.progress as PedagogicalUserProgress;
      }
    }
  } catch {
    // fallback
  }
  return localFallback();
}

export async function updatePedagogicalUserProgress(params: {
  userId: string;
  lessonId?: string;
  watched?: boolean;
  lastLessonId?: string;
}): Promise<PedagogicalUserProgress> {
  try {
    const res = await fetch('/api/pedagogical-videos/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.progress) {
        try {
          localStorage.setItem(
            `${PROGRESS_KEY_PREFIX}${params.userId}`,
            JSON.stringify(data.progress)
          );
        } catch {
          // ignore
        }
        return data.progress as PedagogicalUserProgress;
      }
    }
  } catch {
    // fallback below
  }

  // Offline local fallback
  let current: PedagogicalUserProgress;
  try {
    const raw = localStorage.getItem(`${PROGRESS_KEY_PREFIX}${params.userId}`);
    current = raw
      ? JSON.parse(raw)
      : {
          userId: params.userId,
          watchedLessonIds: [],
          completedAtByLessonId: {},
          updatedAt: new Date().toISOString(),
        };
  } catch {
    current = {
      userId: params.userId,
      watchedLessonIds: [],
      completedAtByLessonId: {},
      updatedAt: new Date().toISOString(),
    };
  }

  const watchedSet = new Set(current.watchedLessonIds || []);
  const completedMap = { ...(current.completedAtByLessonId || {}) };
  if (params.lessonId) {
    if (params.watched === false) {
      watchedSet.delete(params.lessonId);
      delete completedMap[params.lessonId];
    } else {
      watchedSet.add(params.lessonId);
      if (!completedMap[params.lessonId]) {
        completedMap[params.lessonId] = new Date().toISOString();
      }
    }
  }
  const next: PedagogicalUserProgress = {
    userId: params.userId,
    watchedLessonIds: Array.from(watchedSet),
    completedAtByLessonId: completedMap,
    lastLessonId: params.lastLessonId || current.lastLessonId,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(`${PROGRESS_KEY_PREFIX}${params.userId}`, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
