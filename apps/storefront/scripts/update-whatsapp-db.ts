// @ts-nocheck — standalone script, not part of Next.js build
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Prepare __dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env.local from two levels up (adjust path relative to where script is run, usually project root)
// We assume execution from apps/storefront root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const tenantId = process.env.TENANT_ID

if (!supabaseUrl || !supabaseKey || !tenantId) {
    console.error('Missing required environment variables:')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
    console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey)
    console.error('TENANT_ID:', !!tenantId)
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateWhatsApp() {
    console.log(`Updating WhatsApp number for tenant: ${tenantId}`)

    const { data, error } = await supabase
        .from('config')
        .update({
            whatsapp_number: '41772921481',
            default_country_prefix: '41'
        })
        .eq('tenant_id', tenantId)
        .select()

    if (error) {
        console.error('Error updating config:', error)
        process.exit(1)
    }

    console.log('✅ Successfully updated WhatsApp number.')
    console.log('New config:', data)
}

updateWhatsApp()
