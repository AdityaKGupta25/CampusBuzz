import { Client } from 'pg';
import fs from 'fs';

// Try direct connection instead of pooler
const connectionString = 'postgresql://postgres:jz0bj6uho2klzxpch9g1ytrjynsoqeepc59pyisuviq@db.eeomuefujtyquhgpcmft.supabase.co:5432/postgres';

async function runSQL(filePath) {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query(sql);
        console.log(`✅ successfully applied ${filePath}`);
    } catch (e) {
        console.error(`❌ failed to apply ${filePath}:`, e.message);
    } finally {
        await client.end();
    }
}

async function main() {
    await runSQL('c:/Users/adity/OneDrive/Desktop/CampusBuzz/ADD_BLUEPRINT_STATUS.sql');
}

main();
