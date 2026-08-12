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

Les apps NE consomment PAS ce repo directement : chacune embarque une copie
`dist-only` du package (`"@umbeli-com/auth": "file:vendor/umbeli-components/auth"`).
Après un changement ici :

```bash
# 1. Builder le package modifié
cd packages/<pkg> && npm run build

# 2. Rsync le dist vers CHAQUE copie vendorisée
#    Emplacements connus (2026-08) :
#    Anonymum/vendor/umbeli-components/<pkg>
#    Dialum/vendor/umbeli-components/<pkg>
#    Monitorum/vendor/umbeli-components/<pkg>
#    Scrapium/vendor/umbeli-components/<pkg>
#    Webum/apps/admin/vendor/umbeli-components/<pkg>
#    Socialum/components/<pkg>   (⚠️ Socialum sert le SRC de son package layout)
rsync -a --delete packages/<pkg>/dist/ <app>/vendor/umbeli-components/<pkg>/dist/

# 3. Committer le repo de CHAQUE app synchronisée
```

Noesium consomme les packages en workspace pnpm (pas de vendor).

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

1. Créer le dossier dans `packages/ui/src/components/NomComposant/`
2. Créer les fichiers:
   - `NomComposant.tsx` - Composant React
   - `NomComposant.scss` - Styles
   - `index.ts` - Export
3. Exporter dans `packages/ui/src/components/index.ts`
4. Ajouter le style dans `packages/ui/src/styles/index.scss`

## License

MIT
