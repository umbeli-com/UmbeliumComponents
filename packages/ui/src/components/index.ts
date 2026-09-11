export { Button } from './Button';
export { Card } from './Card';
export { Icon } from './Icon';
export { Tabs } from './Tabs';
export { Skeleton } from './Skeleton';
export { KpiCard } from './KpiCard';
export { MiniChart } from './MiniChart';
export { CoachPanel } from './CoachPanel';
export { CoachFocusCard } from './CoachFocusCard';
export { ActionList } from './ActionList';
export { StreakCard } from './StreakCard';
export { BadgesCard } from './BadgesCard';
export { CalendarBoard } from './CalendarBoard';
export { DragDropUpload } from './DragDropUpload';
export { DetailedChart } from './DetailedChart';
export { OnboardingChat, type OnboardingData } from './OnboardingChat';
export { AIChatPanel } from './AIChatPanel';
export { LanguageSwitcher } from './LanguageSwitcher';
export { ThemeToggle } from './ThemeToggle';
export { PWAUpdatePrompt } from './PWAUpdatePrompt';

// --- Providers et primitives transverses ---
export { ThemeProvider, useTheme, applyTheme } from './ThemeProvider';
export type { Theme, ThemeProviderProps, ThemeContextValue } from './ThemeProvider';

export { ToastProvider, useToast } from './Toast';
export type {
  ToastContextValue, ToastDurations, ToastFn, ToastKind, ToastLabels,
  ToastOptions, ToastPosition, ToastProviderProps, ToastRecord, ToastVariant,
} from './Toast';

export { I18nProvider, I18nContext, useTranslation, createI18n } from './I18n';
export type {
  I18nProviderProps, I18nContextValue, UseTranslationResult,
  I18nInstance, I18nOptions, I18nParams, I18nParamValue, I18nResources,
} from './I18n';

export { Modal, ConfirmDialog, ConfirmProvider, useConfirm, useConfirmDialog } from './Modal';
export type {
  ModalProps, ModalSize, ModalLabels,
  ConfirmDialogProps, ConfirmRequest, ConfirmLabels,
  ConfirmFn, ConfirmProviderProps,
} from './Modal';

export { Badge } from './Badge';
export type { BadgeProps, BadgeTone, BadgeSize } from './Badge';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { Spinner } from './Spinner';
export type { SpinnerProps, SpinnerSize } from './Spinner';

export { Field, Input, Select, Textarea, Checkbox, FormGrid } from './Form';
export type {
  FieldProps, FieldLabels, InputProps, SelectProps,
  TextareaProps, CheckboxProps, FormGridProps, ControlSize,
} from './Form';
