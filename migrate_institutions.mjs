import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://eeomuefujtyquhgpcmft.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk1MjUyNywiZXhwIjoyMDg3NTI4NTI3fQ.R6JiE-y0U6QBvzkKAqzVbiB8kUR4K1XseTRUvSF9Bio'
)

// 1. Inspect what columns currently exist
const { data: cols, error: inspectErr } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, column_default, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', 'institutions')
    .order('ordinal_position')

if (inspectErr) {
    console.error('Could not inspect table:', inspectErr.message)
    process.exit(1)
}

const existing = new Set(cols.map(c => c.column_name))
console.log('\n── Existing columns ───────────────────────────────────')
cols.forEach(c => console.log(`  ${c.column_name.padEnd(22)} ${c.data_type}`))

// 2. Columns we need to add (safe — only adds if missing)
const migrations = [
    { col: 'logo_url', sql: `ALTER TABLE institutions ADD COLUMN IF NOT EXISTS logo_url TEXT;` },
    { col: 'plan', sql: `ALTER TABLE institutions ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'starter';` },
    { col: 'is_active', sql: `ALTER TABLE institutions ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;` },
    { col: 'welcome_sent', sql: `ALTER TABLE institutions ADD COLUMN IF NOT EXISTS welcome_sent BOOLEAN NOT NULL DEFAULT FALSE;` },
    { col: 'onboarded_at', sql: `ALTER TABLE institutions ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;` },
    { col: 'updated_at', sql: `ALTER TABLE institutions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();` },
]

console.log('\n── Running migrations ─────────────────────────────────')
let applied = 0, skipped = 0

for (const { col, sql } of migrations) {
    if (existing.has(col)) {
        console.log(`  ⏭  ${col} — already exists, skip`)
        skipped++
        continue
    }
    // Use fetch against the Supabase REST /rpc or direct SQL via management API
    // Since supabase-js doesn't expose raw DDL, we use the admin REST endpoint
    const res = await fetch(
        `https://eeomuefujtyquhgpcmft.supabase.co/rest/v1/rpc/exec_sql`,
        {
            method: 'POST',
            headers: {
                apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk1MjUyNywiZXhwIjoyMDg3NTI4NTI3fQ.R6JiE-y0U6QBvzkKAqzVbiB8kUR4K1XseTRUvSF9Bio',
                Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlb211ZWZ1anR5cXVoZ3BjbWZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTk1MjUyNywiZXhwIjoyMDg3NTI4NTI3fQ.R6JiE-y0U6QBvzkKAqzVbiB8kUR4K1XseTRUvSF9Bio`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: sql }),
        }
    )
    if (res.ok) {
        console.log(`  ✅  ${col} — added`)
        applied++
    } else {
        const body = await res.text()
        // exec_sql RPC doesn't exist — print manual SQL instead
        console.log(`  ⚠️  ${col} — RPC unavailable, run manually:`)
        console.log(`      ${sql}`)
    }
}

console.log(`\n── Done: ${applied} applied, ${skipped} skipped ─────────────────`)
console.log('\n📋 If any columns show ⚠️, run this in Supabase SQL Editor:\n')

const needsManual = migrations.filter(m => !existing.has(m.col))
if (needsManual.length > 0) {
    needsManual.forEach(m => console.log('  ' + m.sql))
} else {
    console.log('  Nothing needed — all columns exist!')
}
