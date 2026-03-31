import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfig } from '@/lib/config'
import type { Metadata } from 'next'
import { Building2, Mail, Globe, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return {
        title: t('legal.imprintTitle') || 'Legal Notice',
        description: t('legal.imprintMeta') || 'Legal identification and contact information.',
    }
}

export default async function ImprintPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const isEs = lang === 'es'
    const isDe = lang === 'de'

    let cfg: Record<string, unknown> = {}
    try {
        const { config } = await getConfig()
        cfg = config as unknown as Record<string, unknown>
    } catch { /* defaults */ }

    const businessName = String(cfg.store_name || cfg.business_name || '')
    const domain = String(cfg.domain || '')
    const contactEmail = String(cfg.contact_email || '')
    const phone = String(cfg.phone || cfg.whatsapp_number || '')
    const address = String(cfg.address || '')
    const vatId = String(cfg.vat_id || cfg.tax_id || '')
    const registrationNumber = String(cfg.registration_number || '')

    const lastUpdated = new Date().toLocaleDateString(isEs ? 'es-ES' : isDe ? 'de-DE' : 'en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
    })

    const title = isDe ? 'Impressum' : isEs ? 'Aviso Legal' : 'Legal Notice'
    const subtitle = isDe
        ? 'Angaben gemäß § 5 TMG / Art. 19 DSG'
        : isEs
            ? 'Información legal e identificación del titular'
            : 'Legal identification and contact information'

    return (
        <div className="container-page py-12">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-subtle mb-4">
                        <Building2 className="w-7 h-7 text-brand" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold font-display text-tx mb-3">{title}</h1>
                    <p className="text-tx-muted">{subtitle}</p>
                    <p className="text-xs text-tx-faint mt-2">
                        {isEs ? 'Última actualización' : isDe ? 'Letzte Aktualisierung' : 'Last updated'}: {lastUpdated}
                    </p>
                </div>

                {/* Main identification card */}
                <div className="glass rounded-2xl p-8 mb-6 border border-white/5">
                    <h2 className="text-sm font-semibold text-tx flex items-center gap-2 mb-6">
                        <Building2 className="w-4 h-4 text-brand" />
                        {isDe ? 'Angaben zum Betreiber' : isEs ? 'Identificación del Titular' : 'Owner Identification'}
                    </h2>

                    <div className="grid sm:grid-cols-2 gap-4">
                        {/* Business name */}
                        <div className="glass rounded-xl p-4">
                            <p className="text-[11px] text-tx-muted mb-1">
                                {isDe ? 'Unternehmen' : isEs ? 'Nombre comercial' : 'Business Name'}
                            </p>
                            <p className="text-sm font-semibold text-tx">
                                {businessName || (isEs ? 'No configurado' : 'Not configured')}
                            </p>
                        </div>

                        {/* Domain */}
                        {domain && (
                            <div className="glass rounded-xl p-4">
                                <p className="text-[11px] text-tx-muted mb-1 flex items-center gap-1">
                                    <Globe className="w-3 h-3" />
                                    {isDe ? 'Webseite' : isEs ? 'Sitio web' : 'Website'}
                                </p>
                                <p className="text-sm font-semibold text-tx">{domain}</p>
                            </div>
                        )}

                        {/* Email */}
                        {contactEmail && (
                            <div className="glass rounded-xl p-4">
                                <p className="text-[11px] text-tx-muted mb-1 flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    Email
                                </p>
                                <a href={`mailto:${contactEmail}`} className="text-sm font-semibold text-brand hover:underline">
                                    {contactEmail}
                                </a>
                            </div>
                        )}

                        {/* Phone */}
                        {phone && (
                            <div className="glass rounded-xl p-4">
                                <p className="text-[11px] text-tx-muted mb-1">
                                    {isDe ? 'Telefon' : isEs ? 'Teléfono' : 'Phone'}
                                </p>
                                <p className="text-sm font-semibold text-tx">{phone}</p>
                            </div>
                        )}

                        {/* Address */}
                        {address && (
                            <div className="glass rounded-xl p-4 sm:col-span-2">
                                <p className="text-[11px] text-tx-muted mb-1">
                                    {isDe ? 'Adresse' : isEs ? 'Dirección' : 'Address'}
                                </p>
                                <p className="text-sm text-tx">{address}</p>
                            </div>
                        )}

                        {/* VAT / Tax ID */}
                        {vatId && (
                            <div className="glass rounded-xl p-4">
                                <p className="text-[11px] text-tx-muted mb-1">
                                    {isDe ? 'USt-IdNr. / UID' : isEs ? 'NIF/CIF / IVA' : 'VAT / Tax ID'}
                                </p>
                                <p className="text-sm font-semibold text-tx font-mono">{vatId}</p>
                            </div>
                        )}

                        {/* Registration */}
                        {registrationNumber && (
                            <div className="glass rounded-xl p-4">
                                <p className="text-[11px] text-tx-muted mb-1">
                                    {isDe ? 'Handelsregister / CHE' : isEs ? 'Registro Mercantil' : 'Commercial Register'}
                                </p>
                                <p className="text-sm font-semibold text-tx font-mono">{registrationNumber}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Intellectual property */}
                <div className="glass rounded-2xl p-6 mb-6 border border-white/5">
                    <h2 className="text-sm font-semibold text-tx flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-brand" />
                        {isDe ? 'Geistiges Eigentum' : isEs ? 'Propiedad Intelectual' : 'Intellectual Property'}
                    </h2>
                    <p className="text-sm text-tx-sec leading-relaxed">
                        {isDe
                            ? `Alle Inhalte dieser Website — einschließlich Texte, Grafiken, Logos, Bilder und Software — sind Eigentum von ${businessName || 'dem Betreiber'} oder werden mit Lizenz verwendet und sind durch das Urheberrecht geschützt.`
                            : isEs
                                ? `Todos los contenidos de este sitio web — incluyendo textos, gráficos, logos, imágenes y software — son propiedad de ${businessName || 'el titular'} o se utilizan con licencia y están protegidos por la ley de propiedad intelectual.`
                                : `All content on this website — including text, graphics, logos, images, and software — is owned by ${businessName || 'the owner'} or used under license and is protected by intellectual property law.`
                        }
                    </p>
                </div>

                {/* Dispute resolution */}
                <div className="glass rounded-2xl p-6 border border-white/5">
                    <h2 className="text-sm font-semibold text-tx mb-3">
                        {isDe ? 'Online-Streitbeilegung' : isEs ? 'Resolución de Disputas' : 'Dispute Resolution'}
                    </h2>
                    <p className="text-sm text-tx-sec leading-relaxed">
                        {isDe
                            ? 'Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:'
                            : isEs
                                ? 'La Comisión Europea ofrece una plataforma para la resolución de disputas en línea:'
                                : 'The European Commission provides a platform for online dispute resolution:'
                        }
                        {' '}
                        <a
                            href="https://ec.europa.eu/odr"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand hover:underline"
                        >
                            https://ec.europa.eu/odr
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
