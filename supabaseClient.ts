import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Must be read at module top level — Turbopack only inlines NEXT_PUBLIC_*
// env vars during bundle compilation at the module scope. Reading them
// inside a nested function leaves the raw process.env.* reference which
// resolves to undefined in the browser bundle.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
    if (_client) return _client;
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
    _client = createClient(SUPABASE_URL, SUPABASE_KEY);
    return _client;
}

// Proxy defers createClient() until first property access (inside a
// useEffect), so the module-level import never throws during Next.js
// static prerendering where useEffects do not run.
// Methods are bound to the real client instance to preserve `this`.
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        if (typeof prop === 'symbol') return undefined;
        const client = getClient();
        const value = (client as any)[prop];
        return typeof value === 'function' ? value.bind(client) : value;
    },
});
