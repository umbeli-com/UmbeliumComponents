// Components
export * from './components';

// Contexte d'abonnement — enveloppe BillingClient, remplace les copies par app
export { SubscriptionProvider, useSubscription } from './context';
export type {
  CheckoutOptions,
  SubscriptionContextValue,
  SubscriptionLabels,
  SubscriptionProviderProps,
} from './context';

// Utilities
export { createBillingClient } from './utils/BillingClient';
export type { BillingClient, BillingClientConfig, SubscriptionStatus } from './utils/BillingClient';

export {
  trialDaysLeft,
  resolveTrialEnd,
  formatTrialLabel,
  subscriptionStatusMeta,
  formatPrice,
  formatPeriodDate,
} from './utils/trial';
export type {
  TrialDaysLeftInput,
  TrialEndSource,
  TrialLabelCopy,
  TrialLabelOptions,
  SubscriptionStatusMeta,
  SubscriptionStatusTone,
  SubscriptionStatusKey,
  SubscriptionStatusLabels,
  SubscriptionStatusMetaOptions,
  FormatPriceOptions,
  FormatPeriodDateOptions,
  BillingLocale,
} from './utils/trial';

// Styles are exported via package.json exports
