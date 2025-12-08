import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
  try {
    // FIX: await cookies() in Next.js 15
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value ?? "";
          },
          set() {},
          remove() {},
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return Response.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    return Response.json({ user });
  } catch (error) {
    console.error("API /user error:", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
