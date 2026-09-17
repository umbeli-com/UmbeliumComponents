/**
 * `@umbeli-com/auth/form` — le formulaire d'authentification et ses briques,
 * SANS `AuthPageLayout` ni `AuthPages.css` (voir core.ts). Les classes
 * `auth-page__*` émises par défaut ne sont alors stylées que si l'app charge
 * `@umbeli-com/auth/styles` — ou les renomme via `classNames`.
 */
export * from './components/AuthForm';
export { GoogleOAuthButton } from './components/GoogleOAuthButton';
export type { GoogleOAuthButtonProps } from './components/GoogleOAuthButton';
export { AuthHeader } from './components/AuthHeader';
export type { AuthHeaderProps } from './components/AuthHeader';
export * from './core';
