import { ReactNode, createContext, useContext, useMemo } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';

interface StripeContextType {
  stripePromise: Promise<Stripe | null> | null;
  publishableKey: string;
}

const StripeContext = createContext<StripeContextType | null>(null);

export function useStripeContext() {
  return useContext(StripeContext);
}

let cachedStripePromise: Promise<Stripe | null> | null = null;

export function initStripe(publishableKey: string): Promise<Stripe | null> {
  if (!cachedStripePromise && publishableKey) {
    cachedStripePromise = loadStripe(publishableKey);
  }
  return cachedStripePromise || Promise.resolve(null);
}

interface StripeProviderProps {
  children: ReactNode;
  publishableKey: string;
}

export function StripeProvider({ children, publishableKey }: StripeProviderProps) {
  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    return initStripe(publishableKey);
  }, [publishableKey]);

  const contextValue = useMemo(() => ({
    stripePromise,
    publishableKey,
  }), [stripePromise, publishableKey]);

  return (
    <StripeContext.Provider value={contextValue}>
      {children}
    </StripeContext.Provider>
  );
}

export { cachedStripePromise as stripePromise };
