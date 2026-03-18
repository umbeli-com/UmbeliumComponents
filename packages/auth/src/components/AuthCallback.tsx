import { useEffect, useState } from 'react';

interface AuthCallbackProps {
  /** Where to redirect after successful auth. Defaults to '/' */
  redirectTo?: string;
  /** Optional Supabase client to manually exchange the code. If omitted, relies on detectSessionInUrl. */
  supabaseClient?: { auth: { exchangeCodeForSession: (code: string) => Promise<any> } };
  /** Called when auth succeeds (e.g. to navigate programmatically) */
  onSuccess?: () => void;
  /** Called when auth fails */
  onError?: (error: string) => void;
}

export function AuthCallback({
  redirectTo = '/',
  supabaseClient,
  onSuccess,
  onError,
}: AuthCallbackProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const oauthError = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      if (oauthError) {
        const message = errorDescription
          ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
          : oauthError;
        if (!cancelled) {
          setError(message);
          onError?.(message);
        }
        return;
      }

      if (code && supabaseClient) {
        try {
          const { error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            if (!cancelled) {
              setError(exchangeError.message);
              onError?.(exchangeError.message);
            }
            return;
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'OAuth callback error';
          if (!cancelled) {
            setError(message);
            onError?.(message);
          }
          return;
        }
      }

      // Clean URL params
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      url.searchParams.delete('error');
      url.searchParams.delete('error_description');
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);

      if (!cancelled) {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.replace(redirectTo);
        }
      }
    };

    // Small delay to let Supabase's detectSessionInUrl process first
    const timer = setTimeout(handleCallback, 100);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [redirectTo, supabaseClient, onSuccess, onError]);

  if (error) {
    return (
      <div className="auth-page__container" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>
          <a href={redirectTo} style={{ color: '#6366f1', textDecoration: 'underline' }}>
            Retour
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '2.5rem',
            height: '2.5rem',
            border: '3px solid #e5e7eb',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'auth-callback-spin 0.8s linear infinite',
            margin: '0 auto 1rem',
          }}
        />
        <p style={{ color: '#6b7280' }}>Authentification en cours...</p>
        <style>{`@keyframes auth-callback-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );
}

export default AuthCallback;
