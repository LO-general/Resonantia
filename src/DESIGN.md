# Système de design : base « Étape 1 »

Source unique : `src/index.css` (tokens, surfaces, animations) + `src/components/ui/` (composants animés).

## Palette
Fond `zinc-950`, surfaces `zinc-900`, bordures `zinc-800`, texte `zinc-100/300/400`.
Accents : rose `#fb7185` · ambre `#fbbf24` · indigo `#818cf8` · émeraude `#34d399` · cyan `#22d3ee`.
Dégradé de marque (boutons, titres forts) : rose → ambre (`.btn-brand`, `.gradient-text`).

## Classes utilitaires (index.css)
`.surface` carte vitrée · `.surface-hover` lévitation au survol · `.btn-brand` bouton principal ·
`.gradient-text` titre dégradé · `.reveal` / `.stagger` apparitions en cascade · `.page-enter` transition de page ·
`.live-dot` point pulsé · `.aurora-bg` fond animé · `.chart-line` / `.chart-bar` graphiques qui se dessinent.

## Composants (`components/ui`)
`PageHeader` · `AnimatedNumber` · `Sparkline` · `BarChart` · `ProgressRing` · `Reveal` · `ScrollProgress` · `useScrollReveal`.

## Filet de sécurité
Toutes les pages reçues sont converties. `.legacy-bridge` (dans `index.css`, posé sur `<main>` de `App.tsx`)
reste actif pour rattraper une éventuelle classe claire oubliée. Il peut être retiré une fois la recette visuelle faite.

## Effets (sobres)
Halo discret qui suit la souris sur `.surface` (`ui/spotlight.ts`, installé dans `main.tsx`) ·
apparition en cascade des cartes à chaque page (`ui/usePageReveal.ts`, branché dans `App.tsx`) ·
fond d'aurore lent. Aucun emoji dans l'interface. Tout se coupe avec « Réduire les animations » du système.

## Lecture des pourcentages
`DonutChart` (répartition), `MeterBar` (jauge avec repère), `StackedBar` (part de chaque ensemble), `Sparkline` (évolution).
Règle : un pourcentage isolé est accompagné d'un visuel, et les barres d'un même groupe partagent la même échelle.
