import { useEffect, useRef } from 'react';
import type { GuardNavigate } from './types';
import { clearIntendedPath, stashIntendedPath } from './intendedPath';

interface GuardRedirectParams {
  /** `true` dès que la garde a DÉCIDÉ de rediriger (jamais pendant `loading`). */
  active: boolean;
  /** Destination de la redirection. */
  to: string;
  navigate?: GuardNavigate;
  /** `true` quand un composant `Navigate` prend la redirection en charge. */
  declarative: boolean;
  /** Chemin à mémoriser pour le retour après connexion. */
  from?: string;
  /** Efface le chemin mémorisé une fois la redirection engagée. */
  consumeIntended?: boolean;
  storageKey?: string;
}

/**
 * Effet de redirection commun aux gardes.
 *
 * - ne navigue JAMAIS pendant le rendu : la navigation vit dans un effet ;
 * - ne rejoue pas la même redirection si l'app repasse une fonction `navigate`
 *   non mémoïsée (un `navigate` recréé à chaque rendu bouclerait sinon).
 */
export function useGuardRedirect({
  active,
  to,
  navigate,
  declarative,
  from,
  consumeIntended = false,
  storageKey,
}: GuardRedirectParams): void {
  const navigateRef = useRef<GuardNavigate | undefined>(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  /** Signature de la dernière redirection engagée, pour ne pas la rejouer. */
  const handledRef = useRef<string | null>(null);
  /** Signature dont le chemin a déjà été mémorisé (une seule écriture). */
  const stashedRef = useRef<string | null>(null);
  /** Signature déjà signalée en console, pour ne pas répéter l'avertissement. */
  const warnedRef = useRef<string | null>(null);

  /**
   * Booléen STABLE : une app qui recrée sa fonction `navigate` à chaque rendu
   * ne relance pas l'effet, mais un `navigate` qui arrive tardivement (routeur
   * monté après coup) le relance une fois — sinon la garde resterait bloquée
   * sur son placeholder pour toujours.
   */
  const hasNavigate = Boolean(navigate);

  useEffect(() => {
    if (!active) {
      handledRef.current = null;
      stashedRef.current = null;
      warnedRef.current = null;
      return;
    }

    const signature = `${to}|${from ?? ''}`;
    if (handledRef.current === signature) return;

    if (stashedRef.current !== signature) {
      stashedRef.current = signature;
      if (from) stashIntendedPath(from, storageKey);
      if (consumeIntended) clearIntendedPath(storageKey);
    }

    // Mode déclaratif : le <Navigate> rendu par la garde fait le travail.
    if (declarative) {
      handledRef.current = signature;
      return;
    }

    const go = navigateRef.current;
    if (!go) {
      // PAS de `handledRef` ici : la redirection n'a pas eu lieu, elle doit
      // pouvoir partir si l'app finit par fournir `navigate`.
      if (warnedRef.current !== signature && typeof console !== 'undefined') {
        warnedRef.current = signature;
        console.warn(
          `[@umbeli-com/auth] Redirection vers « ${to} » impossible : passez la prop ` +
            '`navigate` (routeur maison) ou `Navigate` (react-router) à la garde.',
        );
      }
      return;
    }

    handledRef.current = signature;
    go(to, { replace: true, state: from ? { from } : undefined });
  }, [active, to, declarative, from, consumeIntended, storageKey, hasNavigate]);
}
