import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Senior Developer Note: 
 * This page serves as a high-speed router. Since the college testing phase 
 * requires bypassing the landing page marketing stack, we use a Server 
 * Component to handle session-aware redirection before any client-side 
 * hydration occurs.
 */
export default async function RootPage() {
  const cookieStore = await cookies();

  // Initialize Supabase Server Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 1. IF NOT authenticated -> Hard Redirect to /login
  if (!user) {
    redirect("/login");
  }

  // 2. IF authenticated -> Determine role and route to dashboard
  // Check if FOUNDER_EMAIL matches (highest priority)
  const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL ?? "adityakgpc2507@gmail.com";
  if (user.email?.toLowerCase() === FOUNDER_EMAIL.toLowerCase()) {
    redirect("/founder");
  }

  // Retrieve role from cookies (optimized) or Database (fallback)
  const cookieVal = cookieStore.get("cb_role")?.value ?? "";
  const [storedRole, storedUid] = cookieVal.split(":");
  let role = (storedUid === user.id) ? storedRole : "";

  if (!role) {
    // Fallback: Fetch from DB if cookie is missing or invalid
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("auth_uid", user.id)
      .single();
    role = (profile?.role || "student").toLowerCase();
  }

  // Role-to-Dashboard Mapping
  const ROLE_HOME: Record<string, string> = {
    student: "/student/feed",
    faculty: "/faculty/my-events",
    hod: "/hod/dashboard",
    admin: "/admin/dashboard",
  };

  const destination = ROLE_HOME[role] || "/student/feed";
  redirect(destination);
}
