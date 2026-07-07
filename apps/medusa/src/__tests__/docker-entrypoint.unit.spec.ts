import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

describe('docker entrypoint database contract', () => {
    it('uses the migration URL for db:migrate and the runtime URL for boot commands', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medusa-entrypoint-'))
        const binDir = path.join(tempDir, 'bin')
        const logFile = path.join(tempDir, 'npx-log.jsonl')
        fs.mkdirSync(binDir, { recursive: true })

        const fakeNpx = path.join(binDir, 'npx')
        fs.writeFileSync(
            fakeNpx,
            `#!/bin/sh
printf '{"args":"%s","databaseUrl":"%s"}\n' "$*" "$DATABASE_URL" >> "${logFile}"
exit 0
`,
            'utf8'
        )
        fs.chmodSync(fakeNpx, 0o755)

        const entrypoint = path.resolve(__dirname, '../../docker-entrypoint.sh')
        const result = spawnSync('sh', [entrypoint], {
            env: {
                ...process.env,
                PATH: `${binDir}:${process.env.PATH || ''}`,
                MEDUSA_MIGRATIONS_DATABASE_URL: 'postgresql://migrate-user:pwd@migrate-host:5432/postgres',
                MEDUSA_DATABASE_URL: 'postgresql://runtime-user:pwd@runtime-host:5432/postgres',
                DATABASE_URL: 'postgresql://legacy-user:pwd@legacy-host:5432/postgres',
                MEDUSA_ADMIN_EMAIL: 'owner@example.com',
                MEDUSA_ADMIN_PASSWORD: 'secret123',
            },
            encoding: 'utf8',
        })

        expect(result.status).toBe(0)

        const calls = fs
            .readFileSync(logFile, 'utf8')
            .trim()
            .split('\n')
            .map((line) => JSON.parse(line))

        expect(calls).toEqual([
            {
                args: 'medusa db:migrate',
                databaseUrl: 'postgresql://migrate-user:pwd@migrate-host:5432/postgres',
            },
            {
                args: 'medusa user -e owner@example.com -p secret123',
                databaseUrl: 'postgresql://runtime-user:pwd@runtime-host:5432/postgres',
            },
            {
                args: 'medusa start',
                databaseUrl: 'postgresql://runtime-user:pwd@runtime-host:5432/postgres',
            },
        ])
    })
})
