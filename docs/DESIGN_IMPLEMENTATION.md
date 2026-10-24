# Alchemist AI — Design Implementation Guide

Related: [DESIGN_SYSTEM](DESIGN_SYSTEM.md) (tokens and visual spec) · [API_SPECIFICATION](API_SPECIFICATION.md) · [PRD](PRD.md) FR-32…FR-38

This guide turns the design system into frontend code structure. The design system is the source of truth for values; this document is the source of truth for **how they are applied in React and Tailwind**.

## 1. Component Hierarchy

```text
App
├─ AppHeader
└─ ChatLayout
   ├─ (no messages) WelcomeScreen
   │   └─ SuggestedQuestions
   ├─ (messages) ChatWindow
   │   ├─ MessageBubble (user | assistant | fallback)
   │   │   └─ SourceCard × n   (assistant only, inside a collapsible list)
   │   ├─ LoadingIndicator     (while a request is pending)
   │   └─ ErrorMessage         (when the last request failed)
   └─ ChatInput
```

Supporting (non-visual): `hooks/useChat.js` (state + submit/retry), `services/chatApi.js` (fetch wrapper), `styles/index.css` (tokens + Tailwind directives).

## 2. Component Responsibilities

| Component | Responsibility | Props (summary) |
|---|---|---|
| `App` | Mounts `AppHeader` + `ChatLayout`; owns the `useChat` hook instance | — |
| `AppHeader` | Brand glyph and wordmark; sticky; no logic | — |
| `ChatLayout` | Shell: background layers, scroll container, column width, decides Welcome vs Chat; hosts `ChatInput` | `chat` (return of `useChat`) |
| `WelcomeScreen` | Empty-state title, subtitle, note; renders `SuggestedQuestions` | `onPick(question)` |
| `SuggestedQuestions` | Grid of suggestion buttons grouped by Character/Theme/Symbol | `onPick`, `disabled` |
| `ChatWindow` | `role="log"` live region; maps messages; scroll-to-end; shows `LoadingIndicator` / `ErrorMessage` | `messages`, `status`, `error`, `onRetry` |
| `MessageBubble` | Renders one message by `variant` (`user`, `assistant`, `fallback`); labeled sections; hosts source toggle and list | `message` |
| `SourceCard` | One evidence passage on parchment; own expand/collapse state | `source`, `index` |
| `ChatInput` | Auto-growing textarea, send button, key handling, counter, validation hint | `onSend`, `disabled`, `maxLength`, `initialValue` |
| `LoadingIndicator` | Pulsing dots + "Searching the book…" status text | — |
| `ErrorMessage` | Friendly error by `code`, request ID, Retry button | `error`, `onRetry` |

Do not create further components for trivial markup (e.g., no `Chip`, `Avatar`, `Divider` components in the MVP). Small repeated markup inside a component can be a local function in the same file.

### Message data shape (frontend state)

```js
// user
{ id, role: 'user', content: string }
// assistant answered
{ id, role: 'assistant', variant: 'answer', content: string, interpretation: string|null,
  sources: Source[], warnings: string[] }
// assistant fallback
{ id, role: 'assistant', variant: 'fallback', content: string, sources: [] }
```

`Source` is exactly the API `sources[]` item. Errors are not messages; they live in `chat.error = { code, message, requestId }` and are rendered by `ErrorMessage` below the last user message.

### `useChat` contract

```js
const { messages, status, error, send, retry } = useChat();
// status: 'idle' | 'loading'
// send(question): validates trimmed non-empty, ≤ 500; ignored while status === 'loading'
// retry(): resends the last user question after an error
```

Rules: append the user message immediately; set `loading`; call `chatApi.ask`; on success append assistant message; on failure set `error`, keep the user message, and restore the draft text to the composer. Use an `AbortController` to cancel an in-flight request on unmount. No persistence in the MVP.

## 3. Layout Rules

- `ChatLayout` root: `min-h-dvh flex flex-col`, background from `--color-midnight`; the background decoration is an absolutely positioned `aria-hidden` layer at `z-[var(--z-background)]`.
- Header: `sticky top-0`, height `var(--header-height)`, z-index `--z-sticky`.
- Scrolling region: `flex-1 overflow-y-auto`; inner wrapper `mx-auto w-full max-w-[var(--width-column)] px-4 sm:px-6`.
- Composer: `sticky bottom-0`, `pb-[max(1rem,env(safe-area-inset-bottom))]`, `--shadow-composer` fade above it.
- Message measure: assistant text blocks `max-w-[var(--width-message)]`.
- Use Flexbox/Grid; no fixed pixel heights except header and composer min-height tokens.
- Page-level horizontal scroll is a bug. Long unbroken strings (chunk IDs) use `break-all` in their container.

## 4. Tailwind CSS Conventions

**Setup assumption: Tailwind CSS v4 with the Vite plugin.** Check current Tailwind docs at install time. If v3 is used instead, map the same token names in `tailwind.config.js` (`theme.extend.colors` etc.).

`src/styles/index.css`:

```css
@import "tailwindcss";

:root { /* all tokens from DESIGN_SYSTEM §6, copied verbatim */ }

@theme inline {
  --color-midnight: var(--color-midnight);
  --color-desert-night: var(--color-desert-night);
  --color-parchment: var(--color-parchment);
  --color-sandstone: var(--color-sandstone);
  --color-gold: var(--color-gold);
  --color-gold-bright: var(--color-gold-bright);
  --color-terracotta: var(--color-terracotta);
  --color-terracotta-soft: var(--color-terracotta-soft);
  --color-ink: var(--color-ink);
  --color-muted: var(--color-muted);
  --color-muted-night: var(--color-muted-on-night);
  --color-muted-parchment: var(--color-muted-on-parchment);
  --font-serif: var(--font-serif);
  --font-sans: var(--font-sans);
  --radius-sm: var(--radius-sm);  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);  --radius-xl: var(--radius-xl);
}
```

(If the `@theme inline` self-reference of identical names causes trouble, rename the Tailwind-facing variables with a `--tw-` prefix and map them.)

Conventions:

1. **Colors only through tokens:** `bg-midnight`, `bg-desert-night`, `text-parchment`, `text-ink`, `text-muted-night`, `border-sandstone/30`, `bg-gold`. No hex literals and no arbitrary color values in JSX.
2. **Typography classes:** `font-serif` for headings/brand/excerpts, `font-sans` default on `body`. Sizes use the token variables via `text-[length:var(--text-body)]` or small `@layer components` classes: `.text-display`, `.text-excerpt`, `.text-meta`, `.text-label`. Keep these class definitions in `index.css` only.
3. **Spacing** uses Tailwind's default 4 px scale (matches `--space-*`). No arbitrary pixel spacing except token-driven values.
4. **Mobile-first:** base styles for < 640 px; add `sm:`, `md:`, `lg:` overrides.
5. **State variants** are always paired: `hover:`, `focus-visible:`, `disabled:`, `aria-expanded:`.
6. Class strings longer than ~10 utilities that repeat across components move to an `@layer components` class (e.g., `.btn-primary`, `.card-parchment`, `.surface-night`). Maximum ~8 such classes in total.
7. Prefer `clsx`-free conditional strings (template literals) to avoid extra dependencies.

## 5. Global Stylesheet Responsibilities (`styles/index.css`)

- Tailwind import and `@theme` mapping.
- `:root` tokens (single definition).
- Font loading: `<link>` tags with `display=swap` in `index.html` (plus `preconnect`); no `@import url()` in CSS that would block rendering.
- `html, body, #root { height: 100%; }`; `body` sets `font-family: var(--font-sans)`, background and text colors, `-webkit-font-smoothing: antialiased`.
- Background decoration classes (`.sky`, `.dunes`).
- Focus-visible defaults: `:focus-visible { outline: none; box-shadow: var(--focus-ring); }` and `.on-parchment :focus-visible { box-shadow: var(--focus-ring-on-parchment); }`.
- Reduced-motion media query and keyframes (`dot-pulse`, `message-in`).
- `.sr-only` utility if not provided by Tailwind.

## 6. Responsive Breakpoints

| Name | Min width | Changes |
|---|---|---|
| base | 0 | Single column, 16 px padding, 1-up suggestions, compact header |
| `sm` | 640 px | 24 px padding, 2-up suggestions, composer hint visible |
| `md` | 768 px | Optional larger reading size; spacious message gaps |
| `lg` | 1024 px | Wider atmospheric background; column unchanged |

Test at 360, 390, 768, 1024, and 1440 px widths and at 200 % browser zoom.

## 7. Accessibility Requirements (implementation level)

| Concern | Implementation |
|---|---|
| Landmarks | `<header>`, `<main>`, composer inside `<form>`; one `<h1>` (welcome title; visually hidden "Alchemist AI chat" when the chat is active) |
| Message list | `ChatWindow` root: `role="log"`, `aria-live="polite"`, `aria-relevant="additions"`, `aria-label="Conversation"`; each message is an `<article>` with a visually hidden "You said"/"Alchemist AI answered" prefix |
| Loading | `LoadingIndicator` has `role="status"`; text "Searching the book…" is real text |
| Errors | `ErrorMessage` has `role="alert"`; Retry is a `<button>` |
| Composer | `<label>` (visually hidden) tied to the textarea; `aria-describedby` points to the hint/validation text; send button `type="submit"` with `aria-label="Send question"`; `disabled` while empty or loading with `aria-disabled` semantics visible |
| Keyboard | Enter submits (not while IME composing); Shift+Enter newline; Tab order: suggestions → messages' source toggles → composer; focus stays in the textarea after sending |
| Source cards | Toggle is `<button aria-expanded aria-controls="passage-{chunkId}">`; the panel has `id` and `role="region"` + `aria-label` |
| Suggestions | Real `<button>`s with accessible names equal to the question text |
| Contrast | Use only token pairs listed in DESIGN_SYSTEM §2 |
| Motion | All animations respect `prefers-reduced-motion` |
| Targets | `min-h-11 min-w-11` (44 px) on all interactive controls |
| Zoom/reflow | No fixed widths that break at 320 px; wrap long strings |
| Decoration | Background and glyph SVGs are `aria-hidden="true"` and `focusable="false"` |
| Language | `<html lang="en">` |

## 8. Reusable Design Tokens

All components consume tokens through Tailwind classes or `var(--token)`. To add a new color, spacing, or radius: add it to DESIGN_SYSTEM §6 first, then to `:root`/`@theme`, then use it. Never introduce a value only in a component.

## 9. Chat Message Rendering

- All message text is rendered as React text nodes. **No `dangerouslySetInnerHTML`, no Markdown/HTML parsing** (answers are plain text).
- Split `content` and `interpretation` on `\n\n` into `<p>` elements; single `\n` is preserved with `whitespace-pre-line` on each paragraph.
- Assistant `answer` variant renders, in order: label "FROM THE TEXT" → paragraphs → (if `interpretation`) "INTERPRETATION" section with a gold left rule → (if `sources.length`) source toggle → (when open) "PASSAGES FROM THE BOOK" + `SourceCard`s → (if `warnings` includes `UNVERIFIED_QUOTATION`) a small muted note: "Some quoted wording could not be verified against the passages."
- Assistant `fallback` variant renders the API's `answer` text with the `SearchX` icon and the hint line; it never renders a source toggle.
- User messages render plain text, preserving line breaks.
- Auto-scroll to the newest message after append unless the user has scrolled up more than ~120 px (then show nothing intrusive; the live region still announces).

## 10. Source-Card Behavior

- Collapsed by default; the list container toggles via the "Sources (n)" pill, and each card also toggles individually (two-level disclosure is **not** used: the pill reveals the cards in collapsed preview state; each card expands to the full excerpt).
- Collapsed card shows: chapter (if non-null), relevance chip, 2-line clamped excerpt (`line-clamp-2`), "Show passage" button.
- Expanded card shows: full `excerpt` in serif, divider, `Passage ID: {chunkId}` in monospace.
- Relevance chip text: `Relevance {similarity.toFixed(2)}`; tooltip/`title`: "Cosine similarity: a ranking signal, not a probability of correctness."
- `pageNumber` is displayed only when non-null (`p. 12`).
- Animation: grid-rows height transition (`duration-base`), disabled under reduced motion.
- Cards use the `on-parchment` focus ring.
- Card order = API order (similarity descending).

## 11. Loading and Error States

| State | Component | Behavior |
|---|---|---|
| Loading | `LoadingIndicator` | Appears right after the user message; composer remains typeable but send is disabled |
| Success | `MessageBubble` (answer) | Replaces loading |
| No evidence | `MessageBubble` (fallback) | Replaces loading |
| Error | `ErrorMessage` | Replaces loading; message chosen by `error.code` using the table in API_SPECIFICATION §6; **Retry** calls `retry()`; the request ID is shown in small text for `INTERNAL_ERROR` and network errors |
| Index not ready | `ErrorMessage` (code `INDEX_NOT_READY`) | No Retry spam: the button reads "Check again" |

Optional on first load: call `GET /api/book/info`; if `indexReady` is `false`, show the index-not-ready state on the welcome screen instead of waiting for a failed chat.

## 12. Suggested-Question Interactions

- Click or Enter/Space on a suggestion calls `send(question)` directly (it does not just fill the textarea).
- While `status === 'loading'`, suggestions are `disabled` (reduced opacity, no hover).
- The grid disappears after the first message; suggestions are not shown again in the MVP.
- The list lives in `SuggestedQuestions.jsx` as a constant array `{ group, text }` and must match DESIGN_SYSTEM §4.3.

## 13. Responsive Sidebar Behavior

No sidebar exists in the MVP. If conversation history (OPT-01) is added later: a ≥ `lg` persistent 280 px left rail; < `lg` an off-canvas drawer opened from a header button, focus-trapped, closable with Escape, with a labeled toggle. Do not build any of this now.

## 14. Empty-State Design

The welcome screen is the empty state: glyph with soft glow, serif title, one-line explanation of grounding, six grouped suggestions, honesty note. It must fit in one viewport on a 360 × 640 screen without scrolling the page body (the suggestions area may scroll inside the column). The composer is visible and focusable at all times.

## 15. Rules for Avoiding Inconsistent Styling

1. No hex or rgb values outside `index.css`.
2. No inline `style={{}}` except for dynamic values that cannot be expressed as classes (e.g., a computed textarea height).
3. Use only the radii, shadows, and spacing tokens defined; no one-off `rounded-[13px]`.
4. Gold is reserved for primary action, focus, selected/expanded, and the interpretation rule. A reviewer should reject gold used purely decoratively.
5. Parchment surfaces are used **only** for source evidence. Assistant prose must never appear on parchment, and evidence must never appear without it.
6. Every interactive element has hover, `focus-visible`, active, and disabled treatments consistent with DESIGN_SYSTEM §5.
7. Headings and the brand use the serif; everything functional uses the sans; chunk IDs use mono.
8. Icons come from Lucide only, at the three approved sizes.
9. Before adding a component, check §2: if an existing component's responsibility covers it, extend that.
10. Run a visual pass at 360 px and 1280 px, and a keyboard-only pass, before declaring the UI done; record results honestly.

## 16. Frontend Tests Required (maps to PRD AC-14…AC-17)

- Welcome renders ≥ 3 suggestions; clicking one calls the API stub with that text.
- Empty/whitespace input keeps the send button disabled; Enter does nothing.
- During a pending request: loading indicator visible; second submit ignored.
- Answer with sources: cards collapsed by default; toggle flips `aria-expanded` and reveals the excerpt.
- Fallback response renders the fallback variant and no source toggle.
- Error response renders `ErrorMessage` with Retry, retains the question, and Retry resends it.
- `UNVERIFIED_QUOTATION` warning shows the note.
- No component uses `dangerouslySetInnerHTML` (lint or grep check).
