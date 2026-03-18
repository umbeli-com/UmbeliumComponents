# @umbeli-com/layout

Composants de layout React réutilisables pour les applications SaaS Umbeli.

## Installation

```bash
pnpm add @umbeli-com/layout
```

## Composants

### PageHeader

```tsx
import { PageHeader } from '@umbeli-com/layout';
import { Button } from '@umbeli-com/ui';

<PageHeader
  title="Dashboard"
  subtitle="Vue d'ensemble de vos performances"
  period="7 derniers jours"
  actions={<Button>Exporter</Button>}
/>
```

**Props:**
- `title`: string (required)
- `subtitle`: string
- `period`: string
- `actions`: ReactNode

### GridSection

```tsx
import { GridSection } from '@umbeli-com/layout';
import { Card } from '@umbeli-com/ui';

<GridSection title="Statistiques" columns={3} gap="md">
  <Card>Card 1</Card>
  <Card>Card 2</Card>
  <Card>Card 3</Card>
</GridSection>
```

**Props:**
- `title`: string
- `columns`: number (default: `12`)
- `gap`: `'sm'` | `'md'` | `'lg'` (default: `'md'`)
- `className`: string

## Styles

Import styles in your app entry point:

```tsx
import '@umbeli-com/layout/styles';
```

## Dépendances

Ce package dépend de `@umbeli-com/ui` pour les design tokens.
