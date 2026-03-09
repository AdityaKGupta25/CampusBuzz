import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── Service-role client (bypasses RLS) ──────────────────────────────────────
const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Exported types (used by the frontend page) ───────────────────────────────
export interface OnboardRow {
    full_name: string;
    email: string;
    role: "student" | "faculty" | "hod" | "admin";
    department_name: string;
}

export interface OnboardResult {
    email: string;
    full_name: string;
    status: "created" | "skipped" | "error";
    message?: string;
}

// ─── Resolve calling admin's institution ─────────────────────────────────────
// Returns { institution_id, email_domain } so we can scope all inserts and
// enforce the domain guard.
async function resolveAdminInstitution(req: NextRequest): Promise<{
    institution_id: string;
    email_domain: string;
    admin_email: string;
} | null> {
    const token = req.headers.get("authorization")?.replace("Bearer ", "").trim() ?? "";
    if (!token) return null;

    // 1. Verify JWT → get auth user
    const { data: authData, error: authErr } = await serviceClient.auth.getUser(token);
    if (authErr || !authData.user?.email) return null;

    const admin_email = authData.user.email.toLowerCase();

    // 2. Look up public.users row to get institution_id
    const { data: profile } = await serviceClient
        .from("users")
        .select("institution_id, role")
        .eq("email", admin_email)
        .single();

    if (!profile || profile.role !== "admin") return null;
    if (!profile.institution_id) return null;

    // 3. Fetch institution's email_domain for the guard check
    const { data: institution } = await serviceClient
        .from("institutions")
        .select("email_domain")
        .eq("id", profile.institution_id)
        .single();

    // email_domain may not be set yet — treat as "allow all" if missing
    const email_domain = institution?.email_domain ?? "";

    return { institution_id: profile.institution_id, email_domain, admin_email };
}

// ─── Department cache — scoped per institution per request ────────────────────
async function getOrCreateDept(
    deptName: string,
    institution_id: string,
    cache: Map<string, string>
): Promise<string> {
    const key = `${institution_id}::${deptName.trim().toLowerCase()}`;
    if (cache.has(key)) return cache.get(key)!;

    // Check within THIS institution only
    const { data: existing } = await serviceClient
        .from("departments")
        .select("id")
        .ilike("name", deptName.trim())
        .eq("institution_id", institution_id)
        .maybeSingle();

    if (existing?.id) {
        cache.set(key, existing.id);
        return existing.id;
    }

    // Create scoped to this institution
    const { data: created, error } = await serviceClient
        .from("departments")
        .insert({ name: deptName.trim(), institution_id })
        .select("id")
        .single();

    if (error || !created) throw new Error(`Cannot create department "${deptName}": ${error?.message}`);
    cache.set(key, created.id);
    return created.id;
}

// ─── Email domain guard ───────────────────────────────────────────────────────
// Returns an error string if the email is rejected, null if it passes.
function checkEmailDomain(email: string, allowed_domain: string): string | null {
    if (!allowed_domain) return null; // domain not configured → allow all

    const emailLower = email.trim().toLowerCase();
    const domainLower = allowed_domain.trim().toLowerCase();

    // Accept emails ending with @<domain> or @<subdomain>.<domain>
    const emailDomainPart = emailLower.split("@")[1] ?? "";

    if (emailDomainPart !== domainLower && !emailDomainPart.endsWith(`.${domainLower}`)) {
        return `Email domain "@${emailDomainPart}" is not allowed for this institution. Expected: @${domainLower}`;
    }
    return null;
}

// ─── POST /api/admin/bulk-onboard ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        // ── 1. Resolve admin's institution ───────────────────────────────────
        const adminCtx = await resolveAdminInstitution(req);

        if (!adminCtx) {
            return NextResponse.json(
                { error: "Unauthorized. You must be a logged-in admin with an assigned institution." },
                { status: 403 }
            );
        }

        const { institution_id, email_domain } = adminCtx;

        // ── 2. Parse request body ─────────────────────────────────────────────
        const body = await req.json() as { rows: OnboardRow[], password?: string };
        const { rows, password } = body;

        if (!Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: "No rows provided." }, { status: 400 });
        }
        if (!password) {
            return NextResponse.json({ error: "Default password is required." }, { status: 400 });
        }

        const deptCache = new Map<string, string>();
        const results: OnboardResult[] = [];

        for (const row of rows) {
            const { email, full_name, role, department_name } = row;

            // ── Validate presence ─────────────────────────────────────────────
            if (!email || !full_name || !role || !department_name) {
                results.push({
                    email: email ?? "unknown",
                    full_name: full_name ?? "unknown",
                    status: "error",
                    message: "Missing required fields (full_name, email, role, department_name)",
                });
                continue;
            }

            // ── Email domain guard — SOFT WARNING (not a hard block) ──────────────────
            // Per CTO decision: auto-tag institution_id on all rows, warn but don't reject.
            const domainWarning = checkEmailDomain(email, email_domain);
            // (domainWarning is logged per-row but does NOT cause a skip)

            try {
                // ── Get/create department (institution-scoped) ─────────────────
                const department_id = await getOrCreateDept(department_name, institution_id, deptCache);

                // ── Create Auth User (triggers handle_new_auth_user) ─────────────
                // By using auth.admin.createUser, we ensure they have an account
                // and the trigger takes care of the public profile with institution_id.
                const { data: newUser, error: authError } = await serviceClient.auth.admin.createUser({
                    email: email.trim().toLowerCase(),
                    password: password, // ← Use the provided default password
                    email_confirm: true,
                    user_metadata: {
                        full_name: full_name.trim(),
                        role: role.toLowerCase(),
                        institution_id,
                        department_id
                    }
                });

                if (authError) {
                    // ── If user already exists in Auth, just update their profile record ──
                    if (authError.message.toLowerCase().includes("already exists")) {
                        const { error: syncError } = await serviceClient
                            .from("users")
                            .upsert({
                                email: email.trim().toLowerCase(),
                                full_name: full_name.trim(),
                                role: role.toLowerCase(),
                                department_id,
                                institution_id,
                            }, { onConflict: "email" });

                        if (syncError) {
                            results.push({ email, full_name, status: "error", message: `Auth exists but sync failed: ${syncError.message}` });
                        } else {
                            results.push({
                                email, full_name, status: "skipped",
                                message: "Account already exists (Profile Updated)",
                            });
                        }
                    } else {
                        results.push({ email, full_name, status: "error", message: authError.message });
                    }
                } else {
                    // Surface domain warning in the result so admin sees it in the report
                    results.push({
                        email, full_name, status: "created",
                        message: domainWarning
                            ? `⚠️ Domain mismatch: ${domainWarning}`
                            : undefined,
                    });
                }
            } catch (rowErr: any) {
                results.push({
                    email, full_name, status: "error",
                    message: rowErr?.message ?? "Unknown error",
                });
            }
        }

        // ── Summary header for logging ────────────────────────────────────────
        const created = results.filter(r => r.status === "created").length;
        const skipped = results.filter(r => r.status === "skipped").length;
        const failed = results.filter(r => r.status === "error").length;
        console.log(
            `[BulkOnboard] institution=${institution_id} | ` +
            `created=${created} skipped=${skipped} failed=${failed}`
        );

        return NextResponse.json({ results, institution_id });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
