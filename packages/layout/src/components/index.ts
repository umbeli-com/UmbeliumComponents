// `export *` plutôt qu'une liste nominative : les types de props étaient
// exportés par chaque index.ts de composant mais pas par ce baril, donc
// invisibles depuis `@umbeli-com/layout` (Scrapium ne pouvait pas typer son
// renderLink contre NavItem/NavIcon et retombait sur LucideIcon).
export * from './PageHeader';
export * from './GridSection';
export * from './AppShell';
export * from './SidebarNav';
export * from './Topbar';
