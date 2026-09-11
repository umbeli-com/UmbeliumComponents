import {
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
// Styles are imported separately via @umbeli-com/ui/styles

/**
 * Fenêtre modale canonique de la suite.
 *
 * Sept applications réimplémentaient chacune leur `.modal-overlay` : aucune ne
 * verrouillait le défilement de la page, aucune ne piégeait le focus, et le
 * focus ne revenait jamais au bouton qui avait ouvert la fenêtre. Cette version
 * fait les quatre choses que l'on n'a pas envie de réécrire sept fois : portail
 * dans `<body>`, verrou de défilement empilable, piège à focus, et `Échap` qui
 * ne ferme que la modale du dessus.
 *
 * Toutes les options ajoutées après la v1 (`testIds`, `width`/`maxWidth`,
 * `headerActions`, `backdropBlur`…) sont facultatives ET sans effet tant
 * qu'elles ne sont pas passées : sans elles, le DOM produit est exactement
 * celui d'avant, attribut par attribut.
 */

/** `'full'` : aucune largeur maximale — la fenêtre occupe le voile moins sa marge. */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Longueur CSS libre : un nombre est interprété en pixels, une chaîne est
 * reprise telle quelle (`'min(1100px, 100%)'`, `'86vh'`, `'18px'`…).
 */
export type ModalLength = number | string;

/**
 * `data-testid` posés sur les points d'accroche de la fenêtre.
 *
 * Aucun défaut : un identifiant inventé par le paquet se serait invité dans les
 * suites des apps déjà en production (collision `strict mode` de Playwright).
 * Chaque app apporte les siens — ce sont eux qui figurent déjà dans ses specs.
 */
export interface ModalTestIds {
  /** Sur la fenêtre elle-même (l'élément qui porte `role="dialog"`). */
  root?: string;
  /** Sur le titre. */
  title?: string;
  /** Sur la croix de fermeture. */
  close?: string;
  /** Sur le voile — pour cliquer « à côté » sans viser des coordonnées. */
  backdrop?: string;
}

export interface ModalLabels {
  /** aria-label du bouton de fermeture. Défaut : « Fermer ». */
  close?: string;
  /** aria-label de la fenêtre quand aucun `title` n'est fourni. Défaut : « Fenêtre de dialogue ». */
  dialog?: string;
}

const defaultModalLabels: Required<ModalLabels> = {
  close: 'Fermer',
  dialog: 'Fenêtre de dialogue',
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Titre : câblé à `aria-labelledby`. Sans titre, `labels.dialog` sert d'`aria-label`. */
  title?: ReactNode;
  size?: ModalSize;
  /** Barre d'actions, rendue collée en bas de la fenêtre. */
  footer?: ReactNode;
  /**
   * Actions rendues dans l'en-tête, à gauche de la croix (copier, plein écran,
   * imprimer…). Sans elles l'en-tête garde exactement sa structure d'origine :
   * le conteneur d'actions n'est créé que s'il a quelque chose à contenir.
   */
  headerActions?: ReactNode;
  /** Clic sur le fond = fermeture (défaut : true). */
  closeOnBackdrop?: boolean;
  /** Échap = fermeture (défaut : true). */
  closeOnEscape?: boolean;
  /** Croix de fermeture dans l'en-tête (défaut : true). */
  showCloseButton?: boolean;
  /**
   * Voile flouté. `true` = 2px ; un nombre ou une chaîne fixe le rayon
   * (`4`, `'2px'`). `undefined`, `false`, `0` et `''` = aucun flou. Défaut :
   * aucun flou, le voile reste une simple opacité.
   */
  backdropBlur?: boolean | ModalLength;
  /**
   * Largeur de base (défaut : 100 % du voile moins sa marge). ATTENTION : les
   * tailles nommées sont des `max-width`, et `max-width` borne toujours
   * `width` — `width` ne peut donc que RÉTRÉCIR la fenêtre sous `size`, jamais
   * l'élargir. Pour dépasser la taille nommée, c'est `maxWidth` qu'il faut
   * poser (ou `size="full"`), seul ou avec `width`.
   */
  width?: ModalLength;
  /** Largeur maximale — remplace celle de `size`. C'est elle qui élargit. */
  maxWidth?: ModalLength;
  /** Hauteur imposée : `height={'min(86vh, 100%)'}` pour une fenêtre « atelier ». */
  height?: ModalLength;
  /**
   * Hauteur maximale — remplace `calc(100vh - 48px)`, et aussi le
   * `calc(100vh - 24px)` du palier mobile (un style inline l'emporte sur la
   * requête média) : donner une mesure en `vh` plutôt qu'en pixels.
   */
  maxHeight?: ModalLength;
  /** Rayon des coins. Défaut : 16px (feuille de style). */
  radius?: ModalLength;
  /** `alertdialog` pour une décision bloquante (voir ConfirmDialog). */
  role?: 'dialog' | 'alertdialog';
  /**
   * Élément à focaliser à l'ouverture. Signature structurelle plutôt que
   * `RefObject` : les types de ref divergent entre React 18 et 19.
   */
  initialFocusRef?: { current: HTMLElement | null };
  /** Hôte du portail (défaut : `document.body`). */
  container?: HTMLElement | null;
  className?: string;
  labels?: ModalLabels;
  /** `data-testid` du contrat e2e. Aucun n'est posé tant qu'on n'en donne pas. */
  testIds?: ModalTestIds;
  children?: ReactNode;
}

/** `style` acceptant les variables CSS — React ne les type pas nativement. */
type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>;

function cssLength(value: ModalLength): string {
  return typeof value === 'number' ? `${value}px` : value;
}

// ── Verrou de défilement empilable ──────────────────────────────────────────
// Deux modales superposées ne doivent pas se marcher dessus : seule la
// dernière relâche, et elle restaure la valeur d'origine (qui n'est pas
// forcément la chaîne vide — une app peut déjà bloquer le scroll elle-même).
let scrollLockCount = 0;
let previousBodyOverflow = '';

function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => undefined;
  if (scrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) {
      document.body.style.overflow = previousBodyOverflow;
      previousBodyOverflow = '';
    }
  };
}

// ── Pile de modales ─────────────────────────────────────────────────────────
// Échap et le piège à focus n'appartiennent qu'à la modale du dessus.
const modalStack: string[] = [];

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('aria-hidden') && el.getClientRects().length > 0,
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  footer,
  headerActions,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  backdropBlur,
  width,
  maxWidth,
  height,
  maxHeight,
  radius,
  role = 'dialog',
  initialFocusRef,
  container,
  className = '',
  labels = {},
  testIds = {},
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const backdropPressRef = useRef(false);

  // `onClose` est souvent une lambda inline, `initialFocusRef` peut changer
  // d'identité (ConfirmDialog vise la saisie ou l'action selon le cas) et
  // `closeOnEscape` bascule en cours de route (ConfirmDialog passe `!busy`) :
  // on lit les trois via des refs pour que l'effet d'ouverture ne se rejoue
  // pas. Le rejouer relâcherait puis reprendrait le verrou de défilement (saut
  // de page) et surtout ferait repasser le focus par l'élément d'origine, HORS
  // de la fenêtre — le bouton d'action étant désactivé pendant `busy`, le focus
  // ne revenait jamais.
  const onCloseRef = useRef(onClose);
  const initialFocusRefRef = useRef(initialFocusRef);
  const closeOnEscapeRef = useRef(closeOnEscape);
  useEffect(() => {
    onCloseRef.current = onClose;
    initialFocusRefRef.current = initialFocusRef;
    closeOnEscapeRef.current = closeOnEscape;
  });

  const instanceId = useId();
  const titleId = `${instanceId}-title`;

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const releaseScroll = lockBodyScroll();
    modalStack.push(instanceId);

    // Un tour de boucle pour laisser le portail se monter avant de viser.
    const focusTimer = window.setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const target = initialFocusRefRef.current?.current ?? getFocusable(dialog)[0] ?? dialog;
      target.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== instanceId) return;

      if (event.key === 'Escape') {
        if (!closeOnEscapeRef.current) return;
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = getFocusable(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!active || !dialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown, true);

      const index = modalStack.indexOf(instanceId);
      if (index !== -1) modalStack.splice(index, 1);

      releaseScroll();

      const previous = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      if (previous && previous.isConnected) previous.focus();
    };
  }, [isOpen, instanceId]);

  // Le clic ne ferme que si le geste a COMMENCÉ sur le fond : sélectionner du
  // texte dans la fenêtre et relâcher à côté ne doit pas tout fermer.
  const handleBackdropMouseDown = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    backdropPressRef.current = event.target === event.currentTarget;
  }, []);

  const handleBackdropClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const startedOnBackdrop = backdropPressRef.current;
      backdropPressRef.current = false;
      if (!closeOnBackdrop || !startedOnBackdrop) return;
      if (event.target !== event.currentTarget) return;
      onClose();
    },
    [closeOnBackdrop, onClose],
  );

  if (!isOpen || typeof document === 'undefined') return null;

  const t = { ...defaultModalLabels, ...labels };
  const host = container ?? document.body;
  const hasHeader = Boolean(title) || showCloseButton || Boolean(headerActions);

  // Le flou est une option : sans elle, ni classe ni style inline — le voile
  // reste l'élément à un seul attribut `class` qu'il a toujours été.
  // Toute valeur vide — absente, `false`, mais aussi `0` ou `''` — laisse le
  // voile nu : `backdrop-filter: blur(0)` coûterait quand même un contexte
  // d'empilement et une couche de composition pour zéro pixel de flou.
  const blurOn = Boolean(backdropBlur);
  const blurLength: ModalLength | undefined =
    typeof backdropBlur === 'number' || typeof backdropBlur === 'string'
      ? backdropBlur
      : undefined;
  const backdropStyle: StyleWithVars | undefined =
    blurOn && blurLength !== undefined
      ? { '--umb-modal-backdrop-blur': cssLength(blurLength) }
      : undefined;

  // Les mesures libres passent en style inline, donc au-dessus de `size` : rien
  // n'est écrit tant qu'on n'en demande pas, et `style` reste alors absent.
  const dialogStyle: CSSProperties = {};
  if (width !== undefined) dialogStyle.width = width;
  if (maxWidth !== undefined) dialogStyle.maxWidth = maxWidth;
  if (height !== undefined) dialogStyle.height = height;
  if (maxHeight !== undefined) dialogStyle.maxHeight = maxHeight;
  if (radius !== undefined) dialogStyle.borderRadius = radius;
  const hasDialogStyle = Object.keys(dialogStyle).length > 0;

  const closeButton = showCloseButton ? (
    <button
      type="button"
      className="umb-modal__close"
      onClick={onClose}
      aria-label={t.close}
      title={t.close}
      data-testid={testIds.close}
    >
      <X size={16} aria-hidden="true" />
    </button>
  ) : null;

  return createPortal(
    <div
      className={`umb-modal__backdrop${blurOn ? ' umb-modal__backdrop--blur' : ''}`}
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
      style={backdropStyle}
      data-testid={testIds.backdrop}
    >
      <div
        ref={dialogRef}
        className={`umb-modal umb-modal--${size}${className ? ` ${className}` : ''}`}
        role={role}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : t.dialog}
        tabIndex={-1}
        style={hasDialogStyle ? dialogStyle : undefined}
        data-testid={testIds.root}
      >
        {hasHeader && (
          <div className="umb-modal__header">
            {title ? (
              <h2 className="umb-modal__title" id={titleId} data-testid={testIds.title}>
                {title}
              </h2>
            ) : (
              <span className="umb-modal__title" aria-hidden="true" />
            )}
            {headerActions ? (
              <div className="umb-modal__header-actions">
                {headerActions}
                {closeButton}
              </div>
            ) : (
              closeButton
            )}
          </div>
        )}

        <div className="umb-modal__body">{children}</div>

        {footer && <div className="umb-modal__footer">{footer}</div>}
      </div>
    </div>,
    host,
  );
}
