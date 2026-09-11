// Styles are imported separately via @umbeli-com/ui/styles

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  /** Taille de l'anneau (défaut : `md`). */
  size?: SpinnerSize;
  /** Texte lu par les lecteurs d'écran, masqué visuellement
   *  (défaut FR : « Chargement… »). */
  label?: string;
  className?: string;
}

const defaultLabels = {
  label: 'Chargement…',
};

export function Spinner({ size = 'md', label, className = '' }: SpinnerProps) {
  const t = label ?? defaultLabels.label;

  return (
    <span
      className={`spinner spinner--${size} ${className}`.trim()}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="spinner__ring" aria-hidden="true" />
      <span className="spinner__label">{t}</span>
    </span>
  );
}
