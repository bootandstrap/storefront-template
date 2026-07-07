describe('medusa config database contract', () => {
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
})
