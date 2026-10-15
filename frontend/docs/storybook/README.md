# Storybook (React Native) — WaddlePlay Mobile

This document describes the **best-effort** [Storybook for React Native](https://storybookjs.github.io/react-native/)
integration for the Expo Router app in `frontend/`.

> Status: the **web** Storybook builds and renders (verified with a production build). The
> **on-device** Storybook is unverified — it was authored without a simulator/device. Run
> `yarn storybook:ios` / `yarn storybook:android` to confirm it.

Two Storybooks are configured:

- **Hosted (web)** — `@storybook/react-native-web-vite` renders the components in a browser
  via `react-native-web`. Built to `storybook-static/` and published to GitHub Pages.
- **On-device (native)** — `@storybook/react-native`, driven by Metro over a WebSocket.

## What was added

| File | Purpose |
| --- | --- |
| `.rnstorybook/main.ts` | Story discovery (`../src/**/*.stories.?(ts|tsx|js|jsx)`) + on-device addons |
| `.rnstorybook/preview.tsx` | Global decorators (`SafeAreaProvider`) + background presets |
| `.rnstorybook/index.tsx` | Storybook UI entry point (imports the generated `storybook.requires`) |
| `metro.config.js` | Wraps the Metro config with `@storybook/react-native/withStorybook` |
| `src/components/*.stories.tsx` | Example stories (`BrandMark`, `Screen UI`) |
| `package.json` | `storybook*` scripts + Storybook devDependencies |

`.rnstorybook/storybook.requires.ts` is **generated** by the Metro wrapper (or
`yarn storybook-generate`) and is gitignored.

## How it runs

Entry-point swapping is used (v10.4+), so **no app code changes are needed**. When
`STORYBOOK_ENABLED=true`, the `withStorybook` wrapper swaps the Expo entry point to
Storybook; otherwise it is a no-op with zero Storybook code in the bundle.

```sh
yarn install          # installs @storybook/react-native + device addons
yarn storybook        # STORYBOOK_ENABLED=true expo start
yarn storybook:ios    # ... expo start --ios
yarn storybook:android
```

On Windows PowerShell the env prefix does not work; set it first:

```powershell
$env:STORYBOOK_ENABLED = "true"; yarn expo start
```

`metro.config.js` guards the `require('@storybook/react-native/withStorybook')` call, so
the app keeps bundling normally if Storybook is not installed.

## Hosted web Storybook

| File | Purpose |
| --- | --- |
| `.storybook/main.ts` | Web config (`@storybook/react-native-web-vite`); aliases the Feather icon entry to its web-safe `/static` build |
| `.storybook/preview.tsx` | Same `SafeAreaProvider` decorator, plus loads the Feather icon web font |
| `.storybook/globals.d.ts` | `*.ttf` module declaration |
| `.github/workflows/storybook.yml` | CI build + GitHub Pages deploy |

```sh
yarn storybook:web     # storybook dev -p 6006
yarn build-storybook   # storybook build -o storybook-static
```

Notes:

- `@react-native-vector-icons/feather`'s default entry is ESM but calls `require()` for its
  font file, which is undefined under Vite. The web config aliases the package to its
  `/static` entry (glyph map imported directly) and registers `Feather.ttf` as a `FontFace`.
- The build job also uploads `storybook-static` as a downloadable workflow artifact, and the
  `deploy` job publishes it to GitHub Pages (the deploy step skips cleanly if Pages is off).
  Live at <https://williamhankey.github.io/WaddlePlayMobile/>.

## Peer dependency note

`@storybook/react-native` lists `@gorhom/bottom-sheet >=4` as a peer. It is **not**
currently a dependency of this app. If the Storybook UI fails to start, install it:

```sh
yarn add -D @gorhom/bottom-sheet
```

## Writing stories

Stories use the standard CSF format inside `src/**`:

```tsx
import type { Meta, StoryObj } from '@storybook/react-native';
import { MyComponent } from './my-component';

const meta = { title: 'Components/MyComponent', component: MyComponent } satisfies Meta<typeof MyComponent>;
export default meta;

type Story = StoryObj<typeof meta>;
export const Default: Story = {};
```

The global `SafeAreaProvider` decorator (`preview.tsx`) supplies a fixed iPhone-like
inset frame, so components using `react-native-safe-area-context` render deterministically.

## Not covered

- **No interaction / accessibility test runner.** The web repos run stories under Vitest;
  this project has no equivalent, so stories are display-only.
- **No on-device CI job.** Publishing the *web* Storybook is automated
  (`.github/workflows/storybook.yml`), but running the *native* Storybook in CI would
  require a simulator/emulator; not set up.
- **`TopBar` / navigation-dependent components** are not storied because they call
  `expo-router`'s `useRouter` and need a router context.
