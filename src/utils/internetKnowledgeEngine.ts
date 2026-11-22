import { InternetPrincipleCard } from '../types';

export const INTERNET_PRINCIPLES: InternetPrincipleCard[] = [
  {
    id: 'principe-01-visibilite',
    number: '01',
    category: 'Distribution',
    title: 'Comprendre la visibilité',
    subtitle: 'La distribution n’est pas magique : elle est comportementale',
    shortExplanation:
      'Les réseaux sociaux ne choisissent pas arbitrairement de propulser une vidéo. Ils exposent chaque nouveau contenu à un échantillon initial restreint de spectateurs et scrutent leurs réactions immédiates pour décider d’élargir ou de freiner sa diffusion.',
    concreteExample:
      'Deux vidéos portant sur le même sujet peuvent connaître un destin diamétralement opposé : la première retient 75% de son échantillon test pendant 5 secondes et se voit distribuée à des milliers de personnes ; la seconde subit un swipe rapide en moins d’une seconde et son élan s’arrête là.',
    practicalImpact:
      'Votre objectif n’est pas de séduire un robot ou de déjouer un algorithme, mais de comprendre ce qui capte, respecte et honore l’attention d’un être humain dès les premières fractions de seconde.',
    deepDive: {
      documentedFacts: [
        'Le système fonctionne en paliers d’exposition successifs (cohortes de 100, puis 500, puis 2 000 spectateurs, etc.).',
        'Le taux de rétention sur les 3 à 5 premières secondes constitue le premier filtre éliminatoire de diffusion.',
        'Les interactions implicites (temps passé, vidéos re-visionnées) pèsent plus lourd que les simples likes de surface.',
      ],
      practicalObservations: [
        'Une vidéo qui démarre lentement stagne souvent sous les 300 vues, quelle que soit la qualité extraordinaire de sa fin.',
        'Les vidéos dont le sujet est immédiatement clair captent une audience plus qualifiée dès le premier palier.',
      ],
      strategicHypotheses: [
        'L’algorithme cherche à maximiser le temps total passé sur sa plateforme pour y insérer des opportunités d’engagement.',
        'La vitesse d’accumulation des premières interactions (vélocité) signale une forte résonance auprès d’un public cible.',
      ],
      creatorChecklist: [
        'Le sujet de ma vidéo est-il identifiable en moins de 2 secondes ?',
        'L’amorce visuelle ou sonore crée-t-elle une raison immédiate d’arrêter le défilement ?',
        'Ai-je éliminé toute introduction superflue ou silence inutile au début ?',
      ],
    },
  },
  {
    id: 'principe-02-attention',
    number: '02',
    category: 'Psychologie',
    title: 'Comprendre l’attention',
    subtitle: 'L’amorce interrompt le flux, la suite doit honorer la promesse',
    shortExplanation:
      'Sur mobile, le geste de balayage (swipe) est un réflexe moteur quasi inconscient. L’attention initiale est extrêmement volatile : capter les deux premières secondes est indispensable, mais si la suite de la vidéo déçoit, l’abandon est immédiat.',
    concreteExample:
      'Un titre à sensation promettant une révélation incroyable qui met 25 secondes de bavardage à arriver provoque un effondrement de la courbe de rétention. À l’inverse, une immersion musicale directe sans préambule retient l’auditeur instantanément.',
    practicalImpact:
      'Ne concevez jamais votre accroche comme un piège isolé. Chaque segment de votre vidéo doit justifier le suivant et tenir scrupuleusement la promesse faite au départ.',
    deepDive: {
      documentedFacts: [
        'La décision de rester ou de zapper se prend en moyenne entre 800 millisecondes et 1,5 seconde.',
        'L’association synchronisée du texte à l’écran, de la voix/musique et de l’action visuelle réduit la charge cognitive du spectateur.',
      ],
      practicalObservations: [
        'Les spectateurs pardonnent une qualité de caméra moyenne, mais fuient immédiatement face à un son inaudible ou un démarrage flou.',
        'Les ruptures de rythme ou de tonalité inexpliquées en milieu de vidéo créent des pics de fuite nets.',
      ],
      strategicHypotheses: [
        'L’attention humaine fonctionne par micro-engagements : chaque seconde validée donne au spectateur la curiosité d’accorder la suivante.',
        'Le sentiment d’authenticité brute retient plus durablement qu’un montage artificiellement frénétique.',
      ],
      creatorChecklist: [
        'Y a-t-il un élément visuel fort dès la première image ?',
        'Le texte affiché apporte-t-il une curiosité ou une émotion réelle sans être mensonger ?',
        'La promesse faite au début est-elle résolue avec satisfaction avant la fin ?',
      ],
    },
  },
  {
    id: 'principe-03-retention',
    number: '03',
    category: 'Distribution',
    title: 'Comprendre la rétention',
    subtitle: 'Regarder 3 secondes vs regarder jusqu’au bout : le vrai moteur',
    shortExplanation:
      'La rétention mesure la capacité d’une vidéo à maintenir le spectateur captivé sur toute sa durée. C’est la métrique reine : un contenu long qui retient son audience crée une valeur d’attention inestimable pour les plateformes.',
    concreteExample:
      'Sur votre compte @good.story__5, les montages de plus de 60 secondes sur Cameron atteignent des scores de vues exceptionnels parce que l’auditeur reste immergé dans la mélodie jusqu’à la dernière note, générant un temps de visionnage cumulé colossal.',
    practicalImpact:
      'Analysez votre courbe de rétention pour repérer vos « faux dénouements » et vos temps morts. Raccourcissez ce qui fatigue l’esprit, et donnez de l’ampleur à ce qui crée une émotion sincère.',
    deepDive: {
      documentedFacts: [
        'Le temps moyen de visionnage (Watch Time) et le taux de complétion (% qui atteignent la fin) sont les signaux les plus corrélés aux hauts volumes de diffusion.',
        'Une vidéo de 75 secondes regardée à 60% (45 secondes de temps cumulé) génère plus de signal algorithmique qu’une vidéo de 8 secondes regardée à 100%.',
      ],
      practicalObservations: [
        'Les chutes de rétention les plus brutales surviennent souvent quand le créateur annonce la fin (« Voilà, pour résumer... »).',
        'Une progression narrative ou musicale ascendante empêche le décrochage.',
      ],
      strategicHypotheses: [
        'Le spectateur qui termine une vidéo est statistiquement beaucoup plus susceptible de visiter le profil ou de s’abonner.',
        'Les vidéos qui se rejouent naturellement en boucle bénéficient d’un multiplicateur de rétention supérieur à 100%.',
      ],
      creatorChecklist: [
        'Ai-je coupé tous les mots parasites et les secondes statiques au montage ?',
        'La fin de ma vidéo est-elle nette, sans baisse d’énergie prématurée ?',
        'La durée totale est-elle proportionnelle à la valeur émotionnelle ou informative apportée ?',
      ],
    },
  },
  {
    id: 'principe-04-audiences',
    number: '04',
    category: 'Psychologie',
    title: 'Comprendre les audiences',
    subtitle: 'Chaque vidéo s’adresse à une tribu humaine spécifique',
    shortExplanation:
      'Internet n’est pas une masse unique d’utilisateurs interchangeables, mais une constellation de communautés régies par des centres d’intérêt, des codes culturels et des émotions partagées. Une vidéo n’a pas vocation à plaire à tout le monde.',
    concreteExample:
      'Une vidéo sur les coulisses de la préparation d’un ultra-trail résonnera puissamment auprès des passionnés d’effort et d’endurance, mais laissera indifférent un public purement amateur de télé-crochet musical, à moins de créer un pont universel autour du dépassement de soi.',
    practicalImpact:
      'Ne cherchez pas à plaire au plus grand nombre au risque de devenir fade. Identifiez précisément à qui vous parlez et adressez-vous à cette communauté avec ses repères et son vocabulaire.',
    deepDive: {
      documentedFacts: [
        'Les algorithmes cartographient les utilisateurs par graphes d’intérêts dynamiques (ce qu’ils regardent, commentent et sauvegardent).',
        'Une vidéo diffusée à la mauvaise cohorte d’utilisateurs subit un rejet qui n’a rien à voir avec sa qualité intrinsèque.',
      ],
      practicalObservations: [
        'Les vidéos qui divisent ou qui s’adressent à une niche précise créent un taux de commentaires et de fidélisation bien supérieur aux vidéos tièdes.',
        'Les abonnés fidèles proviennent de vidéos qui ont apporté une valeur très spécifique à leur passion.',
      ],
      strategicHypotheses: [
        'Plus votre sujet est ciblé, plus le taux d’interaction de base est élevé, facilitant le passage vers des cercles plus larges.',
        'Les créateurs hybrides réussissent en incarnant une personnalité attachante qui fédère au-delà du seul sujet traité.',
      ],
      creatorChecklist: [
        'Qui est la personne exacte que j’imagine en train de regarder cette vidéo ?',
        'Quels codes, émotions ou souvenirs partagés cette vidéo réactive-t-elle chez elle ?',
        'Mon propos est-il assez incarné pour susciter une réaction d’appartenance ?',
      ],
    },
  },
  {
    id: 'principe-05-tendances',
    number: '05',
    category: 'Stratégie',
    title: 'Comprendre les tendances',
    subtitle: 'Observer l’effervescence plutôt que publier dans le vide',
    shortExplanation:
      'Une tendance naît, atteint un pic d’attention collective, puis s’épuise rapidement par saturation. Réussir avec les tendances exige d’observer activement le flux d’actualité pour s’inscrire dans une vague montante plutôt que d’arriver au moment de la lassitude.',
    concreteExample:
      'Publier un extrait musical fort au lendemain immédiat d’un prime de la Star Academy capte un volume de recherche et de curiosité maximal. Publier le même extrait trois semaines plus tard sans contexte supplémentaire rencontrera un écho beaucoup plus faible.',
    practicalImpact:
      'Développez une posture d’observateur attentif d’Internet. Ne publiez pas uniquement selon votre envie mécanique, synchronisez vos efforts avec les sujets qui occupent déjà l’esprit des spectateurs.',
    deepDive: {
      documentedFacts: [
        'Les volumes de requêtes de recherche et de visionnage sur un sujet suivent une courbe en cloche asymétrique très marquée.',
        'Les premiers contenus pertinents sur un sujet d’actualité s’imposent comme références pour les spectateurs qui cherchent à s’informer ou revivre l’instant.',
      ],
      practicalObservations: [
        'Copier une tendance à l’identique de dizaines d’autres créateurs crée de la fatigue visuelle chez l’audience.',
        'S’approprier une tendance en y apportant sa sensibilité personnelle produit des résultats infiniment plus durables.',
      ],
      strategicHypotheses: [
        'Les plateformes favorisent les contenus qui alimentent une conversation déjà bouillonnante dans l’espace public.',
        'La valeur d’un sujet se prolonge après l’événement s’il est abordé sous un angle d’analyse ou de leçon universelle.',
      ],
      creatorChecklist: [
        'Ce sujet suscite-t-il une curiosité active en ce moment même ?',
        'Quel angle inédit ou quelle sensibilité personnelle puis-je apporter à cette actualité ?',
        'Mon contenu apporte-t-il une valeur qui restera intéressante une fois le buzz retombé ?',
      ],
    },
  },
  {
    id: 'principe-06-coherence',
    number: '06',
    category: 'Stratégie',
    title: 'Comprendre la cohérence d’un compte',
    subtitle: 'Positionnement et identité éditoriale sans mythe de sanction',
    shortExplanation:
      'Il ne faut pas croire aux rumeurs selon lesquelles aborder deux passions différentes déclencherait une « pénalité magique » de l’algorithme. Le véritable enjeu est humain : vos abonnés ont besoin de comprendre qui vous êtes et ce qu’ils retrouveront sur votre page.',
    concreteExample:
      'Un créateur passionné à la fois de musique et de trail peut faire cohabiter ces deux univers en établissant un rythme prévisible (ex. 60% musique / 40% sport) et en tissant des passerelles narratives : la musique qui donne la force de grimper une montagne, ou l’endurance nécessaire pour répéter au piano.',
    practicalImpact:
      'Ne renoncez pas à vos passions sous prétexte d’uniformiser artificiellement votre compte. Travaillez la clarté de votre bio, la régularité de vos rendez-vous et vos ponts narratifs.',
    deepDive: {
      documentedFacts: [
        'Chaque vidéo est évaluée individuellement auprès d’une audience adaptée à son contenu propre.',
        'La désinscription ou l’indifférence répétée des abonnés à des contenus inattendus réduit le taux d’engagement initial sur leur flux abonnements.',
      ],
      practicalObservations: [
        'Les comptes qui réussissent avec plusieurs univers soignent la cohérence du ton, du visage et des valeurs véhiculées.',
        'Une alternance prévisible (ex. 2 vidéos d’un univers pour 1 vidéo de l’autre) rassure la communauté.',
      ],
      strategicHypotheses: [
        'La fidélité d’un abonné se construit d’abord autour d’une promesse claire avant d’accepter d’élargir son regard sur les autres facettes du créateur.',
        'L’identité visuelle (typographie, miniatures, voix) sert de ciment entre des thématiques contrastées.',
      ],
      creatorChecklist: [
        'Ma biographie de profil exprime-t-elle clairement mes différents centres d’intérêt ?',
        'Existe-t-il un fil conducteur visible (mon style, mon émotion, mon approche) entre toutes mes vidéos ?',
        'Ai-je défini une cadence d’alternance pour ne pas délaisser une partie de ma communauté ?',
      ],
    },
  },
  {
    id: 'principe-07-comportement',
    number: '07',
    category: 'Psychologie',
    title: 'Comprendre le comportement des utilisateurs',
    subtitle: 'Les vues ne sont qu’une surface : pourquoi les gens interagissent',
    shortExplanation:
      'Les spectateurs ne réagissent pas au hasard. Le partage est un acte social (on partage ce qui nous fait rire, ce qui nous émeut ou ce qui nous valorise). Le commentaire est une envie d’expression. L’enregistrement est la reconnaissance d’une utilité future.',
    concreteExample:
      'Une vidéo divertissante et rapide peut accumuler 10 000 vues sans générer le moindre partage si elle n’inspire aucune fierté à être relayée. À l’inverse, une interprétation bouleversante avec un texte profond incitera immédiatement le spectateur à l’envoyer à un ami cher.',
    practicalImpact:
      'Avant de finaliser une publication, posez-vous la question clé : qu’est-ce qui donnerait envie à quelqu’un de sauvegarder cette vidéo ou de l’envoyer en message privé ?',
    deepDive: {
      documentedFacts: [
        'Le ratio partages/vues et sauvegardes/vues est l’indicateur le plus puissant de résonance profonde.',
        'Les vidéos qui incitent à l’action sans agressivité génèrent des discussions plus riches dans les commentaires.',
      ],
      practicalObservations: [
        'Les commentaires naissent souvent d’un débat ouvert, d’une question sincère ou d’une émotion partagée.',
        'Les contenus purement passifs génèrent beaucoup de swipes et peu de mémoire chez le spectateur.',
      ],
      strategicHypotheses: [
        'Le partage privé (DM) signale à la plateforme un contenu hautement recommandé par un pair, renforçant sa crédibilité.',
        'La sauvegarde indique une valeur d’usage durable, ce qui maintient la vidéo en recommandation sur un cycle plus long.',
      ],
      creatorChecklist: [
        'Cette vidéo apporte-t-elle une émotion, une inspiration ou un savoir que l’on souhaite conserver ?',
        'Donne-t-elle une raison légitime d’être partagée à un proche ?',
        'La fin invite-t-elle naturellement à l’échange ou au ressenti ?',
      ],
    },
  },
  {
    id: 'principe-08-temporalite',
    number: '08',
    category: 'Stratégie',
    title: 'Comprendre la temporalité',
    subtitle: 'Avant, Pendant, Après : adapter son message au tempo public',
    shortExplanation:
      'L’intérêt pour un sujet n’est pas constant au fil du temps. Selon qu’on se situe avant un événement (attente, curiosité, pronostics), pendant (réaction vive, direct, frisson) ou après (débriefing, émotion, analyse), la forme et l’angle doivent s’adapter.',
    concreteExample:
      'Avant une grande compétition ou un prime télévisé : poser des questions sur les enjeux et la pression ressentie. Pendant : partager la vibration brute de l’instant. Le lendemain : analyser ce qui a fait la différence et ce que l’on en retient.',
    practicalImpact:
      'Cartographiez la vie temporelle de vos sujets. Ne diffusez pas un débriefing quand tout le monde attend encore l’événement, et n’attendez pas trop longtemps pour livrer votre ressenti à chaud.',
    deepDive: {
      documentedFacts: [
        'Les pics de requêtes autour d’un événement live se concentrent dans une fenêtre temporelle resserrée de quelques heures.',
        'Les publications du matin (entre 07h30 et 08h30) bénéficient souvent d’un flux moins saturé de nouveautés que l’après-midi.',
      ],
      practicalObservations: [
        'Publier plusieurs fois en rafale à quelques minutes d’intervalle dilue l’attention de la communauté et disperse les signaux.',
        'Espacer ses prises de parole permet à chaque publication d’achever son cycle de test auprès de l’audience.',
      ],
      strategicHypotheses: [
        'Le spectateur du matin recherche de l’inspiration ou un condensé clair de la veille ; celui du soir recherche de la déconnexion et de l’évasion.',
        'Anticiper les événements permet de préparer des formats plus soignés qui sortiront exactement au moment idoine.',
      ],
      creatorChecklist: [
        'À quelle phase du cycle de vie de ce sujet ma vidéo correspond-elle ?',
        'Le créneau de publication choisi correspond-il à un moment de disponibilité mentale de mon audience ?',
        'Ai-je laissé un temps de respiration suffisant depuis ma dernière publication ?',
      ],
    },
  },
  {
    id: 'principe-09-erreurs',
    number: '09',
    category: 'Méthodologie',
    title: 'Comprendre les erreurs d’interprétation',
    subtitle: 'Distinguer les coïncidences fortuites des mécanismes reproductibles',
    shortExplanation:
      'Voir une vidéo dépasser 50 000 vues est réjouissant, mais croire que son succès est dû à un détail anecdotique (la police d’écriture, un hashtag générique ou l’heure exacte) est un piège mental classique. Il faut distinguer corrélation, hypothèse et véritable cause.',
    concreteExample:
      'Attribuer le pic historique de 13 699 vues sur Cameron uniquement à la mention d’un hashtag #pourtoi occulte la véritable raison : l’incroyable émotion musicale de l’extrait, la notoriété de l’artiste à cet instant précis et la durée longue qui a retenu les spectateurs.',
    practicalImpact:
      'Ne tirez jamais de conclusions hâtives d’une seule réussite ou d’un seul échec isolé. Prenez du recul, observez les tendances sur plusieurs vidéos et fiez-vous à la médiane plutôt qu’à des pics trompeurs.',
    deepDive: {
      documentedFacts: [
        'Une anomalie statistique (outlier) déforme la moyenne globale sans représenter la performance quotidienne reproductible.',
        'La visibilité est multifactorielle : sujet, timing, qualité d’amorce, son et concurrence du moment agissent conjointement.',
      ],
      practicalObservations: [
        'Reproduire mécaniquement tous les détails d’une vidéo virale passée ne garantit jamais d’obtenir le même résultat.',
        'Les créateurs qui analysent avec humilité leurs résultats progressent plus vite que ceux qui cherchent des formules magiques.',
      ],
      strategicHypotheses: [
        'L’audience se lasse très vite de la répétition d’un même gimmick et valorise la fraîcheur créative.',
        'La médiane des vues sur vos 10 dernières vidéos est l’indicateur le plus honnête de votre niveau d’adhésion réel.',
      ],
      creatorChecklist: [
        'Suis-je en train de confondre une corrélation de surface avec une cause profonde ?',
        'Mon échantillon de comparaison est-il assez large pour affirmer qu’un format marche mieux qu’un autre ?',
        'Ai-je regardé la médiane de mes publications plutôt que mon seul record absolu ?',
      ],
    },
  },
  {
    id: 'principe-10-experimentation',
    number: '10',
    category: 'Méthodologie',
    title: 'Comprendre l’expérimentation',
    subtitle: 'La démarche scientifique : tester une seule variable à la fois',
    shortExplanation:
      'Il n’existe aucun guide secret ou recette universelle sur Internet. La seule méthode qui fonctionne dans la durée est l’expérimentation rigoureuse : formuler une hypothèse claire, ne faire varier qu’un seul paramètre, observer les résultats sans complaisance et en tirer des enseignements.',
    concreteExample:
      'Pour tester l’impact de votre phrase d’accroche, conservez exactement le même montage vidéo et la même musique sur deux publications de la semaine, et modifiez uniquement les 4 premiers mots affichés. Vous saurez alors avec certitude ce qui a influencé le résultat.',
    practicalImpact:
      'Devenez le chercheur de votre propre création. Ne copiez pas aveuglément les conseils trouvés en ligne : testez-les sur votre propre terrain avec patience et rigueur.',
    deepDive: {
      documentedFacts: [
        'Modifier plusieurs variables en même temps (titre + musique + durée + heure) empêche d’identifier la cause d’un changement de résultat.',
        'L’apprentissage empirique documenté crée une mémoire durable qui valorise chaque tentative, même celles aux faibles vues.',
      ],
      practicalObservations: [
        'Les créateurs qui tiennent un journal de leurs tests acquièrent une intuition stratégique bien supérieure à la moyenne.',
        'Une vidéo qui fait peu de vues mais qui valide une hypothèse est un succès d’apprentissage précieux.',
      ],
      strategicHypotheses: [
        'L’expérimentation constante permet d’anticiper les évolutions d’attention avant que son compte ne s’essouffle.',
        'La créativité s’épanouit plus librement lorsqu’elle s’appuie sur une méthode de mesure objective.',
      ],
      creatorChecklist: [
        'Quelle hypothèse précise est-ce que je cherche à valider avec cette publication ?',
        'Ai-je bien isolé une seule variable maîtresse (accroche, durée, angle ou son) ?',
        'Quelle métrique objective (taux de complétion, partages ou médiane à 24h) me permettra de conclure ?',
      ],
    },
  },
];
