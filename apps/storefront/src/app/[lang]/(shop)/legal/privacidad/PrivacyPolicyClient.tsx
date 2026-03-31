'use client'

import {
    Shield, Database, Users, Globe, Clock, Scale,
    AlertTriangle, Mail, Server, CreditCard, BarChart3, Cloud
} from 'lucide-react'
import LegalAccordion from '@/components/legal/LegalAccordion'

interface PrivacyPolicyClientProps {
    lang: string
    t: (key: string) => string
    businessName: string
    domain: string
    contactEmail: string
}

// ─── Data processors table ──────────────────────────────────────
const DATA_PROCESSORS = [
    { name: 'Stripe', purpose: 'payment', country: 'US/EU', icon: CreditCard },
    { name: 'Supabase', purpose: 'database', country: 'EU (Frankfurt)', icon: Database },
    { name: 'Vercel', purpose: 'hosting', country: 'EU (Frankfurt)', icon: Cloud },
    { name: 'Google Analytics', purpose: 'analytics', country: 'US/EU', icon: BarChart3 },
    { name: 'Hetzner/Contabo', purpose: 'server', country: 'DE', icon: Server },
]

export default function PrivacyPolicyClient({
    lang,
    t,
    businessName,
    domain,
    contactEmail,
}: PrivacyPolicyClientProps) {
    const isEs = lang === 'es'
    const lastUpdated = new Date().toLocaleDateString(isEs ? 'es-ES' : 'en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
    })

    const sections = [
        {
            id: 'controller',
            icon: <Users className="w-4 h-4" />,
            title: isEs ? '1. Responsable del Tratamiento' : '1. Data Controller',
            defaultOpen: true,
            content: (
                <div className="space-y-2">
                    <p>
                        {isEs
                            ? `El responsable del tratamiento de sus datos personales es:`
                            : `The data controller for your personal data is:`
                        }
                    </p>
                    <div className="glass rounded-lg p-4 text-xs space-y-1">
                        <p className="font-semibold text-tx">{businessName || (isEs ? 'Nuestra Tienda' : 'Our Store')}</p>
                        {domain && <p>{isEs ? 'Web' : 'Website'}: {domain}</p>}
                        {contactEmail && <p>{isEs ? 'Contacto' : 'Contact'}: {contactEmail}</p>}
                    </div>
                </div>
            ),
        },
        {
            id: 'data-collected',
            icon: <Database className="w-4 h-4" />,
            title: isEs ? '2. Datos que Recopilamos' : '2. Data We Collect',
            content: (
                <div className="space-y-3">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-sf-3">
                                    <th className="text-left py-2 pr-4 font-semibold text-tx">{isEs ? 'Categoría' : 'Category'}</th>
                                    <th className="text-left py-2 pr-4 font-semibold text-tx">{isEs ? 'Datos' : 'Data'}</th>
                                    <th className="text-left py-2 font-semibold text-tx">{isEs ? 'Base Legal (Art. 6 RGPD)' : 'Legal Basis (Art. 6 GDPR)'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sf-3/50">
                                <tr>
                                    <td className="py-2 pr-4 text-tx">{isEs ? 'Cuenta' : 'Account'}</td>
                                    <td className="py-2 pr-4">{isEs ? 'Nombre, email, teléfono' : 'Name, email, phone'}</td>
                                    <td className="py-2">{isEs ? 'Ejecución del contrato (Art. 6.1.b)' : 'Contract performance (Art. 6.1.b)'}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 pr-4 text-tx">{isEs ? 'Pedidos' : 'Orders'}</td>
                                    <td className="py-2 pr-4">{isEs ? 'Dirección envío, método pago, historial' : 'Shipping address, payment method, history'}</td>
                                    <td className="py-2">{isEs ? 'Ejecución del contrato (Art. 6.1.b)' : 'Contract performance (Art. 6.1.b)'}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 pr-4 text-tx">{isEs ? 'Navegación' : 'Browsing'}</td>
                                    <td className="py-2 pr-4">{isEs ? 'IP, user agent, páginas visitadas' : 'IP, user agent, pages visited'}</td>
                                    <td className="py-2">{isEs ? 'Interés legítimo (Art. 6.1.f)' : 'Legitimate interest (Art. 6.1.f)'}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 pr-4 text-tx">{isEs ? 'Analíticas' : 'Analytics'}</td>
                                    <td className="py-2 pr-4">{isEs ? 'Comportamiento agregado, conversiones' : 'Aggregated behavior, conversions'}</td>
                                    <td className="py-2">{isEs ? 'Consentimiento (Art. 6.1.a)' : 'Consent (Art. 6.1.a)'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            ),
        },
        {
            id: 'purpose',
            icon: <Scale className="w-4 h-4" />,
            title: isEs ? '3. Finalidad del Tratamiento' : '3. Purpose of Processing',
            content: (
                <ul className="space-y-2 list-none">
                    {[
                        isEs ? 'Procesar y gestionar pedidos y pagos' : 'Process and manage orders and payments',
                        isEs ? 'Gestionar su cuenta de usuario' : 'Manage your user account',
                        isEs ? 'Enviar notificaciones sobre el estado de pedidos' : 'Send order status notifications',
                        isEs ? 'Mejorar nuestro servicio mediante análisis anónimos (con su consentimiento)' : 'Improve our service through anonymous analytics (with your consent)',
                        isEs ? 'Cumplir obligaciones legales y fiscales' : 'Comply with legal and tax obligations',
                        isEs ? 'Prevenir fraude y proteger la seguridad de la plataforma' : 'Prevent fraud and protect platform security',
                    ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <span className="text-brand mt-0.5 shrink-0">•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            ),
        },
        {
            id: 'processors',
            icon: <Server className="w-4 h-4" />,
            title: isEs ? '4. Encargados del Tratamiento' : '4. Data Processors',
            content: (
                <div className="space-y-3">
                    <p>
                        {isEs
                            ? 'Compartimos datos con los siguientes proveedores, todos con acuerdos de procesamiento de datos (DPA):'
                            : 'We share data with the following providers, all under Data Processing Agreements (DPA):'
                        }
                    </p>
                    <div className="grid gap-2">
                        {DATA_PROCESSORS.map(proc => {
                            const Icon = proc.icon
                            return (
                                <div key={proc.name} className="flex items-center gap-3 glass rounded-lg p-3">
                                    <div className="w-8 h-8 rounded-lg bg-brand-subtle flex items-center justify-center shrink-0">
                                        <Icon className="w-4 h-4 text-brand" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-tx">{proc.name}</p>
                                        <p className="text-[11px] text-tx-muted">
                                            {isEs ? 'Función' : 'Purpose'}: {
                                                isEs
                                                    ? ({ payment: 'Pagos', database: 'Base de datos', hosting: 'Hosting', analytics: 'Analíticas', server: 'Servidor' }[proc.purpose])
                                                    : proc.purpose.charAt(0).toUpperCase() + proc.purpose.slice(1)
                                            }
                                        </p>
                                    </div>
                                    <span className="text-[11px] text-tx-muted bg-sf-2 px-2 py-0.5 rounded-full">{proc.country}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ),
        },
        {
            id: 'transfers',
            icon: <Globe className="w-4 h-4" />,
            title: isEs ? '5. Transferencias Internacionales' : '5. International Transfers',
            content: (
                <div className="space-y-2">
                    <p>
                        {isEs
                            ? 'Algunos de nuestros proveedores pueden procesar datos fuera del EEE. En estos casos, garantizamos su protección mediante:'
                            : 'Some of our providers may process data outside the EEA. In such cases, we ensure protection through:'
                        }
                    </p>
                    <ul className="space-y-1.5">
                        {[
                            isEs ? 'Cláusulas contractuales tipo de la Comisión Europea (SCCs)' : 'EU Standard Contractual Clauses (SCCs)',
                            isEs ? 'Decisiones de adecuación del país receptor' : 'Adequacy decisions for the recipient country',
                            isEs ? 'EU-US Data Privacy Framework (para proveedores US certificados)' : 'EU-US Data Privacy Framework (for certified US providers)',
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs">
                                <span className="text-brand mt-0.5">✓</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            ),
        },
        {
            id: 'retention',
            icon: <Clock className="w-4 h-4" />,
            title: isEs ? '6. Plazos de Conservación' : '6. Retention Periods',
            content: (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-sf-3">
                                <th className="text-left py-2 pr-4 font-semibold text-tx">{isEs ? 'Datos' : 'Data'}</th>
                                <th className="text-left py-2 font-semibold text-tx">{isEs ? 'Período' : 'Period'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sf-3/50">
                            <tr>
                                <td className="py-2 pr-4">{isEs ? 'Datos de cuenta' : 'Account data'}</td>
                                <td className="py-2">{isEs ? 'Mientras la cuenta esté activa + 30 días' : 'While account is active + 30 days'}</td>
                            </tr>
                            <tr>
                                <td className="py-2 pr-4">{isEs ? 'Datos de pedidos / facturas' : 'Order / invoice data'}</td>
                                <td className="py-2">{isEs ? '5 años (obligación fiscal)' : '5 years (tax obligation)'}</td>
                            </tr>
                            <tr>
                                <td className="py-2 pr-4">{isEs ? 'Datos analíticos' : 'Analytics data'}</td>
                                <td className="py-2">{isEs ? '26 meses (anonimizados)' : '26 months (anonymized)'}</td>
                            </tr>
                            <tr>
                                <td className="py-2 pr-4">{isEs ? 'Consentimiento de cookies' : 'Cookie consent'}</td>
                                <td className="py-2">{isEs ? '12 meses' : '12 months'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ),
        },
        {
            id: 'rights',
            icon: <Shield className="w-4 h-4" />,
            title: isEs ? '7. Sus Derechos (Art. 15–22 RGPD)' : '7. Your Rights (Art. 15–22 GDPR)',
            content: (
                <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-2">
                        {[
                            { title: isEs ? 'Acceso (Art. 15)' : 'Access (Art. 15)', desc: isEs ? 'Solicitar copia de sus datos personales' : 'Request a copy of your personal data' },
                            { title: isEs ? 'Rectificación (Art. 16)' : 'Rectification (Art. 16)', desc: isEs ? 'Corregir datos inexactos o incompletos' : 'Correct inaccurate or incomplete data' },
                            { title: isEs ? 'Supresión (Art. 17)' : 'Erasure (Art. 17)', desc: isEs ? 'Solicitar eliminación de sus datos' : 'Request deletion of your data' },
                            { title: isEs ? 'Portabilidad (Art. 20)' : 'Portability (Art. 20)', desc: isEs ? 'Recibir sus datos en formato transferible' : 'Receive your data in a transferable format' },
                            { title: isEs ? 'Oposición (Art. 21)' : 'Objection (Art. 21)', desc: isEs ? 'Oponerse al tratamiento basado en interés legítimo' : 'Object to processing based on legitimate interest' },
                            { title: isEs ? 'Limitación (Art. 18)' : 'Restriction (Art. 18)', desc: isEs ? 'Restringir el tratamiento en determinados casos' : 'Restrict processing in certain cases' },
                        ].map(right => (
                            <div key={right.title} className="glass rounded-lg p-3">
                                <p className="text-xs font-semibold text-tx mb-0.5">{right.title}</p>
                                <p className="text-[11px] text-tx-muted">{right.desc}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs">
                        {isEs
                            ? `Para ejercer cualquiera de estos derechos, contacte a: `
                            : `To exercise any of these rights, contact: `
                        }
                        <strong className="text-tx">{contactEmail || 'info@example.com'}</strong>
                    </p>
                </div>
            ),
        },
        {
            id: 'complaints',
            icon: <AlertTriangle className="w-4 h-4" />,
            title: isEs ? '8. Reclamaciones' : '8. Complaints',
            content: (
                <p>
                    {isEs
                        ? 'Tiene derecho a presentar una reclamación ante la autoridad de control competente. En España: Agencia Española de Protección de Datos (AEPD, www.aepd.es). En Suiza: FDPIC (www.edoeb.admin.ch). En Alemania: la autoridad de protección de datos del Land correspondiente.'
                        : 'You have the right to file a complaint with the competent supervisory authority. In Spain: AEPD (www.aepd.es). In Switzerland: FDPIC (www.edoeb.admin.ch). In Germany: the data protection authority of the relevant Bundesland.'
                    }
                </p>
            ),
        },
        {
            id: 'contact',
            icon: <Mail className="w-4 h-4" />,
            title: isEs ? '9. Contacto' : '9. Contact',
            content: (
                <div className="glass rounded-lg p-4 text-xs space-y-1">
                    <p className="font-semibold text-tx">{businessName || (isEs ? 'Nuestra Tienda' : 'Our Store')}</p>
                    {contactEmail && (
                        <p>
                            Email: <a href={`mailto:${contactEmail}`} className="text-brand hover:underline">{contactEmail}</a>
                        </p>
                    )}
                    {domain && <p>Web: {domain}</p>}
                </div>
            ),
        },
    ]

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-subtle mb-4">
                    <Shield className="w-7 h-7 text-brand" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-display text-tx mb-3">
                    {isEs ? 'Política de Privacidad' : 'Privacy Policy'}
                </h1>
                <p className="text-tx-muted">
                    {isEs ? 'Cómo recopilamos, usamos y protegemos sus datos personales.' : 'How we collect, use, and protect your personal data.'}
                </p>
                <p className="text-xs text-tx-faint mt-2">
                    {isEs ? 'Última actualización' : 'Last updated'}: {lastUpdated}
                </p>
            </div>

            {/* GDPR summary card */}
            <div className="glass rounded-2xl p-6 mb-8 border border-brand/20">
                <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-brand mt-0.5 shrink-0" />
                    <div>
                        <h2 className="text-sm font-semibold text-tx mb-1">
                            {isEs ? 'Resumen RGPD' : 'GDPR Summary'}
                        </h2>
                        <p className="text-xs text-tx-muted leading-relaxed">
                            {isEs
                                ? `${businessName || 'Nuestra tienda'} cumple con el Reglamento General de Protección de Datos (RGPD) y la Ley Federal Suiza de Protección de Datos (nDSG). Solo recopilamos datos necesarios para prestar nuestros servicios. Sus datos nunca se venden a terceros.`
                                : `${businessName || 'Our store'} complies with the General Data Protection Regulation (GDPR) and the Swiss Federal Act on Data Protection (nFADP). We only collect data necessary to provide our services. Your data is never sold to third parties.`
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Accordion sections */}
            <LegalAccordion items={sections} allowMultiple />
        </div>
    )
}
