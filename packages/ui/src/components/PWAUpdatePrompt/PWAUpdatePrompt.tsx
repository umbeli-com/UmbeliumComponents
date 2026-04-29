import { Button } from '../Button';

interface PWAUpdatePromptProps {
  isVisible: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
  labels?: {
    message?: string;
    update?: string;
    later?: string;
  };
}

const defaultLabels = {
  message: 'A new version of this page is available',
  update: 'Update',
  later: 'Later',
};

export function PWAUpdatePrompt({ isVisible, onUpdate, onDismiss, labels = {} }: PWAUpdatePromptProps) {
  if (!isVisible) return null;

  const t = { ...defaultLabels, ...labels };

  return (
    <div className="pwa-update-toast" role="status" aria-live="polite">
      <span className="pwa-update-toast__message">{t.message}</span>
      <div className="pwa-update-toast__actions">
        <Button variant="primary" size="sm" onClick={onUpdate}>
          {t.update}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          {t.later}
        </Button>
      </div>
    </div>
  );
}

export default PWAUpdatePrompt;
