# @umbeli-com/e2e

Harness Playwright partagé pour les apps Umbeli. Écrit une fois, réutilisé partout
(auth & billing sont mutualisés entre les apps).

Plain JS ESM — **aucun build** : Playwright et Node importent la source directement.

## Contenu

- **`/mocks`** — `createUmbeliTest(options)` : `test` Playwright étendu d'une
  fixture `mock` qui intercepte Supabase Auth + Stripe au niveau réseau.
  Helpers : `allowLogin`, `denyLogin`, `setSubscription`, `asGuest`, `loginViaUI`.
  Aussi `installUmbeliMocks(page, options)` et `fillEditable(page, testId, value)`.
- **`/config`** — `defineUmbeliE2EConfig({ port })` : preset (port dédié, webServer
  `vite --mode e2e`, reporters, trace/vidéo on-failure).
- **`/acceptance`** — `reportAcceptance(path, { allowBlocked })` : gate
  "definition of done". CLI : `umbeli-acceptance [path] [--allow-blocked]`.

## Usage dans une app

`playwright.config.ts` :

```ts
import { defineUmbeliE2EConfig } from '@umbeli-com/e2e/config';
export default defineUmbeliE2EConfig({ port: 5290 });
```

Fichier local `e2e/support/umbeli.ts` (injecte les spécificités de l'app) :

```ts
import { createUmbeliTest, fillEditable } from '@umbeli-com/e2e/mocks';
export const { test, expect } = createUmbeliTest({
  guestStorageKey: 'anonymium_guest_session',
  login: { submitName: /se connecter/i, appPath: '/app' },
});
export { fillEditable };
```

Les specs importent depuis `./support/umbeli`. `acceptance.yaml` et les specs
restent propres à chaque app.
