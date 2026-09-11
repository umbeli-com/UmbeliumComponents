import { ReactNode, useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, type ModalLabels, type ModalTestIds } from './Modal';
// Styles are imported separately via @umbeli-com/ui/styles

/**
 * Demande de confirmation.
 *
 * Remplace les `confirm()` du navigateur : ceux-ci sortent de l'application,
 * ne se traduisent pas, ne disent jamais ce qui va réellement se passer, et sur
 * mobile s'affichent comme une alerte système qu'on balaie sans lire. Ici le
 * texte explique la conséquence, l'action porte son vrai nom (« Supprimer »,
 * pas « OK ») et Échap annule.
 *
 * Les boutons sont des `<button class="button …">` natifs plutôt que le
 * composant `Button` : ce dernier ne transmet pas de `ref`, et sans ref on ne
 * peut pas poser le focus initial sur l'action. Les classes sont celles de
 * Button.scss, donc le rendu reste strictement identique.
 *
 * Migrer un `window.confirm()` casse en silence les specs Playwright qui
 * l'attrapaient par `page.on('dialog', …)` : le gestionnaire n'est plus
 * appelé, la promesse ne se résout jamais, le test expire. `testIds` donne aux
 * specs de quoi viser les boutons — c'est la moitié manquante de la migration.
 */

/**
 * `data-testid` des points d'accroche. Hérite de ceux de la fenêtre
 * (`root`, `title`, `close`, `backdrop`) et ajoute les siens.
 * Aucun défaut : voir `ModalTestIds`.
 */
export interface ConfirmTestIds extends ModalTestIds {
  /**
   * Sur le bouton qui confirme — celui que remplaçait `dialog.accept()`.
   * (`close`, hérité, ne sert à rien ici : la confirmation force
   * `showCloseButton={false}`, il n'y a pas de croix à viser.)
   */
  confirm?: string;
  /** Sur le bouton qui annule — celui que remplaçait `dialog.dismiss()`. */
  cancel?: string;
  /** Sur la saisie de sécurité (`typeToConfirm`). */
  input?: string;
}

export interface ConfirmRequest {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Action destructrice : bouton rouge et pictogramme d'alerte. */
  danger?: boolean;
  /** Si fourni, l'utilisateur doit saisir ce texte exact pour confirmer. */
  typeToConfirm?: string;
  /**
   * `data-testid` propres à CETTE question, par-dessus ceux du composant.
   * Une app qui pose six confirmations depuis un seul `<ConfirmProvider>` peut
   * ainsi garder un identifiant distinct par question.
   */
  testIds?: ConfirmTestIds;
}

export interface ConfirmLabels extends ModalLabels {
  /** Défaut : « Annuler ». */
  cancel?: string;
  /** Défaut : « Confirmer ». */
  confirm?: string;
  /** Défaut : « En cours… ». */
  busy?: string;
  /** Consigne de la saisie de sécurité. Défaut : « Saisissez … pour confirmer ». */
  typeToConfirmHint?: (expected: string) => ReactNode;
}

const defaultConfirmLabels: {
  cancel: string;
  confirm: string;
  busy: string;
  typeToConfirmHint: (expected: string) => ReactNode;
} = {
  cancel: 'Annuler',
  confirm: 'Confirmer',
  busy: 'En cours…',
  typeToConfirmHint: (expected: string) => (
    <>
      Saisissez <strong className="umb-confirm__type-target">{expected}</strong> pour confirmer
    </>
  ),
};

export interface ConfirmDialogProps {
  /** `null` = fermée. Ce sont des données pures : le geste vit dans `onConfirm`. */
  request: ConfirmRequest | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  /**
   * Erreur levée par `onConfirm`. Sans ce gestionnaire l'erreur est relancée
   * plutôt qu'avalée — un échec silencieux serait pire qu'une trace console.
   */
  onError?: (error: unknown) => void;
  labels?: ConfirmLabels;
  /** `data-testid` par défaut de toutes les questions ; `request.testIds` prime. */
  testIds?: ConfirmTestIds;
  className?: string;
}

export function ConfirmDialog({
  request,
  onClose,
  onConfirm,
  onError,
  labels = {},
  testIds,
  className = '',
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const needsTyping = Boolean(request?.typeToConfirm);

  // La remise à zéro suit la QUESTION, pas l'identité de l'objet : `request`
  // est très souvent un littéral reconstruit à chaque rendu du parent
  // (`request={open ? { title: … } : null}`). Dépendre de son identité vidait
  // la saisie de sécurité et surtout remettait `busy` à false au moindre
  // rendu du parent pendant un `onConfirm` en vol — le bouton se réactivait et
  // la suppression pouvait partir deux fois.
  const isOpen = request != null;
  const questionKey = request?.title;
  const expectedKey = request?.typeToConfirm;
  useEffect(() => {
    setTyped('');
    setBusy(false);
  }, [isOpen, questionKey, expectedKey]);

  const t = { ...defaultConfirmLabels, ...labels };
  // La question l'emporte sur le réglage global : une app peut nommer
  // « account-delete-confirm » une confirmation et « billing-cancel-confirm »
  // la suivante sans changer de fournisseur.
  const tid: ConfirmTestIds = { ...testIds, ...request?.testIds };
  const canConfirm = !busy && (!needsTyping || typed.trim() === request?.typeToConfirm);

  const run = async () => {
    if (!canConfirm) return;
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      setBusy(false);
      if (onError) onError(error);
      else throw error;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      role="alertdialog"
      showCloseButton={false}
      closeOnBackdrop={!busy}
      closeOnEscape={!busy}
      // Le focus part sur l'action (ou sur la saisie de sécurité quand il y en
      // a une) : on peut répondre au clavier sans viser.
      initialFocusRef={needsTyping ? inputRef : confirmRef}
      title={request?.title}
      labels={labels}
      testIds={tid}
      className={`umb-confirm${className ? ` ${className}` : ''}`}
      footer={
        <>
          <button
            type="button"
            className="button button--ghost button--sm"
            onClick={onClose}
            disabled={busy}
            data-testid={tid.cancel}
          >
            {request?.cancelLabel ?? t.cancel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`button button--primary button--sm umb-confirm__action${
              request?.danger ? ' umb-confirm__action--danger' : ''
            }`}
            onClick={() => {
              void run();
            }}
            disabled={!canConfirm}
            data-testid={tid.confirm}
          >
            {busy ? t.busy : (request?.confirmLabel ?? t.confirm)}
          </button>
        </>
      }
    >
      <div className="umb-confirm__content">
        {request?.danger && (
          <AlertTriangle size={22} className="umb-confirm__icon" aria-hidden="true" />
        )}
        <div className="umb-confirm__text">
          {request?.body && <p className="umb-confirm__body">{request.body}</p>}
          {needsTyping && request?.typeToConfirm && (
            <label className="umb-confirm__type-label">
              {t.typeToConfirmHint(request.typeToConfirm)}
              <input
                ref={inputRef}
                className="umb-modal__input"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void run();
                  }
                }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={busy}
                data-testid={tid.input}
              />
            </label>
          )}
        </div>
      </div>
    </Modal>
  );
}
