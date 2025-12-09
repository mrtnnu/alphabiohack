import { routing } from "@/i18n/routing";
import createMiddleware from "next-intl/middleware";
import { updateSession } from "@/lib/supabase/middleware";
import { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {

  // 1. Aplicar i18n routing
  const response = intlMiddleware(request);

  // 2. Aplicar manejo de sesión Supabase
  return await updateSession(request, response);
}

export const config = {
  matcher: [
    // Excluir rutas que NO deben usar middleware (como API)
    "/((?!api|_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
