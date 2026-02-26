'use server'
import fs from 'fs/promises';
import path from 'path';

export async function saveLog(entry: any) {
    try {
        const logDir = path.join(process.cwd(), 'test_logs');
        await fs.mkdir(logDir, { recursive: true });

        // Create a filename based on date and time
        const date = new Date();
        const filename = `log_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getTime()}.json`;

        await fs.writeFile(path.join(logDir, filename), JSON.stringify(entry, null, 2));
        return { success: true, filename };
    } catch (e) {
        console.error("Log Error", e);
        return { success: false, error: String(e) };
    }
}
