# UmbeliumComponents

Monorepo de composants React réutilisables pour les applications SaaS Umbeli.
**C'est la SOURCE CANONIQUE** : les apps consomment des copies vendorisées du
`dist` (voir « Synchronisation vers les apps » plus bas).

## Structure

```
UmbeliumComponents/
├── packages/
│   ├── ui/          # @umbeli-com/ui - Composants UI génériques
│   ├── layout/      # @umbeli-com/layout - AppShell, SidebarNav, Topbar…
│   ├── auth/        # @umbeli-com/auth - Pages/briques d'authentification
│   ├── billing/     # @umbeli-com/billing - Client billing du Manager
│   └── e2e/         # @umbeli-com/e2e - Harness Playwright + gate acceptance
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

## Packages

### @umbeli-com/ui

Composants UI de base réutilisables:
- **Button** - Bouton avec variants (primary, secondary, ghost)
- **Card** - Carte avec padding et variants
- **Icon** - Wrapper d'icônes IonIcons
- **Tabs** - Onglets avec variants (default, pills)
- **Skeleton** - Placeholder de chargement

### @umbeli-com/layout

Composants de layout:
- **PageHeader** - En-tête de page avec titre, sous-titre et actions
- **GridSection** - Section avec grille responsive
- **AppShell / Topbar** - Coquille d'app avec sidebar
- **SidebarNav** - Sidebar standard de la suite : onglets style Webum
  (`.sidebar-nav__link`) + slots `upgradeSlot` (carte d'essai `.sidebar-upgrade`
  avec reflet, CTA une ligne) et `accountSlot` (chip compte + déconnexion,
  ordre du footer Anonymum). Styles de la carte : `SidebarUpgrade.scss`.

### @umbeli-com/auth

**La page de login standard de la suite** (décision 2026-08-12, référence
Anonymum) : `AuthPageLayout` + `AuthHeader` (props `logoText` + `logoSrc` — le
logo du SaaS, même visuel que le favicon) + `GoogleOAuthButton` + styles
`AuthPages.css`. Pas d'accès invité sur la page de login. Voir
`UmbeliumManager/docs/NEW-SAAS-CHECKLIST.md` §4.

### @umbeli-com/billing

Client REST du Manager (`createBillingClient`) : statut d'abonnement per-app,
checkout, portail. Le modèle billing est UN abonnement Stripe PAR app —
doc canonique `UmbeliumManager/docs/BILLING-PER-APP.md`.

### @umbeli-com/e2e

Harness Playwright partagé (`createUmbeliTest`, mocks Supabase/Stripe,
`defineUmbeliE2EConfig`) + CLI `umbeli-acceptance` (gate « definition of
done » lisant l'`acceptance.yaml` de chaque app). Voir `packages/e2e/README.md`.

## Installation

### Prérequis

- Node.js >= 18
- pnpm >= 8

### Setup

```bash
# Cloner le repo
git clone https://github.com/umbeli-com/UmbeliumComponents.git
cd UmbeliumComponents

# Installer les dépendances
pnpm install

# Build tous les packages
pnpm build
```

## Utilisation dans un projet

### Avec pnpm workspace (monorepo)

Si votre projet est dans le même monorepo:

```json
{
  "dependencies": {
    "@umbeli-com/ui": "workspace:*",
    "@umbeli-com/layout": "workspace:*"
  }
}
```

### Avec npm/pnpm link (développement local)

```bash
# Dans UmbeliumComponents/packages/ui
pnpm link --global

# Dans votre projet
pnpm link --global @umbeli-com/ui
```

### Import des composants

```tsx
import { Button, Card, Icon, Tabs } from '@umbeli-com/ui';
import { PageHeader, GridSection } from '@umbeli-com/layout';

// Import des styles (dans votre fichier principal)
import '@umbeli-com/ui/styles';
import '@umbeli-com/layout/styles';
```

## Synchronisation vers les apps (vendoring)

Les apps NE consomment PAS ce repo depuis le registry : chacune embarque une copie du
package (`"@umbeli-com/auth": "file:vendor/umbeli-components/auth"`), pour que
`docker build` n'ait pas besoin d'un token GitHub Packages. Il y a **41 copies réparties
dans 9 apps**.

Tant que la recopie était un `rsync` manuel, les copies dérivaient sans bruit — plusieurs
apps tournaient encore sur un `dist` d'avril. C'est maintenant scripté :

```bash
pnpm vendor:list    # la carte : qui embarque quoi, sous quelle forme
pnpm vendor:check   # ne touche à rien, sort en 1 si une copie a dérivé
pnpm vendor:sync    # build + pousse la source canonique dans chaque copie
```

`vendor:sync` découvre les copies en parcourant la suite (pas de liste en dur : une
nouvelle app est prise en compte toute seule), reconstruit les packages, puis recopie :

| | ce qui est recopié |
|---|---|
| copie `dist` (la majorité) | `dist/`, `styles.d.ts` |
| copie `src+dist` (Noesium en workspace pnpm, Socialum, UmbeliumManager) | `src/`, `dist/`, `styles.d.ts` |
| `package.json` | seulement la **forme** : `version`, `exports`, `main`, `module`, `types`, `files`, `peerDependencies` |

Les **dépendances d'une copie ne sont jamais écrasées** : une copie vendorisée en déclare
volontairement moins que le canon (react, lucide-react… viennent de l'app hôte au moment du
bundling), et recopier une dep interne y installerait `"@umbeli-com/ui": "workspace:^"`
dans un contexte `file:` sans workspace, ce qui casse net l'install.

Filtres utiles : `pnpm vendor:sync -- --package ui --app Webum --dry-run`.

Après un `vendor:sync`, **committer le repo de chaque app touchée** — les copies sont
suivies par git dans chaque app.

### Versions et publication

`publish.yml` saute un package dont la version existe déjà sur le registry. C'est correct,
mais c'était silencieux : les cinq packages sont restés en `1.0.0` pendant des dizaines de
commits de features, le job passait au vert **sans rien livrer**. Le release échoue
maintenant explicitement quand le `src/` d'un package a bougé depuis son dernier bump :

```bash
node scripts/check-versions.mjs               # que faut-il bumper ?
node scripts/check-versions.mjs --bump minor  # bumper les packages concernés
```

## Développement

```bash
# Lancer le build en mode watch
pnpm dev

# Build de production
pnpm build

# Lint
pnpm lint
```

## Design Tokens

Les design tokens (couleurs, typography, spacing, etc.) sont définis dans `@umbeli-com/ui/src/styles/settings/` et peuvent être importés dans vos fichiers SCSS:

```scss
@use '@umbeli-com/ui/src/styles/settings' as *;

.my-component {
  color: $color-brand-primary;
  padding: $spacing-4;
  border-radius: $radius-md;
}
```

## Ajouter un nouveau composant

1. Créer `packages/<pkg>/src/components/NomComposant/` avec :
   - `NomComposant.tsx` — le composant. **Il n'importe jamais son propre `.scss`**, et
     jamais `@umbeli-com/<son propre package>` (un import auto-référent casse le build des
     apps ; quatre composants en souffraient).
   - `NomComposant.scss` — les styles. Uniquement des `var(--theme-color-*)` avec fallback,
     jamais de hex en dur : c'est ce qui fait marcher le mode sombre sans bloc dédié.
   - `index.ts` — réexporte le composant **et ses types de props**.
2. Exporter dans `packages/<pkg>/src/components/index.ts`.
3. Ajouter `@use '../components/NomComposant/NomComposant';` dans
   `packages/<pkg>/src/styles/index.scss` — sinon le composant est livré sans style.
   `node scripts/check-styles.mjs` (aussi lancé en CI) refuse une feuille orpheline.
4. Bumper la version du package (voir ci-dessus), puis `pnpm vendor:sync`.

Toute chaîne visible par l'utilisateur doit être surchargeable via une prop `labels` /
`translations`, avec le français par défaut.

## License

MIT
