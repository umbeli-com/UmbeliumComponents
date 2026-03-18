import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@umbeli-com/ui';

interface PaymentFormProps {
  mode: 'payment' | 'setup' | 'subscription' | 'one-time';
  planId?: string;
  amount?: number;
  onSetupComplete?: (paymentMethodId: string) => Promise<boolean | void> | boolean | void;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaymentForm({ mode, planId: _planId, amount, onSuccess, onCancel, onSetupComplete }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveMode = mode === 'setup' ? 'setup' : 'payment';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Une erreur est survenue');
        setLoading(false);
        return;
      }

      if (effectiveMode === 'setup') {
        const { error: confirmError, setupIntent } = await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/parametres?payment=success`,
          },
          redirect: 'if_required',
        });

        if (confirmError) {
          setError(confirmError.message || 'Échec de l\'enregistrement de la carte');
        } else {
          let shouldClose = true;
          if (setupIntent?.payment_method && onSetupComplete) {
            const paymentMethodId = typeof setupIntent.payment_method === 'string'
              ? setupIntent.payment_method
              : setupIntent.payment_method.id;
            const result = await onSetupComplete(paymentMethodId);
            if (result === false) {
              shouldClose = false;
            }
          }
          if (shouldClose) {
            onSuccess();
          }
        }
      } else {
        const { error: confirmError } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/parametres?payment=success`,
          },
          redirect: 'if_required',
        });

        if (confirmError) {
          setError(confirmError.message || 'Échec du paiement');
        } else {
          onSuccess();
        }
      }
    } catch (_err) {
      setError('Une erreur inattendue est survenue');
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (loading) return 'Traitement...';
    if (effectiveMode === 'setup') return 'Enregistrer la carte';
    if (amount !== undefined) return `Payer ${amount}€`;
    return 'Payer';
  };

  return (
    <form onSubmit={handleSubmit} className="umbeli-payment-form">
      <PaymentElement options={{ layout: 'tabs' }} />
      
      {error && (
        <div className="umbeli-payment-form__error">
          {error}
        </div>
      )}

      <div className="umbeli-payment-form__actions">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!stripe || loading}
        >
          {getButtonText()}
        </Button>
      </div>
    </form>
  );
}

export default PaymentForm;
