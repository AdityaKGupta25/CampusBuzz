import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/", "/api", "/_next", "/favicon.ico"];

// Founder is identified by email — no DB role change needed
const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL ?? "adityakgpc2507@gmail.com";

function isPublic(pathname: string): boolean {
    return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"));
}

const ROLE_HOME: Record<string, string> = {
    student: "/student/feed",
    faculty: "/faculty/my-events",
    hod: "/hod/dashboard",
    admin: "/admin/dashboard",   // ← updated from /faculty/admin-dashboard
    founder: "/founder",            // virtual — resolved by email, not DB role
};

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const clearSession = request.nextUrl.searchParams.get("clear");

    let response = NextResponse.next({
        request: { headers: request.headers },
    });

    // Forced logout via URL param
    if (clearSession) {
        console.log("!!! FORCED CLEAR SESSION !!!");
        response.cookies.delete("cb_role");
        const redirect = NextResponse.redirect(new URL("/login", request.url));
        redirect.cookies.delete("cb_role");
        // Clear Supabase cookies too
        request.cookies.getAll().forEach(c => {
            if (c.name.startsWith("sb-")) redirect.cookies.delete(c.name);
        });
        return redirect;
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll(); },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    const createRedirect = (dest: string) => {
        const url = request.nextUrl.clone();
        url.pathname = dest;
        url.searchParams.delete("next");
        const redirectResponse = NextResponse.redirect(url);
        response.cookies.getAll().forEach(c => redirectResponse.cookies.set(c.name, c.value));
        return redirectResponse;
    };

    if (!user) {
        response.cookies.delete("cb_role");
        if (!isPublic(pathname)) {
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            url.searchParams.set("next", pathname);
            return NextResponse.redirect(url);
        }
        return response;
    }

    // --- LOGGED IN ---
    const cookieVal = request.cookies.get("cb_role")?.value ?? "";
    const [storedRole, storedUid] = cookieVal.split(":");
    let role = (storedUid === user.id) ? storedRole : "";

    if (!role) {
        console.log(`[Middleware] Resolving role for: ${user.email}`);

        // Priority 1: Email Lookup (Highest reliability for manual DBs)
        const { data: pEmail } = await supabase.from("users").select("role").eq("email", user.email).single();
        if (pEmail) {
            role = pEmail.role.toLowerCase();
            console.log(`[Middleware] Role found via email: ${role}`);
        } else {
            // Priority 2: ID Lookup
            const { data: pId } = await supabase.from("users").select("role").eq("id", user.id).single();
            role = ((pId as any)?.role || "student").toLowerCase();
            console.log(`[Middleware] Role found via ID (or default): ${role}`);
        }

        response.cookies.set("cb_role", `${role}:${user.id}`, { maxAge: 3600, path: "/" });
    }

    // ── Founder fast-path (email-based, bypasses role entirely) ────────────
    const isFounder = user.email?.toLowerCase() === FOUNDER_EMAIL.toLowerCase();
    const onFounder = pathname.startsWith("/founder");

    if (isFounder) {
        // Founder on /login or / → go to Founder Console
        if (pathname === "/" || pathname === "/login") {
            return createRedirect("/founder");
        }
        // Founder can access /founder/* and /faculty/* (admin dashboard) freely
        return response;
    }

    // Non-founders must NOT access /founder routes
    if (onFounder) {
        return createRedirect(ROLE_HOME[role] ?? ROLE_HOME.student);
    }

    // ── Standard RBAC ────────────────────────────────────────────────────────
    const onStudent = pathname.startsWith("/student");
    const onFaculty = pathname.startsWith("/faculty");
    const onHod = pathname.startsWith("/hod");
    const onAdmin = pathname.startsWith("/admin");

    // Block non-admins from /admin/*
    if (onAdmin && role !== "admin") return createRedirect(ROLE_HOME[role] ?? ROLE_HOME.student);

    const isAccessingBlueprint = onFaculty && pathname.includes("/manage");

    if (role === "student" && !isAccessingBlueprint && (onFaculty || onHod || onAdmin)) return createRedirect(ROLE_HOME.student);
    if (role === "faculty" && (onHod || onStudent || onAdmin)) return createRedirect(ROLE_HOME.faculty);
    if (role === "hod" && (onStudent || onAdmin)) return createRedirect(ROLE_HOME.hod);
    // admin can access /faculty and /hod routes freely (backward compat)

    return response;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)"],
};
