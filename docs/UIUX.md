# UI/UX Design System · "Cahier" · v1.0

## Concept
Premium learning app with the soul of a French **cahier d'exercices** (exercise notebook) — paper warmth, ink precision, one playful mascot (Léo the fox) used sparingly. Not candy-arcade (the game build owns that); this is the "grown-up sibling": confident, editorial, joyful in moments of success.

## Design tokens
Color (light):
- `--paper` #FBF7F0 (warm page) · `--card` #FFFFFF
- `--ink` #1E2440 (deep blue-black text)
- `--bleu` #2447E6 (primary — "bleu de France", actions/links/focus)
- `--craie` #E9E2D6 (lines/dividers — chalk)
- `--brioche` #F4A614 (XP/rewards gold)
- `--menthe` #17B584 (success) · `--groseille` #E5484D (error)
Dark: paper→#12162B, card→#1A2038, ink→#EDEFFB, craie→#2A3152 (bleu/brioche/menthe unchanged, +10% luminance).

Type:
- Display: **Bricolage Grotesque** (700/600) — characterful, modern, slightly condensed; headlines, numbers, lesson titles.
- Body: **Nunito Sans** (400/600/800) — friendly, highly legible.
- Utility/mono: **Spline Sans Mono** — IPA/pronunciation, stats, code-like chips.
Scale: 12/14/16(base)/18/22/28/36/48; line-height 1.5 body, 1.15 display.

Layout: max-w 1120px shell; 8pt spacing grid; radius 10 (inputs) / 16 (cards) / 999 (chips); shadows soft double (`0 1px 0 rgba(30,36,64,.06), 0 8px 24px rgba(30,36,64,.08)`).

## Signature element — «le fil rouge»
A single continuous 2px rounded path (SVG) that literally threads the UI: it draws the lesson map trail, underlines the dashboard's "today" card, becomes the progress line in lesson player, and traces streaks in reports. One motif, everywhere progress lives. Animated draw-on (`stroke-dashoffset`, 400ms, disabled under reduced-motion).

## Components (P1 set)
AppShell (top nav: logo, XP pill, streak flame, avatar menu) · Card · Button (primary bleu / soft / ghost / danger; 3D-press 1px translate) · Input+Label+Error · ProgressPath (fil rouge) · LessonNode (locked/current/done+stars) · QuestionFrame (kicker, prompt, options grid, feedback banner slide-up) · StatTile · SkillBar · Toast · Modal · EmptyState (Léo sketch + one action).

## Interaction rules
Every action verb-labeled ("Start lesson 7", not "Go"). Feedback banner: correct = menthe wash + explanation; wrong = groseille wash + explanation + "You'll see this again". Focus ring 2px bleu offset 2px, always visible. Motion 150–300ms ease-out; celebrate only real wins (lesson complete, badge) with confetti; zero ambient animation.

## Accessibility
AA contrast verified per token pair (ink/paper 13.2:1, bleu/white 5.9:1); all interactive ≥44px touch; full keyboard paths on player (1-4 select option, Enter continue); `prefers-reduced-motion` kills confetti/draw-ons; lang tags: French text wrapped in `lang="fr"` for screen readers.

## Key screens (wireframe notes)
Dashboard: greeting + today card (fil rouge underline) | 4 StatTiles | continue-lesson hero | skills grid.
Map: vertical fil rouge with LessonNodes grouped by module headers; boss nodes distinct (shield).
Player: minimal chrome (progress path top, hearts right), one question centered, feedback banner bottom.
Auth: split screen — left paper panel with Léo + value copy, right form card.
