# Contributing to Festiverse 3D

Thank you for helping make Festiverse better! 🪔 Bug fixes, translations, accessibility, performance work, documentation and new ideas are all welcome.

## Getting set up

1. **Fork** [HarshvardhanL02/Festiverse-](https://github.com/HarshvardhanL02/Festiverse-) on GitHub.
2. Clone your fork and install:

   ```bash
   git clone https://github.com/<your-username>/Festiverse-.git
   cd Festiverse-
   npm install
   npm run dev
   ```

   Node.js 22 is recommended (it's what Netlify builds with).

3. Create a branch from `main`:

   ```bash
   git checkout -b feat/short-description     # or fix/…, docs/…, i18n/…
   ```

## Before you open a pull request

Run all three checks; they must pass:

```bash
npm run typecheck   # TypeScript (strict)
npm test            # Vitest unit tests
npm run build       # production build
```

If you change anything visual, please also:
- check the greeting at phone width (about 390 px) and on desktop;
- check both **3D** and **Lite** mode (the top-bar toggle on a greeting);
- attach before/after screenshots to the PR.

For performance-related changes, include `?bench` results (see the README) and say which device and tier you used.

## Coding conventions

- **TypeScript strict**, function components and hooks. Keep components focused; shared logic goes in `src/lib/`.
- **Styling:** Tailwind utility classes, with design tokens defined in `src/index.css` (`@theme`).
- **3D code** lives in `src/experience/`. Anything that changes over time should read the shared clock in `timeline.ts` rather than run its own timer. Prefer instancing and shader-driven animation over per-object React state.
- **Every user-facing string** goes in `src/i18n/strings.ts` in **all three languages** (en, hi, mr). A unit test checks that the keys match.
- **Link payload:** don't break existing `/w/…` links. Add optional fields, keep `v: 1` compatible, and add tests to `src/lib/greeting.test.ts` / `music.test.ts`.
- **Accessibility:** use real buttons and links, label icon-only controls, and respect `prefers-reduced-motion`.
- **Commits:** short, imperative messages; [Conventional Commits](https://www.conventionalcommits.org/) prefixes (`feat:`, `fix:`, `docs:`, `perf:`, `i18n:`) are appreciated.

## Assets, music and licensing

- Only add assets you have the right to redistribute (CC0 or an MIT-compatible licence), and record them in [ASSETS.md](ASSETS.md).
- **Never commit copyrighted music, film songs or devotional recordings.** Songs may only be added to the library as **official-channel YouTube embeds** (`src/lib/musicLibrary.ts`), with title and channel copied from YouTube's oEmbed data.
- Never commit secrets. `VITE_*` variables end up in the public bundle.

## Opening the pull request

1. Push your branch: `git push origin feat/short-description`.
2. Open a PR against `main` describing **what** changed and **why**, how you tested it, and include screenshots for UI changes.
3. Keep PRs focused; several small PRs are easier to review than one large one.

By contributing, you agree that your contributions are licensed under the project's [MIT License](LICENSE).
