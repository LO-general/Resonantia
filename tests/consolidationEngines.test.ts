import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  safeDivide,
  safePercent,
  computeVideoRates,
  computeCentralAccountAnalytics,
  detectViewPlateaus,
  buildSnapshotAndCorrectionUpdate,
  computeFollowerGrowthAnalysis,
} from '../src/utils/centralDataEngine';
import {
  compareCreationVsRepost,
  validateRepostRights,
} from '../src/utils/repostEngine';
import {
  buildTemporalRecords,
  buildFilteredWeeklySchedule,
} from '../src/utils/temporalMetricsEngine';
import {
  DEFAULT_INTERNAL_CATALOG,
  recommendMusicForBrief,
} from '../src/utils/musicAdvisorEngine';
import { findSimilarRefutedOrTestedExperiments } from '../src/utils/learningMemoryEngine';
import { computeStrategicDiagnostic } from '../src/utils/strategeEngine';
import {
  ExperimentLog,
  FollowerHistoryEntry,
  TikTokAccountData,
  TikTokMetricSnapshot,
  TikTokOfficialVideo,
  VideoEditorialMetadata,
} from '../src/types';

function makeVideo(overrides: Partial<TikTokOfficialVideo> & { id: string }): TikTokOfficialVideo {
  return {
    accountId: overrides.accountId || 'acct_test',
    createTime: overrides.createTime || Math.floor(Date.now() / 1000) - 86400 * 5,
    title: overrides.title || `Video ${overrides.id}`,
    videoDescription: overrides.videoDescription || '',
    duration: overrides.duration ?? 45,
    viewCount: overrides.viewCount ?? 1000,
    likeCount: overrides.likeCount ?? 80,
    commentCount: overrides.commentCount ?? 5,
    shareCount: overrides.shareCount ?? 10,
    favoriteCount: overrides.favoriteCount !== undefined ? overrides.favoriteCount : null,
    engagementRate: overrides.engagementRate ?? 9.5,
    source: overrides.source || 'official_api',
    lastSyncedAt: overrides.lastSyncedAt || new Date().toISOString(),
    ...overrides,
  };
}

const TEST_ACCOUNT: TikTokAccountData = {
  openId: 'acct_test',
  username: '@compte_test',
  displayName: 'Compte Test',
  followerCount: 1250,
  followingCount: 100,
  likesCount: 9500,
  videoCount: 12,
  connectedAt: '2026-10-01T10:00:00.000Z',
  scopesGranted: ['user.info.basic', 'user.info.stats', 'video.list'],
  source: 'official_api',
};

describe('Consolidation Engines — Couche 1 & Couche 2 Déterministes', () => {
  it('1. safeDivide et safePercent gèrent zéro, NaN et Infinity sans crash', () => {
    assert.equal(safeDivide(10, 0), null);
    assert.equal(safeDivide(10, -5), null);
    assert.equal(safeDivide(Number.NaN, 10), null);
    assert.equal(safeDivide(10, Number.POSITIVE_INFINITY), null);
    assert.equal(safeDivide(25, 100), 0.25);

    assert.equal(safePercent(50, 0), null);
    assert.equal(safePercent(50, 1000, 2), 5);
  });

  it('2. computeVideoRates distingue strictement favoris manquants (null) vs 0 vérifié', () => {
    const vMissingFav = makeVideo({
      id: 'v_missing_fav',
      viewCount: 1000,
      likeCount: 50,
      commentCount: 10,
      shareCount: 5,
      favoriteCount: null,
    });
    const ratesMissing = computeVideoRates(vMissingFav);
    assert.equal(ratesMissing.favoriteRate, null);
    assert.equal(ratesMissing.engagementWithFavoritesRate, null);
    assert.equal(ratesMissing.engagementRate, 6.5);

    const vZeroFav = makeVideo({
      id: 'v_zero_fav',
      viewCount: 1000,
      likeCount: 50,
      commentCount: 10,
      shareCount: 5,
      favoriteCount: 0,
    });
    const ratesZero = computeVideoRates(vZeroFav);
    assert.equal(ratesZero.favoriteRate, 0);
    assert.equal(ratesZero.engagementWithFavoritesRate, 6.5);
  });

  it('3. computeCentralAccountAnalytics distingue engagement global consolidé vs moyenne/médiane par vidéo', () => {
    // Video A: 100 views, 20 interactions -> 20%
    // Video B: 100 views, 10 interactions -> 10%
    // Video C: 10000 views, 200 interactions -> 2%
    // Global = (20+10+200)/(100+100+10000) = 230/10200 = 2.25%
    // Per-video mean = (20 + 10 + 2)/3 = 10.67%
    // Per-video median = 10%
    const videos = [
      makeVideo({ id: 'a', viewCount: 100, likeCount: 20, commentCount: 0, shareCount: 0 }),
      makeVideo({ id: 'b', viewCount: 100, likeCount: 10, commentCount: 0, shareCount: 0 }),
      makeVideo({ id: 'c', viewCount: 10000, likeCount: 200, commentCount: 0, shareCount: 0 }),
    ];

    const res = computeCentralAccountAnalytics({ videos, account: TEST_ACCOUNT });
    assert.equal(res.globalEngagementRate, 2.25);
    assert.equal(res.perVideoMeanEngagementRate, 10.67);
    assert.equal(res.perVideoMedianEngagementRate, 10);
  });

  it('4. detectViewPlateaus isole les pics viraux (IQR/MAD) et détecte progression durable vs pic isolé', () => {
    const baseTime = 1760000000;
    // Progression durable: first 4 ~400 views, last 4 ~1000 views
    const progressionVideos = [
      makeVideo({ id: 'p1', createTime: baseTime + 1000, viewCount: 380 }),
      makeVideo({ id: 'p2', createTime: baseTime + 2000, viewCount: 410 }),
      makeVideo({ id: 'p3', createTime: baseTime + 3000, viewCount: 400 }),
      makeVideo({ id: 'p4', createTime: baseTime + 4000, viewCount: 420 }),
      makeVideo({ id: 'p5', createTime: baseTime + 5000, viewCount: 950 }),
      makeVideo({ id: 'p6', createTime: baseTime + 6000, viewCount: 1020 }),
      makeVideo({ id: 'p7', createTime: baseTime + 7000, viewCount: 980 }),
      makeVideo({ id: 'p8', createTime: baseTime + 8000, viewCount: 1100 }),
    ];
    const progRes = detectViewPlateaus(progressionVideos);
    assert.equal(progRes.hasSufficientData, true);
    assert.equal(progRes.trendStatus, 'progression_durable');

    // Pic isolé: stable around ~400 views + 1 spike at 25000 in second half
    const spikeVideos = [
      makeVideo({ id: 's1', createTime: baseTime + 1000, viewCount: 400 }),
      makeVideo({ id: 's2', createTime: baseTime + 2000, viewCount: 410 }),
      makeVideo({ id: 's3', createTime: baseTime + 3000, viewCount: 390 }),
      makeVideo({ id: 's4', createTime: baseTime + 4000, viewCount: 420 }),
      makeVideo({ id: 's5', createTime: baseTime + 5000, viewCount: 415 }),
      makeVideo({ id: 's6', createTime: baseTime + 6000, viewCount: 405 }),
      makeVideo({ id: 's7', createTime: baseTime + 7000, viewCount: 430 }),
      makeVideo({ id: 's8', createTime: baseTime + 8000, viewCount: 25000 }),
    ];
    const spikeRes = detectViewPlateaus(spikeVideos);
    assert.equal(spikeRes.trendStatus, 'pic_isole');
    assert.ok(spikeRes.outlierVideos.some((o) => o.id === 's8'));
  });

  it('5. buildSnapshotAndCorrectionUpdate enregistre les deltas et journalise toute correction à la baisse sans écraser', () => {
    const existing: TikTokMetricSnapshot[] = [
      {
        id: 'snap_1',
        accountId: 'acct_test',
        videoId: 'vid_corr',
        fetchDate: '2026-11-10T10:00:00.000Z',
        views: 1500,
        likes: 120,
        comments: 10,
        shares: 4,
        engagementRate: 8.93,
        source: 'official_api',
      },
    ];
    const latest = [
      makeVideo({
        id: 'vid_corr',
        viewCount: 1420,
        likeCount: 118,
        commentCount: 10,
        shareCount: 4,
      }),
    ];

    const { newSnapshots, corrections } = buildSnapshotAndCorrectionUpdate(
      existing,
      latest,
      '2026-11-11T10:00:00.000Z'
    );
    assert.equal(newSnapshots.length, 1);
    assert.equal(newSnapshots[0].deltaViewsSincePrevious, -80);
    assert.equal(newSnapshots[0].counterCorrected, true);
    assert.equal(corrections.length, 2); // views & likes downward corrections logged
    assert.equal(corrections[0].metric, 'views');
    assert.equal(corrections[0].previousValue, 1500);
    assert.equal(corrections[0].newValue, 1420);
  });

  it('6. compareCreationVsRepost réalise une comparaison neutre Création vs Repost', () => {
    const videos = [
      makeVideo({ id: 'c1', title: 'Création originale 1', viewCount: 800, likeCount: 80, commentCount: 8, shareCount: 8 }),
      makeVideo({ id: 'r1', title: 'Extrait #repost', viewCount: 1200, likeCount: 60, commentCount: 6, shareCount: 6 }),
    ];
    const editorialMap: Record<string, VideoEditorialMetadata> = {
      c1: { videoId: 'c1', contentNature: 'creation', manualAttributedFollowers: 12, updatedAt: '2026-11-10' },
      r1: { videoId: 'r1', contentNature: 'repost', manualAttributedFollowers: 4, updatedAt: '2026-11-10' },
    };

    const cmp = compareCreationVsRepost(videos, editorialMap);
    assert.equal(cmp.creationCount, 1);
    assert.equal(cmp.repostCount, 1);
    assert.equal(cmp.creationMedianViews, 800);
    assert.equal(cmp.repostMedianViews, 1200);
    assert.equal(cmp.creationTotalAttributedFollowers, 12);
    assert.equal(cmp.repostTotalAttributedFollowers, 4);
    assert.ok(cmp.neutralObservation.includes('Observation neutre'));
  });

  it('7. validateRepostRights bloque les ré-uploads sans autorisation écrite et valide les outils natifs', () => {
    const pending = validateRepostRights({
      repostMode: 'authorized_reupload',
      authorizationStatus: 'en_attente',
      creatorHandle: '@auteur',
      tiktokUrl: 'https://www.tiktok.com/@auteur/video/123',
    });
    assert.equal(pending.isReadyForPublication, false);
    assert.ok(pending.blockingReasons.length >= 1);

    const validReupload = validateRepostRights({
      repostMode: 'authorized_reupload',
      authorizationStatus: 'obtenue',
      authorizationDate: '2026-11-12',
      usageTerms: 'Crédit explicite @auteur en légende sans modification commerciale',
      authorizationProof: 'Email archivé du 12/11/2026',
      creatorHandle: '@auteur',
      tiktokUrl: 'https://www.tiktok.com/@auteur/video/123',
      musicRightsVerified: true,
    });
    assert.equal(validReupload.isReadyForPublication, true);
    assert.equal(validReupload.blockingReasons.length, 0);

    const native = validateRepostRights({
      repostMode: 'native_repost',
      tiktokUrl: 'https://www.tiktok.com/@auteur/video/123',
    });
    assert.equal(native.isReadyForPublication, true);
  });

  it('8. buildFilteredWeeklySchedule n’affiche jamais de jours sans créneau ni contenu (aucun remplissage)', () => {
    // 2 videos on the exact same weekday & hour (Monday 18:00 UTC/local) -> only Monday qualifies
    const d1 = new Date('2026-11-02T18:10:00'); // Monday
    const d2 = new Date('2026-11-09T18:20:00'); // Monday
    const videos = [
      makeVideo({ id: 'w1', createTime: Math.floor(d1.getTime() / 1000), viewCount: 900 }),
      makeVideo({ id: 'w2', createTime: Math.floor(d2.getTime() / 1000), viewCount: 1100 }),
    ];
    const records = buildTemporalRecords(videos, [], []);
    const schedule = buildFilteredWeeklySchedule(records, [], 0);
    // Days without identified slots, scheduled items, or published videos on that week are omitted
    assert.equal(schedule.qualifiedDays.length + schedule.omittedDaysCount, 7);
    assert.ok(schedule.omittedDaysCount >= 6);
  });

  it('9. computeFollowerGrowthAnalysis divulgue explicitement les limites API et calcule les deltas réels', () => {
    const history: FollowerHistoryEntry[] = [
      {
        id: 'f1',
        accountId: 'acct_test',
        recordedAt: '2026-11-01T10:00:00.000Z',
        followerCount: 1200,
        source: 'tiktok_api',
        deltaSincePrevious: null,
      },
      {
        id: 'f2',
        accountId: 'acct_test',
        recordedAt: '2026-11-10T10:00:00.000Z',
        followerCount: 1250,
        source: 'tiktok_api',
        deltaSincePrevious: 50,
      },
    ];
    const v = makeVideo({ id: 'fv1', title: 'Vidéo convertissante', viewCount: 2000 });
    const ed: Record<string, VideoEditorialMetadata> = {
      fv1: { videoId: 'fv1', manualAttributedFollowers: 18, updatedAt: '2026-11-10' },
    };

    const fg = computeFollowerGrowthAnalysis(TEST_ACCOUNT, [v], history, ed);
    assert.equal(fg.apiAttributionAvailable, false);
    assert.ok(fg.apiAttributionNote.includes('API'));
    assert.equal(fg.netFollowerChangeObserved, 50);
    assert.equal(fg.manuallyAttributedVideos.length, 1);
    assert.equal(fg.manuallyAttributedVideos[0].attributedFollowers, 18);
  });

  it('10. recommendMusicForBrief vérifie la compatibilité Business (CML) et Personnel sans promettre la viralité', () => {
    const recs = recommendMusicForBrief(
      {
        subject: 'Course en montagne',
        category: 'Sport',
        desiredEmotion: 'dépassement',
        ambiance: 'Épique',
        desiredRhythm: 'rapide',
        sequenceType: 'Montage dynamique',
        accountType: 'business',
        territory: 'France',
      },
      DEFAULT_INTERNAL_CATALOG,
      []
    );
    assert.ok(recs.length > 0);
    assert.ok(recs[0].availabilityNotice.includes('Business'));
    assert.ok(recs[0].justification.includes('sans jamais garantir la portée'));
  });

  it('11. findSimilarRefutedOrTestedExperiments & computeStrategicDiagnostic s’exécutent 100% hors-ligne sans GEMINI_API_KEY', () => {
    const logs: ExperimentLog[] = [
      {
        id: 'e1',
        title: 'Intro lente de 5 secondes sans texte',
        hypothesis: 'Une intro lente crée du suspense',
        modifiedCharacteristic: 'Accroche (2 premières secondes)',
        concernedVideoIds: [],
        concernedVideoTitles: [],
        objective: 'Vues',
        measuredResults: 'Chute médiane',
        baselineComparison: 'Médiane 400 vs 800',
        conclusion: 'Défavorable',
        status: 'cloturée',
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-02T00:00:00.000Z',
      },
    ];

    const match = findSimilarRefutedOrTestedExperiments(
      'Tester une intro lente avec suspense de 5 secondes',
      logs
    );
    assert.equal(match.refutedMatches.length, 1);

    const prevKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const diag = computeStrategicDiagnostic(
        [makeVideo({ id: 'd1', viewCount: 600 }), makeVideo({ id: 'd2', viewCount: 1400 })],
        TEST_ACCOUNT
      );
      assert.equal(diag.accountHandle, '@compte_test');
      assert.equal(diag.sampleSize, 2);
      assert.ok((diag.actionRecommendations?.length ?? 0) > 0);
    } finally {
      if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
    }
  });
});
