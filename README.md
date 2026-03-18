# UmbeliumComponents

Monorepo de composants React réutilisables pour les applications SaaS Umbeli.

## Structure

```
UmbeliumComponents/
├── packages/
│   ├── ui/          # @umbeli-com/ui - Composants UI génériques
│   └── layout/      # @umbeli-com/layout - Composants de layout
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
