// middleware.ts
import { routing } from "@/i18n/routing";
import createMiddleware from "next-intl/middleware";
import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1. aplicar i18n
  const response = intlMiddleware(request);
  // 2. actualizar sesión Supabase
  return updateSession(request, response);
}

export const config = {
  matcher: [
    // excluye rutas API y assets estáticos; así las API siguen en runtime Node
    "/((?!api|_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
