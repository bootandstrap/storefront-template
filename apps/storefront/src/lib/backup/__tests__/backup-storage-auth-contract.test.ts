import { beforeEach, describe, expect, it } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

const ROOT = path.resolve(__dirname, '../../..')
const BACKUP_EXECUTOR = path.join(ROOT, 'lib/backup/backup-executor.ts')
const BACKUP_RESTORE = path.join(ROOT, 'lib/backup/backup-restore.ts')
const BACKUP_RETENTION = path.join(ROOT, 'lib/backup/backup-retention.ts')
const VAULT_DOWNLOAD_ROUTE = path.join(ROOT, 'app/api/panel/vault/download/route.ts')

let backupExecutor: string
let backupRestore: string
let backupRetention: string
let vaultDownloadRoute: string

beforeEach(() => {
    backupExecutor = fs.readFileSync(BACKUP_EXECUTOR, 'utf8')
    backupRestore = fs.readFileSync(BACKUP_RESTORE, 'utf8')
    backupRetention = fs.readFileSync(BACKUP_RETENTION, 'utf8')
    vaultDownloadRoute = fs.readFileSync(VAULT_DOWNLOAD_ROUTE, 'utf8')
})

describe('backup storage auth contract', () => {
    it('uses createStorageAdminClient for private tenant-backups access', () => {
        expect(backupExecutor).toContain('createStorageAdminClient')
        expect(backupRestore).toContain('createStorageAdminClient')
        expect(backupRetention).toContain('createStorageAdminClient')
        expect(vaultDownloadRoute).toContain('createStorageAdminClient')
    })

    it('does not use the anon admin client for tenant-backups operations', () => {
        expect(backupExecutor).not.toContain('createAdminClient')
        expect(backupRestore).not.toContain('createAdminClient')
        expect(backupRetention).not.toContain('createAdminClient')
        expect(vaultDownloadRoute).not.toContain('createAdminClient')
    })
})
