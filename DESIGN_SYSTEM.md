# Alchemist AI — Design System

Related: [DESIGN_IMPLEMENTATION](DESIGN_IMPLEMENTATION.md) · [PRD](PRD.md) §12 · [API_SPECIFICATION](API_SPECIFICATION.md)

## 1. Design Direction

**Concept: "a reading lamp in the desert at night."** The conversation sits on a deep night-sky surface; the book's evidence sits on warm parchment "pages". The contrast between the two surfaces is the central device: **dark = the assistant's voice, parchment = the book's own words.** A reader can tell generated explanation from supporting evidence at a glance.

The interface should feel literary, warm, minimal, thoughtful, immersive, elegant, and calm, yet modern enough to feel like a polished AI product. It must not look like a SaaS dashboard.

**Inspirations (original, non-derivative):** dune silhouettes, starfields, golden light, parchment, a long path toward the horizon. No cover art, publisher marks, or copyrighted illustration is reproduced. Decorative elements are CSS gradients and a simple original SVG dune line.

**Single theme.** One theme (night with parchment evidence cards) is implemented. A light/dark toggle would add maintenance without a clear user need for this MVP. If a light theme is ever added, it requires re-verifying every contrast pair below.

## 2. Color Palette

Brand colors from the brief are kept; text roles were adjusted where the contrast check below showed failures. Contrast ratios are approximate (WCAG relative-luminance formula) and **must be re-verified with a contrast checker when implemented**.

| Token | Hex | Role |
|---|---|---|
| `--color-midnight` | `#171A24` | App background (base) |
| `--color-desert-night` | `#22283A` | Raised surfaces: assistant bubble, composer, header |
| `--color-parchment` | `#F4E9D5` | Primary text on night; evidence card surface |
| `--color-sandstone` | `#D7B98E` | Secondary headings, user bubble accents, borders on night |
| `--color-gold` | `#C69B55` | Primary actions, selected states, focus ring (use sparingly) |
| `--color-gold-bright` | `#E3BB78` | Hover state of gold elements |
| `--color-terracotta` | `#A85C43` | Decorative accents, error/fallback borders and icons (not small text) |
| `--color-terracotta-soft` | `#E0907A` | Error text on night |
| `--color-ink` | `#352B24` | Text on parchment |
| `--color-muted` | `#8A8175` | Placeholder / non-essential decoration only (large text or ≥ 3:1 uses) |
| `--color-muted-on-night` | `#A39A8C` | Secondary text on night and desert-night surfaces |
| `--color-muted-on-parchment` | `#6B6256` | Secondary text on parchment cards |

### Contrast pairs (approximate)

| Foreground / background | Ratio | Use | Passes |
|---|---|---|---|
| Parchment on midnight | ≈ 14:1 | Body text | AA, AAA |
| Parchment on desert-night | ≈ 11:1 | Assistant bubble text | AA, AAA |
| Gold `#C69B55` on midnight | ≈ 6.8:1 | Icons, links, focus ring, button fill | AA (text and UI) |
| Midnight on gold | ≈ 6.8:1 | Label on gold primary button | AA |
| `--color-muted-on-night` on desert-night | ≈ 5.3:1 | Metadata | AA |
| `--color-muted` `#8A8175` on midnight | ≈ 4.5:1 (borderline) / on desert-night ≈ 3.8:1 | **Do not use for small text on desert-night** | Large text/UI only |
| Terracotta `#A85C43` on midnight | ≈ 3.5:1 | Borders, icons only | UI components (≥ 3:1) |
| Terracotta-soft `#E0907A` on midnight | ≈ 7:1 | Error text | AA |
| Ink on parchment | ≈ 11:1 | Evidence text | AA, AAA |
| `--color-muted-on-parchment` on parchment | ≈ 5:1 | Card metadata | AA |

Rules: gold is for **primary actions and selected states only** (send button, focus ring, expanded-source indicator, active suggestion hover). Never convey state by color alone; pair with icon and text.

## 3. Typography

Fonts (both open-licensed, loaded from Google Fonts with `display=swap`):

| Role | Family | Fallback stack |
|---|---|---|
| Literary headings, brand, evidence excerpts | **Cormorant Garamond** | `"Cormorant Garamond", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif` |
| Chat messages, controls, metadata | **Inter** | `Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |

The app must remain fully usable if the font request fails: the fallback stacks are chosen to have similar metrics, `font-display: swap` avoids invisible text, and no layout depends on a specific font's width. Load only the needed weights (Cormorant 500/600/700; Inter 400/500/600).

| Token | Size / line-height | Weight | Font | Use |
|---|---|---|---|---|
| `--text-display` | `clamp(2rem, 5vw, 3rem)` / 1.1 | 600 | serif | Welcome title |
| `--text-h1` | `clamp(1.5rem, 3.5vw, 2rem)` / 1.2 | 600 | serif | Section headings (rare) |
| `--text-brand` | `1.375rem` / 1.2 | 600 | serif | Header wordmark |
| `--text-body` | `1rem` (16 px) / 1.65 | 400 | sans | Chat messages (answer text) |
| `--text-body-lg` | `1.0625rem` / 1.7 | 400 | sans | Optional larger reading size on ≥ md |
| `--text-excerpt` | `1.125rem` / 1.7 | 500 | serif | Evidence excerpts on parchment |
| `--text-meta` | `0.8125rem` (13 px) / 1.4 | 500 | sans | Chapter label, relevance, timestamps |
| `--text-label` | `0.75rem` / 1.3, letter-spacing 0.08em, uppercase | 600 | sans | Section labels ("FROM THE TEXT", "INTERPRETATION") |

Notes: Cormorant has a small x-height, so excerpts use 18 px at weight 500 for legibility. Never use text below 12 px. Body text color is `--color-parchment` on night; `--color-ink` on parchment. Line length of messages is capped at ~68 characters (`--width-message`).

## 4. Layout

### 4.1 Application shell

```text
┌──────────────────────────────────────────┐
│ AppHeader (56 px, sticky)                │
├──────────────────────────────────────────┤
│                                          │
│   Conversation column (max 760 px, centered)
│   WelcomeScreen  OR  ChatWindow          │
│                                          │
├──────────────────────────────────────────┤
│ ChatInput (sticky bottom, safe-area aware)│
└──────────────────────────────────────────┘
```

- Background: `--color-midnight` with a layered, static CSS gradient (a faint warm glow near the horizon) and a low-opacity SVG dune silhouette fixed to the bottom, behind everything (`aria-hidden`, `pointer-events: none`). A handful of star dots may be produced with radial-gradients. No animation.
- The conversation column is the visual focus. Decoration stays below 12 % visual weight and never sits behind text without sufficient contrast.
- **Sidebar:** not in the MVP (optional enhancement OPT-01). The layout reserves nothing for it.

### 4.2 Header and brand

56 px, `--color-midnight` at 80 % with backdrop blur if supported (solid fallback). Left: a small original star-and-dune glyph (inline SVG) + wordmark "Alchemist AI" in serif. Right: nothing in the MVP (no settings). A 1 px bottom border in `rgba(215,185,142,0.15)`.

### 4.3 Welcome screen (empty state)

Centered in the column, vertically biased upward:
1. Glyph (48 px) with a soft gold glow.
2. Title: **"Explore *The Alchemist*"** in `--text-display`, parchment.
3. One-sentence subtitle in `--color-muted-on-night`: "Ask about characters, events, symbols, and ideas. Every answer shows the passages it came from."
4. `SuggestedQuestions`: a 1-column (mobile) / 2-column (≥ md) grid of cards, 6 suggestions grouped by label chips *Character*, *Theme*, *Symbol* (two each).
5. Footer note (meta size): "Answers are grounded in the indexed text. If the book doesn't say, so will I."

Suggested questions (copy):

| Group | Question |
|---|---|
| Character | "Who is Melchizedek and what advice does he give Santiago?" |
| Character | "What role does the crystal merchant play in Santiago's journey?" |
| Theme | "What does the book mean by a 'Personal Legend'?" |
| Theme | "How does fear of failure affect the characters' choices?" |
| Symbol | "What do omens represent in the story?" |
| Symbol | "What does the desert symbolize?" |

### 4.4 Message layout

| Element | Spec |
|---|---|
| **User message** | Right-aligned, max 85 % width (≤ `--width-message`). Surface `--color-desert-night`, 1 px sandstone border at 35 % opacity, radius `--radius-lg` with a squared bottom-right corner. Text parchment, sans. |
| **Assistant message** | Left-aligned, full column width, **no bubble background**: text directly on the night surface with a small gold star avatar at the left (24 px). Distinguishes the voice from the user's chat bubble. |
| **"From the text" section** | `--text-label` heading in sandstone, then answer paragraphs in `--text-body`. |
| **"Interpretation" section** | Rendered below with a 2 px gold left rule, indented 12 px, `--text-label` heading "INTERPRETATION" plus the phrase "(a reading, not stated in the text)" in muted text. Only shown when `interpretation` is non-null. |
| **Source toggle** | Pill button "Sources (3)" with a chevron; collapsed by default. |
| **Source cards** | See §4.5. |
| **Fallback variant** | Same assistant layout with a compass-off/search icon in sandstone, bordered `--color-terracotta` at 50 %, text from the API, and a hint line: "Try asking about a character, event, theme, or symbol." No sources toggle. |
| **Error variant** | Distinct `ErrorMessage`: terracotta border + `AlertTriangle` icon + `--color-terracotta-soft` heading, plain message, **Retry** button, request ID in small muted text when available. |

### 4.5 Answer source panel and cards

Cards sit on **parchment** (`--color-parchment`) with ink text, a subtle paper shadow, and a 4 px terracotta top-left "ribbon" notch (CSS only).

Card anatomy (collapsed): chapter label (sans meta, `--color-muted-on-parchment`; omitted when `null`) · relevance chip "Relevance 0.61" with `title`/tooltip "Cosine similarity: a ranking signal, not a probability of correctness" · 2-line clamped excerpt preview in serif · "Show passage" button (chevron).
Expanded: full excerpt (≤ 800 chars) in `--text-excerpt`, a thin divider, and small meta line "Passage ID: the-alchemist-0012-3fa9c1d2" (monospace, 12 px) for traceability.
Section label above the list: "PASSAGES FROM THE BOOK".

### 4.6 Composer

Sticky bottom, background `--color-midnight` with a top fade. Inside: a rounded container (`--radius-xl`, `--color-desert-night`, 1 px sandstone border at 30 %) with an auto-growing `textarea` (1–5 rows), placeholder "Ask about Santiago, the desert, omens…" (placeholder color `--color-muted-on-night`), and a circular 44 px send button (gold, midnight icon `SendHorizontal`). Under it on ≥ sm: a tiny hint "Enter to send · Shift+Enter for a new line". A character counter appears only within 50 characters of the limit.

### 4.7 Loading indicator

Assistant-aligned row: three small gold dots with a gentle sequential opacity pulse (1.2 s) + text "Searching the book…" in muted text. Text is in a `role="status"` region. With reduced motion: dots are static and the text alone conveys state.

### 4.8 Empty and error states

| State | Treatment |
|---|---|
| Welcome (no messages) | §4.3 |
| Index not ready | Full-column `ErrorMessage` variant: "The book hasn't been indexed yet. If you're the developer, run the ingestion step in the README." |
| No evidence | Fallback assistant message (§4.4) |
| Request error | `ErrorMessage` with Retry; the user's question remains in the composer or is re-sendable |
| Offline (fetch failure) | `ErrorMessage` "You appear to be offline or the server is unreachable." |

### 4.9 Responsive behavior

| Breakpoint | Behavior |
|---|---|
| < 640 px | Single column, 16 px side padding; suggestions 1-up; header wordmark shortened to glyph + "Alchemist AI" at 1.125rem; composer full width with safe-area bottom padding; source cards full width |
| 640–767 px | 24 px side padding; suggestions 2-up |
| ≥ 768 px | Column max 760 px; larger body size optional (`--text-body-lg`); composer hint visible |
| ≥ 1024 px | Same column centered; more atmospheric background visible at the sides |

Use `100dvh` for the shell so mobile browser chrome does not hide the composer. Support zoom to 200 % without horizontal scrolling.

## 5. Interaction and Motion

| Interaction | Spec |
|---|---|
| Hover (suggestion card) | Border moves to gold at 60 %, background lightens to `rgba(244,233,213,0.06)`; 150 ms |
| Hover (send button) | Background → `--color-gold-bright`; 120 ms |
| Hover (source toggle) | Underline + gold icon; 120 ms |
| Active/press | `transform: scale(0.97)`; 80 ms |
| Focus-visible | `--focus-ring` (2 px midnight gap + 2 px gold ring) on night surfaces; `--focus-ring-on-parchment` (ink ring) on cards. Never `outline: none` without replacement. |
| Disabled | Send button: 40 % opacity, `cursor: not-allowed`, `aria-disabled`/`disabled`; composer textarea disabled while loading is **not** done (so the user can keep typing); only submission is blocked |
| Loading | Dot pulse (§4.7); message list auto-scrolls to the new message end |
| Source expand | Height transition 180 ms ease-out (grid-rows 0fr→1fr technique); chevron rotates 180° |
| New message | Fade-in + 4 px upward slide, 200 ms |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` sets all durations to ~0, removes slide, pulse and glow animation |

No parallax, no typing-effect animation, no looping decorative animation. Nothing may delay an interaction.

## 6. Design Tokens (CSS variables)

Defined once in `frontend/src/styles/index.css`; Tailwind maps to them (see [DESIGN_IMPLEMENTATION](DESIGN_IMPLEMENTATION.md)).

```css
:root {
  /* ---- Colors: see §2 for roles ---- */
  --color-midnight: #171A24;
  --color-desert-night: #22283A;
  --color-parchment: #F4E9D5;
  --color-sandstone: #D7B98E;
  --color-gold: #C69B55;
  --color-gold-bright: #E3BB78;
  --color-terracotta: #A85C43;
  --color-terracotta-soft: #E0907A;
  --color-ink: #352B24;
  --color-muted: #8A8175;
  --color-muted-on-night: #A39A8C;
  --color-muted-on-parchment: #6B6256;
  --color-border-night: rgba(215, 185, 142, 0.18);   /* hairlines on night */
  --color-border-strong: rgba(215, 185, 142, 0.35);  /* inputs, user bubble */
  --color-overlay-hover: rgba(244, 233, 213, 0.06);  /* hover wash on night */

  /* ---- Typography ---- */
  --font-serif: "Cormorant Garamond", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  --font-sans: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;   /* chunk IDs only */
  --text-display: clamp(2rem, 5vw, 3rem);
  --text-h1: clamp(1.5rem, 3.5vw, 2rem);
  --text-brand: 1.375rem;
  --text-body: 1rem;
  --text-body-lg: 1.0625rem;
  --text-excerpt: 1.125rem;
  --text-meta: 0.8125rem;
  --text-label: 0.75rem;
  --leading-tight: 1.15;
  --leading-body: 1.65;
  --leading-reading: 1.7;

  /* ---- Spacing (4 px base) ---- */
  --space-1: 0.25rem;  --space-2: 0.5rem;   --space-3: 0.75rem;  --space-4: 1rem;
  --space-5: 1.25rem;  --space-6: 1.5rem;   --space-8: 2rem;     --space-10: 2.5rem;
  --space-12: 3rem;    --space-16: 4rem;

  /* ---- Radii ---- */
  --radius-sm: 6px;    /* chips, small buttons */
  --radius-md: 10px;   /* cards, suggestion tiles */
  --radius-lg: 16px;   /* message bubbles */
  --radius-xl: 24px;   /* composer */
  --radius-full: 9999px;

  /* ---- Shadows ---- */
  --shadow-card: 0 1px 2px rgba(0,0,0,0.25), 0 6px 18px rgba(0,0,0,0.28);        /* parchment cards on night */
  --shadow-composer: 0 -8px 24px rgba(23,26,36,0.85);                             /* fade above composer */
  --shadow-glow: 0 0 24px rgba(198,155,85,0.25);                                  /* welcome glyph only */

  /* ---- Widths ---- */
  --width-column: 760px;     /* conversation column */
  --width-message: 68ch;     /* reading measure */
  --width-bubble-user: 85%;
  --header-height: 56px;
  --composer-min-height: 64px;
  --touch-target: 44px;

  /* ---- Motion ---- */
  --duration-fast: 120ms;
  --duration-base: 180ms;
  --duration-slow: 240ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);

  /* ---- Focus ---- */
  --focus-ring: 0 0 0 2px var(--color-midnight), 0 0 0 4px var(--color-gold);
  --focus-ring-on-parchment: 0 0 0 2px var(--color-parchment), 0 0 0 4px var(--color-ink);

  /* ---- Z-index layers ---- */
  --z-background: 0;     /* dunes, stars */
  --z-content: 1;        /* messages */
  --z-sticky: 10;        /* header, composer */
  --z-tooltip: 20;
  --z-toast: 30;         /* reserved; not used in MVP */
}

@media (prefers-reduced-motion: reduce) {
  :root { --duration-fast: 0ms; --duration-base: 0ms; --duration-slow: 0ms; }
}
```

### Token usage guide

| Token group | Intended use | Do not |
|---|---|---|
| Colors | Only via variables / mapped Tailwind classes | Hard-code hex values in components |
| `--color-gold*` | Send button, focus ring, selected/expanded indicator, interpretation rule | Decorate headings, borders everywhere, or backgrounds |
| `--color-terracotta*` | Fallback/error accents | Small body text (use `-soft`) |
| `--color-muted` | Placeholder fallback / large text | Small text on desert-night (use `-on-night`) |
| Spacing | Margins, padding, gaps from the scale | Arbitrary pixel values |
| Radii | `sm` chips, `md` cards, `lg` bubbles, `xl` composer | Mix radii within one component family |
| Shadows | Cards and composer fade only | Shadows on every element |
| Widths | Column and reading measure | Full-width text lines on desktop |
| Motion | Hover/press/expand/new message only | Looping or decorative animation |
| Z-index | The named layers only | Magic numbers |

## 7. Iconography

Lucide React, stroke 1.75, sizes 16/20/24. Icons used: `SendHorizontal` (send), `ChevronDown` (expand), `AlertTriangle` (error), `SearchX` (no evidence), `RotateCcw` (retry), `Star` (assistant avatar / sparkle), `BookOpen` (passages). Icon-only buttons have `aria-label`.

## 8. Voice and Copy Principles

Warm, plain, brief. Use "I" sparingly. Never blame the user. Be honest about limits ("If the book doesn't say, I won't guess."). Avoid hype words and AI jargon in the UI.
