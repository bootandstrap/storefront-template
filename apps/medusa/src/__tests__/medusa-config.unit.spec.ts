describe('medusa config database contract', () => {
    const originalEnv = process.env

    afterEach(() => {
        process.env = originalEnv
        jest.resetModules()
    })

    it('caps the postgres pool for shared Supabase session capacity', () => {
        const config = require('../../medusa-config')

        expect(config.projectConfig.databaseDriverOptions).toMatchObject({
            connection: {
                ssl: {
                    rejectUnauthorized: false,
                },
            },
            pool: {
                min: 1,
                max: 1,
            },
        })
    })

    it('prefers MEDUSA_DATABASE_URL over legacy DATABASE_URL fallback', () => {
        process.env = {
            ...originalEnv,
            MEDUSA_DATABASE_URL: 'postgresql://runtime-user:pwd@runtime-host:5432/postgres',
            DATABASE_URL: 'postgresql://legacy-user:pwd@legacy-host:5432/postgres',
        }

        const config = require('../../medusa-config')

        expect(config.projectConfig.databaseUrl).toBe('postgresql://runtime-user:pwd@runtime-host:5432/postgres')
    })
})
