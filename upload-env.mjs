import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

for (const [key, value] of Object.entries(envConfig)) {
    for (const env of ['production', 'preview', 'development']) {
        try {
            console.log(`Adding ${key} to ${env}...`);
            // Windows echo is tricky, so we use stdin via execSync stdio
            execSync(`npx vercel env add ${key} ${env}`, {
                input: value,
                stdio: ['pipe', 'inherit', 'inherit'],
            });
        } catch (e) {
            console.error(`Failed to add ${key} to ${env}:`, e.message);
        }
    }
}
console.log('Finished uploading env vars');
