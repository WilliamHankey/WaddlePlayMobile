# Storybook (React Native) — WaddlePlay Mobile

This document describes the **best-effort** [Storybook for React Native](https://storybookjs.github.io/react-native/)
integration for the Expo Router app in `frontend/`.

> Status: **unverified**. The configuration, stories and scripts are in place, but this
> setup was authored without a simulator/device and without running `yarn install`, so it has
> not been executed. Run `yarn install` and start it on a device/simulator to confirm.

Web-hosted Storybook (as added to the three web repos) does **not** apply here: RN
Storybook renders on a native device/simulator and is driven by Metro over a WebSocket.
There is no GitHub Pages deployment for this app.

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
  RN Storybook has no equivalent here, so stories are display-only.
- **No CI job.** Running RN Storybook in CI would require a simulator/emulator; not set up.
- **`TopBar` / navigation-dependent components** are not storied because they call
  `expo-router`'s `useRouter` and need a router context.
