// utils/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

export function createServerSupabaseClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient(
    process.env.SUPABASE_URL!,              // URL base de Supabase
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // clave secreta/service role
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value ?? '';
        },
        set() { /* no se puede escribir cookies en SSR */ },
        remove() {},
      },
    }
  );
}
