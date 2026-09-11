import {
  ReactElement,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ConfirmDialog, type ConfirmLabels, type ConfirmRequest } from './ConfirmDialog';

/**
 * Confirmations sans passer par le navigateur.
 *
 * `window.confirm()` sort de l'application : fenêtre système non traduisible,
 * bouton « OK » qui ne dit pas ce qu'il fait, et sur mobile une alerte qu'on
 * balaie sans lire. Ces crochets rendent le remplacement tenable page par
 * page : une ligne pour l'obtenir, une ligne pour poser la question.
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Supprimer ce site ?', danger: true })) …
 */

export type ConfirmFn = (request: ConfirmRequest) => Promise<boolean>;

/**
 * Version locale, sans fournisseur : le composant rend `dialog` lui-même.
 * C'est le chemin de migration direct depuis les `useDialogs()` maison.
 */
export function useConfirmDialog(labels?: ConfirmLabels): {
  confirm: ConfirmFn;
  dialog: ReactElement;
} {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setRequest(null);
    resolve?.(value);
  }, []);

  // Démontage pendant qu'une question est ouverte (navigation, fermeture d'un
  // panneau) : la promesse doit se résoudre, sinon le `await confirm(…)` de
  // l'appelant reste suspendu pour toujours et son `finally` ne s'exécute
  // jamais. On répond « non » sans toucher à l'état — le composant part.
  useEffect(
    () => () => {
      const resolve = resolveRef.current;
      resolveRef.current = null;
      resolve?.(false);
    },
    [],
  );

  const confirm = useCallback<ConfirmFn>((next) => {
    // Une question encore ouverte est répondue « non » avant d'en poser une
    // autre : sans cela sa promesse ne se résoudrait jamais.
    resolveRef.current?.(false);
    resolveRef.current = null;
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setRequest(next);
    });
  }, []);

  const dialog = (
    <ConfirmDialog
      request={request}
      onClose={() => settle(false)}
      onConfirm={() => settle(true)}
      labels={labels}
    />
  );

  return { confirm, dialog };
}

const ConfirmContext = createContext<ConfirmFn | null>(null);

export interface ConfirmProviderProps {
  children: ReactNode;
  /** Libellés par défaut de toutes les confirmations de l'application. */
  labels?: ConfirmLabels;
}

/** À poser une fois, haut dans l'arbre. Rend la fenêtre partagée. */
export function ConfirmProvider({ children, labels }: ConfirmProviderProps) {
  const { confirm, dialog } = useConfirmDialog(labels);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog}
    </ConfirmContext.Provider>
  );
}

/** Renvoie `confirm(request): Promise<boolean>`. Exige un `<ConfirmProvider>`. */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error(
      'useConfirm() doit être appelé sous un <ConfirmProvider>. ' +
        'Pour un usage local sans fournisseur, utilisez useConfirmDialog().',
    );
  }
  return confirm;
}
