import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
// Styles are imported separately via @umbeli-com/ui/styles

/**
 * Pile de notifications de la suite.
 *
 * Remplace les huit copies locales (Webum `useDialogs`, Socialum
 * `components/ui/use-toast`, …) et le stub `use-toast.ts` qui se contentait
 * d'un `console.log` : les retours d'action partaient dans la console et
 * l'utilisateur ne voyait rien.
 *
 * Deux formes d'appel sont acceptées, parce que les deux existent déjà dans
 * les apps :
 *   toast('Enregistré', 'success')                        // forme Webum
 *   toast({ title, description, variant: 'destructive' }) // forme du stub
 */

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

/** Forme héritée du stub — conservée telle quelle pour ne rien casser. */
export type ToastVariant = 'default' | 'destructive';

export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

export interface ToastOptions {
  /** Ligne principale (gras). La forme chaîne alimente ce champ. */
  title?: string;
  /** Ligne secondaire, optionnelle. */
  description?: string;
  /** Compat stub : 'destructive' est traduit en `kind: 'error'`. */
  variant?: ToastVariant;
  /** Prioritaire sur `variant` ; ignoré si un `kind` est passé en 2e argument. */
  kind?: ToastKind;
  /** Durée d'affichage en ms ; 0 ou Infinity => le toast reste jusqu'au clic. */
  duration?: number;
}

/** Un toast tel que rendu dans la pile. */
export interface ToastRecord {
  id: string;
  kind: ToastKind;
  title?: string;
  description?: string;
}

/** Durées d'auto-fermeture par nature de message (ms). */
export interface ToastDurations {
  info?: number;
  success?: number;
  warning?: number;
  error?: number;
}

/** Chaînes visibles/annoncées — défauts FR, surchargeables par l'app. */
export interface ToastLabels {
  /** aria-label du bouton de fermeture. */
  dismiss?: string;
  /** aria-label de la région qui contient la pile. */
  region?: string;
  info?: string;
  success?: string;
  warning?: string;
  error?: string;
}

/** Signature surchargée : les deux formes d'appel sont typées. */
export interface ToastFn {
  (message: string, kind?: ToastKind): string;
  (options: ToastOptions): string;
}

export interface ToastContextValue {
  /** Affiche un toast et renvoie son id (à passer à `dismiss`). */
  toast: ToastFn;
  /** Alias de la signature Webum `showToast(msg, kind)`. */
  showToast: (message: string, kind?: ToastKind) => string;
  success: (input: string | ToastOptions) => string;
  error: (input: string | ToastOptions) => string;
  info: (input: string | ToastOptions) => string;
  warning: (input: string | ToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export interface ToastProviderProps {
  children: ReactNode;
  /** Coin d'ancrage de la pile (défaut : 'top-right'). */
  position?: ToastPosition;
  /** Surcharge des durées ; les erreurs restent plus longtemps par défaut. */
  durations?: ToastDurations;
  /** Nombre de toasts visibles simultanément (défaut : 5). */
  max?: number;
  labels?: ToastLabels;
  /** Classe ajoutée au conteneur de la pile. */
  className?: string;
  /** Cible du portail (défaut : `document.body`). */
  container?: HTMLElement | null;
}

const defaultDurations: Required<ToastDurations> = {
  info: 3000,
  success: 3000,
  warning: 4500,
  error: 6000,
};

const defaultLabels: Required<ToastLabels> = {
  dismiss: 'Fermer',
  region: 'Notifications',
  info: 'Information',
  success: 'Succès',
  warning: 'Avertissement',
  error: 'Erreur',
};

let sequence = 0;

function nextId(): string {
  sequence += 1;
  return `umb-toast-${sequence}`;
}

/** Normalise les deux formes d'appel en un enregistrement unique. */
function toRecord(input: string | ToastOptions, kind?: ToastKind): ToastRecord & { duration?: number } {
  const options: ToastOptions = typeof input === 'string' ? { title: input } : input;
  const resolved: ToastKind =
    kind ?? options.kind ?? (options.variant === 'destructive' ? 'error' : 'info');

  return {
    id: nextId(),
    kind: resolved,
    title: options.title,
    description: options.description,
    duration: options.duration,
  };
}

// ── Repli hors provider ───────────────────────────────────────────────────
// Les apps appellent `useToast()` depuis des écrans qui ne sont pas tous sous
// <ToastProvider> le jour de la migration. Plutôt que de planter, on garde le
// comportement historique du stub (console) et on prévient une fois.

let warnedOutsideProvider = false;

function warnOutsideProvider(): void {
  if (warnedOutsideProvider) return;
  warnedOutsideProvider = true;
  console.warn(
    "[@umbeli-com/ui] useToast() appelé hors de <ToastProvider> : les messages partent dans la console. Enveloppez l'application avec <ToastProvider>.",
  );
}

function consoleToast(input: string | ToastOptions, kind?: ToastKind): string {
  warnOutsideProvider();
  const record = toRecord(input, kind);
  const line = [record.title, record.description].filter(Boolean).join(' : ');
  if (record.kind === 'error') {
    console.error(`[Toast Error] ${line}`);
  } else {
    console.log(`[Toast] ${line}`);
  }
  return record.id;
}

const fallbackContext: ToastContextValue = {
  toast: consoleToast,
  showToast: (message, kind) => consoleToast(message, kind),
  success: (input) => consoleToast(input, 'success'),
  error: (input) => consoleToast(input, 'error'),
  info: (input) => consoleToast(input, 'info'),
  warning: (input) => consoleToast(input, 'warning'),
  dismiss: () => warnOutsideProvider(),
  dismissAll: () => warnOutsideProvider(),
};

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastIcon({ kind }: { kind: ToastKind }) {
  switch (kind) {
    case 'success':
      return <CheckCircle2 size={16} aria-hidden="true" />;
    case 'warning':
      return <AlertTriangle size={16} aria-hidden="true" />;
    case 'error':
      return <XCircle size={16} aria-hidden="true" />;
    default:
      return <Info size={16} aria-hidden="true" />;
  }
}

export function ToastProvider({
  children,
  position = 'top-right',
  durations,
  max = 5,
  labels,
  className = '',
  container,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const timers = useRef(new Map<string, number>());

  const t = useMemo(() => ({ ...defaultLabels, ...labels }), [labels]);
  const delays = useMemo(() => ({ ...defaultDurations, ...durations }), [durations]);

  // `durations`/`max` arrivent le plus souvent en littéral inline : on les lit
  // via une ref pour que `push` reste stable et ne re-rende pas les consommateurs.
  // L'écriture se fait en effet, jamais pendant le rendu (rendu concurrent :
  // un rendu abandonné ne doit pas muter la ref).
  const delaysRef = useRef(delays);
  const maxRef = useRef(max);

  useEffect(() => {
    delaysRef.current = delays;
    maxRef.current = max;
  }, [delays, max]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Aucun timer ne doit survivre au démontage (setState sur composant démonté).
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    // Garde : sans elle, `filter` rendrait un tableau neuf même sans retrait,
    // et un timer en retard re-rendrait tout l'arbre pour rien.
    setToasts((prev) =>
      prev.some((item) => item.id === id) ? prev.filter((item) => item.id !== id) : prev,
    );
  }, []);

  const dismissAll = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
    setToasts((prev) => (prev.length ? [] : prev));
  }, []);

  const push = useCallback((input: string | ToastOptions, kind?: ToastKind): string => {
    const { duration, ...record } = toRecord(input, kind);
    const limit = Math.max(1, maxRef.current);

    setToasts((prev) => [record, ...prev].slice(0, limit));

    const delay = duration ?? delaysRef.current[record.kind];
    if (Number.isFinite(delay) && delay > 0) {
      const timer = window.setTimeout(() => {
        timers.current.delete(record.id);
        setToasts((prev) =>
          prev.some((item) => item.id === record.id)
            ? prev.filter((item) => item.id !== record.id)
            : prev,
        );
      }, delay);
      timers.current.set(record.id, timer);
    }

    return record.id;
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'info') => push(message, kind),
    [push],
  );
  const success = useCallback((input: string | ToastOptions) => push(input, 'success'), [push]);
  const error = useCallback((input: string | ToastOptions) => push(input, 'error'), [push]);
  const info = useCallback((input: string | ToastOptions) => push(input, 'info'), [push]);
  const warning = useCallback((input: string | ToastOptions) => push(input, 'warning'), [push]);

  const value = useMemo<ToastContextValue>(
    () => ({ toast: push, showToast, success, error, info, warning, dismiss, dismissAll }),
    [push, showToast, success, error, info, warning, dismiss, dismissAll],
  );

  const target = mounted
    ? (container ?? (typeof document !== 'undefined' ? document.body : null))
    : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {target
        ? createPortal(
            <div
              className={`umb-toast-viewport umb-toast-viewport--${position} ${className}`.trim()}
              role="region"
              aria-label={t.region}
            >
              {toasts.map((item) => (
                <div
                  key={item.id}
                  className={`umb-toast umb-toast--${item.kind}`}
                  role="status"
                  aria-live={item.kind === 'error' ? 'assertive' : 'polite'}
                  aria-atomic="true"
                >
                  <span className="umb-toast__icon">
                    <ToastIcon kind={item.kind} />
                  </span>
                  <div className="umb-toast__body">
                    <span className="umb-toast__kind">{t[item.kind]} :</span>
                    {item.title ? <p className="umb-toast__title">{item.title}</p> : null}
                    {item.description ? (
                      <p className="umb-toast__description">{item.description}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="umb-toast__close"
                    onClick={() => dismiss(item.id)}
                    aria-label={t.dismiss}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>,
            target,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  return context ?? fallbackContext;
}
