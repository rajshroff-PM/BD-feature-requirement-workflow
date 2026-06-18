import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
    if (_client) return _client;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    _client = createClient(url, key);
    return _client;
}

// Proxy defers client creation until first use so module-level import
// doesn't throw during Next.js static prerendering (useEffects don't
// run server-side, meaning Supabase is never accessed during SSG).
// Methods are bound to the real client to preserve correct `this`.
export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        if (typeof prop === 'symbol') return undefined;
        const client = getClient();
        const value = (client as any)[prop];
        return typeof value === 'function' ? value.bind(client) : value;
    },
});
