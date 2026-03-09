import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── Only the Founder's email may call this route ─────────────────────────────
const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL ?? "adityakgpc2507@gmail.com";

// Service-role client — bypasses RLS
const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Auth guard ───────────────────────────────────────────────────────────────
async function verifyFounder(req: NextRequest): Promise<{ ok: boolean; email?: string }> {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return { ok: false };
    const { data, error } = await adminClient.auth.getUser(token);
    if (error || !data.user?.email) return { ok: false };
    if (data.user.email.toLowerCase() !== FOUNDER_EMAIL.toLowerCase()) return { ok: false };
    return { ok: true, email: data.user.email };
}

// ─── GET /api/founder/institutions ────────────────────────────────────────────
// Returns institutions list + platform-wide stats
export async function GET(req: NextRequest) {
    const auth = await verifyFounder(req);
    if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [institutionsRes, usersRes, eventsRes] = await Promise.all([
        adminClient
            .from("institutions")
            .select("id, name, subdomain, admin_email, plan, is_active, welcome_sent, onboarded_at, created_at")
            .order("created_at", { ascending: false }),

        adminClient
            .from("users")
            .select("id", { count: "exact", head: true }),

        adminClient
            .from("events")
            .select("id", { count: "exact", head: true })
            .gte("created_at", monthStart),
    ]);

    return NextResponse.json({
        institutions: institutionsRes.data ?? [],
        stats: {
            total_institutions: (institutionsRes.data ?? []).length,
            total_users: usersRes.count ?? 0,
            events_this_month: eventsRes.count ?? 0,
        },
    });
}

// ─── POST /api/founder/institutions ──────────────────────────────────────────
export async function POST(req: NextRequest) {
    const auth = await verifyFounder(req);
    if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await req.json() as {
        name: string;
        email_domain: string;
        admin_email: string;
        campus_code: string;
    };
    const { name, email_domain, admin_email, campus_code } = body;

    if (!name?.trim() || !email_domain?.trim() || !admin_email?.trim() || !campus_code?.trim())
        return NextResponse.json({ error: "name, email_domain, admin_email, and campus_code are required." }, { status: 400 });

    // Validate campus_code: exactly 2–6 uppercase letters
    const code = campus_code.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
    if (code.length < 2)
        return NextResponse.json({ error: "Campus code must be at least 2 letters." }, { status: 400 });

    // Auto-generate a unique subdomain (keeps DB UNIQUE NOT NULL constraint happy)
    // Format: campuscode-timestamp, fully lowercase
    const autoSubdomain = `${code.toLowerCase()}-${Date.now()}`;

    const { data: institution, error: insertErr } = await adminClient
        .from("institutions")
        .insert({
            name: name.trim(),
            subdomain: autoSubdomain,          // internal — no longer shown in UI
            admin_email: admin_email.trim().toLowerCase(),
            email_domain: email_domain.trim().toLowerCase(),
            campus_code: code,
            is_active: true,
            plan: "starter",
            welcome_sent: false,
        })
        .select()
        .single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 409 });

    // Dummy welcome email log
    console.log("[Founder] Welcome email (dummy):", {
        to: admin_email.trim(),
        subject: `Welcome to CampusBuzz — ${name}`,
        campus_code: code,
        email_domain: email_domain.trim(),
        platform: `https://campusbuzz.in`,
    });

    try {
        await adminClient
            .from("institutions")
            .update({ welcome_sent: true, onboarded_at: new Date().toISOString() })
            .eq("id", institution.id);
    } catch { /* columns may not exist on older schema */ }

    return NextResponse.json({ institution, email_sent: true }, { status: 201 });
}

// ─── PATCH /api/founder/institutions ─────────────────────────────────────────
// Body: { id: string, is_active: boolean } — suspend or reactivate a college
export async function PATCH(req: NextRequest) {
    const auth = await verifyFounder(req);
    if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { id, is_active } = await req.json() as { id: string; is_active: boolean };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { data, error } = await adminClient
        .from("institutions")
        .update({ is_active })
        .eq("id", id)
        .select("id, name, is_active")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ institution: data });
}

// ─── DELETE /api/founder/institutions?id=xxx ─────────────────────────────────
export async function DELETE(req: NextRequest) {
    const auth = await verifyFounder(req);
    if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await adminClient.from("institutions").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
}
