import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  MAX_PEDAGOGICAL_VIDEO_BYTES,
  isPedagogicalAdminIdentity,
  sortPedagogicalVideos,
  validatePedagogicalVideoFile,
  validatePedagogicalVideoMetadata,
} from '../src/utils/pedagogicalVideosLogic';
import type { PedagogicalVideoLesson } from '../src/types';

describe('Étape 2 — Validation et tri de la bibliothèque vidéo pédagogique', () => {
  it('accepte un fichier MP4 valide et refuse les formats non vidéo ou fichiers vides', () => {
    const validMp4 = validatePedagogicalVideoFile({
      fileName: 'lecon_01.mp4',
      mimeType: 'video/mp4',
      fileSize: 12 * 1024 * 1024,
    });
    assert.equal(validMp4.valid, true);
    assert.equal(validMp4.normalizedMimeType, 'video/mp4');
    assert.equal(validMp4.extension, '.mp4');

    const invalidPdf = validatePedagogicalVideoFile({
      fileName: 'document.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
    });
    assert.equal(invalidPdf.valid, false);

    const emptyFile = validatePedagogicalVideoFile({
      fileName: 'empty.mp4',
      mimeType: 'video/mp4',
      fileSize: 0,
    });
    assert.equal(emptyFile.valid, false);

    const oversized = validatePedagogicalVideoFile({
      fileName: 'huge.mp4',
      mimeType: 'video/mp4',
      fileSize: MAX_PEDAGOGICAL_VIDEO_BYTES + 1,
    });
    assert.equal(oversized.valid, false);
  });

  it('valide et nettoie les métadonnées (titre, description, catégorie, ordre)', () => {
    const missingTitle = validatePedagogicalVideoMetadata({
      title: ' ',
      description: 'Test',
      category: 'Émotion & Connexion',
      order: 1,
    });
    assert.equal(missingTitle.valid, false);

    const valid = validatePedagogicalVideoMetadata({
      title: '  Comprendre la rétention émotionnelle  ',
      description: 'Observez comment la musique ouvre la scène.',
      category: 'Composition & Musique',
      order: 3,
    });
    assert.equal(valid.valid, true);
    assert.equal(valid.cleaned.title, 'Comprendre la rétention émotionnelle');
    assert.equal(valid.cleaned.category, 'Composition & Musique');
    assert.equal(valid.cleaned.order, 3);
  });

  it('trie les vidéos par ordre d’affichage croissant puis par date', () => {
    const makeLesson = (id: string, order: number, createdAt: string): PedagogicalVideoLesson => ({
      id,
      title: `Leçon ${id}`,
      description: '',
      category: 'Émotion & Connexion',
      order,
      videoUrl: `/api/pedagogical-videos/stream/${id}`,
      fileName: `${id}.mp4`,
      mimeType: 'video/mp4',
      fileSize: 1000,
      createdAt,
      updatedAt: createdAt,
      createdBy: 'admin@test.fr',
    });

    const sorted = sortPedagogicalVideos([
      makeLesson('b', 3, '2026-11-18T10:00:00Z'),
      makeLesson('a', 1, '2026-11-18T11:00:00Z'),
      makeLesson('c', 2, '2026-11-18T09:00:00Z'),
    ]);

    assert.deepEqual(
      sorted.map((v) => v.id),
      ['a', 'c', 'b']
    );
  });

  it('sépare strictement les permissions Admin vs Utilisateur standard', () => {
    const admins = ['loris.novel@gmail.com'];
    assert.equal(
      isPedagogicalAdminIdentity({ email: 'loris.novel@gmail.com', allowedAdminEmails: admins }),
      true
    );
    assert.equal(
      isPedagogicalAdminIdentity({ email: 'LORIS.NOVEL@GMAIL.COM', allowedAdminEmails: admins }),
      true
    );
    assert.equal(
      isPedagogicalAdminIdentity({ email: 'utilisateur.lambda@example.com', allowedAdminEmails: admins }),
      false
    );
    assert.equal(
      isPedagogicalAdminIdentity({ email: '', allowedAdminEmails: admins }),
      false
    );
  });

  it('garantit l’absence totale de Grok/xAI et la suppression d’autoprefixer inutilisé', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8')
    );
    assert.equal(pkg.dependencies?.autoprefixer, undefined);
    assert.equal(pkg.devDependencies?.autoprefixer, undefined);
    assert.equal(pkg.dependencies?.['@ai-sdk/xai'], undefined);
  });
});
