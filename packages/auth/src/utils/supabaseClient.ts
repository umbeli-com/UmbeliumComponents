import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Fabrique du client Supabase de la suite.
 *
 * Les dix applications Umbelium créaient chacune leur client avec des options
 * légèrement différentes ; ce module fixe le contrat en UN SEUL endroit.
 */

/**
 * URL/clé de repli utilisées quand la configuration manque.
 *
 * `createClient('', '')` LÈVE (« supabaseUrl is required. ») dès l'import du
 * module, ce qui donne une page blanche avant même que React ne monte. On
 * fabrique donc toujours un client — sur un projet fictif — et on signale le
 * problème via `isConfigured: false`, que l'app traduit en message lisible.
 */
const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'placeholder-anon-key';

export interface CreateSupabaseAuthClientOptions {
  /**
   * URL du projet Supabase. Si omise, on lit `VITE_SUPABASE_URL`.
   */
  url?: string | null;
  /**
   * Clé anon (publique, protégée par les RLS). Si omise, on lit
   * `VITE_SUPABASE_ANON_KEY` puis `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.
   */
  anonKey?: string | null;
  /**
   * Laisser supabase-js échanger lui-même le `?code=` présent dans l'URL.
   *
   * DÉFAUT `false` — décision de suite (6 apps sur 10 : Anonymum, Dialum,
   * Monitorum, Noesium, Scrapium, Socialum ; 4 restent à `true` : Manager,
   * Profilum ×2, Webum). Ces six apps possèdent leur propre route
   * `/auth/callback` qui appelle `exchangeCodeForSession()` : laisser les deux
   * mécanismes actifs provoque un DOUBLE ÉCHANGE où la seconde tentative
   * échoue (« code already used » / session `undefined` → `.payload`
   * TypeError → boucle de redirection). Une app qui n'échange RIEN elle-même
   * — elle se contente d'attendre l'événement `SIGNED_IN` — doit passer
   * `detectSessionInUrl: true`.
   *
   * @default false
   */
  detectSessionInUrl?: boolean;
  /**
   * Clé de stockage de la session. À ne changer que pour isoler délibérément
   * deux apps servies sur la MÊME origine (sinon elles partagent la session,
   * ce qui est le comportement voulu dans la suite).
   */
  storageKey?: string;
}

export interface SupabaseAuthClient {
  /** Client utilisable ; jamais `null`, même mal configuré (voir `isConfigured`). */
  client: SupabaseClient;
  /** `false` quand l'URL ou la clé anon manquent : le client pointe alors sur un projet fictif. */
  isConfigured: boolean;
}

/** Lit une variable Vite sans casser hors bundler (SSR, tests Node, Jest). */
function readEnv(key: string): string | undefined {
  try {
    const value = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Crée le client Supabase de la suite avec le contrat d'auth commun :
 * `flowType: 'pkce'`, `persistSession`, `autoRefreshToken` et
 * `detectSessionInUrl` (voir la note sur l'option du même nom).
 *
 * Ne lève JAMAIS : quand la configuration manque, on renvoie
 * `isConfigured: false` pour que l'app affiche un message plutôt qu'un écran
 * blanc, et on l'écrit une fois en console pour le diagnostic.
 *
 * @example
 * const { client: supabase, isConfigured } = createSupabaseAuthClient({
 *   url: import.meta.env.VITE_SUPABASE_URL,
 *   anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
 * });
 */
export function createSupabaseAuthClient(
  options: CreateSupabaseAuthClientOptions = {},
): SupabaseAuthClient {
  const { detectSessionInUrl = false, storageKey } = options;

  const url = options.url?.trim() || readEnv('VITE_SUPABASE_URL');
  const anonKey =
    options.anonKey?.trim() ||
    readEnv('VITE_SUPABASE_ANON_KEY') ||
    readEnv('VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY');

  const isConfigured = Boolean(url && anonKey);

  if (!isConfigured) {
    // eslint-disable-next-line no-console
    console.warn(
      '[umbeli-auth] Configuration Supabase absente : renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY. ' +
        "L'authentification restera indisponible.",
    );
  }

  const client = createClient(
    isConfigured ? (url as string) : FALLBACK_SUPABASE_URL,
    isConfigured ? (anonKey as string) : FALLBACK_SUPABASE_ANON_KEY,
    {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl,
        ...(storageKey ? { storageKey } : {}),
      },
    },
  );

  return { client, isConfigured };
}
