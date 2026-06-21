import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: ['.env.local', '.env'] });

async function main() {
    const sql = neon(process.env.DATABASE_URL!);
    const file = join(process.cwd(), 'drizzle', 'nft-views.sql');
    const contents = readFileSync(file, 'utf-8');

    // Strip comment lines, then split on ';' into individual statements
    // (the file has no ';' inside strings).
    const statements = contents
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    for (const statement of statements) {
        await sql.query(statement);
    }

    console.log(`Applied ${statements.length} statements from nft-views.sql`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
