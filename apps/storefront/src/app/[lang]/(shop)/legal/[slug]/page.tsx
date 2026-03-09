import { getDictionary, createTranslator, type Locale, SUPPORTED_LOCALES } from '@/lib/i18n'
import { getConfig } from '@/lib/config'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

// ---------------------------------------------------------------------------
// Legal page types and slug mapping
// ---------------------------------------------------------------------------

type LegalType = 'privacy' | 'terms' | 'cookies' | 'imprint'

/** Map of canonical (file-system) slugs to legal page types */
const SLUG_TO_TYPE: Record<string, LegalType> = {
    privacidad: 'privacy',
    terminos: 'terms',
    cookies: 'cookies',
    aviso: 'imprint',
}

/** Localized slug → canonical slug mapping for legal pages */
export const LEGAL_SLUG_MAPS: Record<string, Record<string, string>> = {
    en: {
        privacy: 'privacidad',
        terms: 'terminos',
        imprint: 'aviso',
        // 'cookies' is same
    },
    de: {
        datenschutz: 'privacidad',
        agb: 'terminos',
        impressum: 'aviso',
        // 'cookies' is same
    },
    fr: {
        confidentialite: 'privacidad',
        conditions: 'terminos',
        'mentions-legales': 'aviso',
        // 'cookies' is same
    },
    it: {
        'informativa-privacy': 'privacidad',
        'termini-condizioni': 'terminos',
        informativa: 'aviso',
        // 'cookies' is same
    },
    es: {},
}

// All valid legal slugs (canonical)
const VALID_SLUGS = Object.keys(SLUG_TO_TYPE)

// ---------------------------------------------------------------------------
// Page params
// ---------------------------------------------------------------------------

interface LegalPageProps {
    params: Promise<{ lang: string; slug: string }>
}

// ---------------------------------------------------------------------------
// Default legal content templates per locale
// Variables: {business_name}, {domain}, {email}
// ---------------------------------------------------------------------------

const DEFAULT_CONTENT: Record<LegalType, Record<string, { title: string; content: string }>> = {
    privacy: {
        es: {
            title: 'Política de Privacidad',
            content: `# Política de Privacidad

**{business_name}** se compromete a proteger su privacidad. Esta política describe cómo recopilamos, usamos y protegemos su información personal.

## Datos que Recopilamos

- **Datos de cuenta**: nombre, email, dirección (al registrarse)
- **Datos de pedido**: productos, dirección de envío, método de pago
- **Datos de navegación**: cookies técnicas necesarias para el funcionamiento

## Uso de los Datos

Sus datos se utilizan exclusivamente para:
- Procesar y entregar pedidos
- Gestionar su cuenta de usuario
- Enviar comunicaciones sobre pedidos
- Mejorar nuestro servicio

## Derechos

Puede ejercer sus derechos de acceso, rectificación, supresión y portabilidad contactando a **{email}**.

## Contacto

Para consultas sobre privacidad: **{email}**

*Última actualización: {date}*`,
        },
        en: {
            title: 'Privacy Policy',
            content: `# Privacy Policy

**{business_name}** is committed to protecting your privacy. This policy describes how we collect, use, and protect your personal information.

## Data We Collect

- **Account data**: name, email, address (upon registration)
- **Order data**: products, shipping address, payment method
- **Browsing data**: technical cookies necessary for operation

## How We Use Your Data

Your data is used exclusively to:
- Process and deliver orders
- Manage your user account
- Send order-related communications
- Improve our service

## Your Rights

You can exercise your rights of access, rectification, deletion, and portability by contacting **{email}**.

## Contact

For privacy inquiries: **{email}**

*Last updated: {date}*`,
        },
        de: {
            title: 'Datenschutzerklärung',
            content: `# Datenschutzerklärung

**{business_name}** verpflichtet sich zum Schutz Ihrer Privatsphäre.

## Erhobene Daten

- **Kontodaten**: Name, E-Mail, Adresse
- **Bestelldaten**: Produkte, Lieferadresse, Zahlungsmethode

## Ihre Rechte

Kontaktieren Sie uns unter **{email}** für Auskunft, Berichtigung oder Löschung.

*Letzte Aktualisierung: {date}*`,
        },
        fr: {
            title: 'Politique de Confidentialité',
            content: `# Politique de Confidentialité

**{business_name}** s'engage à protéger votre vie privée.

## Données Collectées

- **Données de compte**: nom, email, adresse
- **Données de commande**: produits, adresse de livraison, mode de paiement

## Vos Droits

Contactez-nous à **{email}** pour toute demande d'accès, de rectification ou de suppression.

*Dernière mise à jour: {date}*`,
        },
        it: {
            title: 'Informativa sulla Privacy',
            content: `# Informativa sulla Privacy

**{business_name}** si impegna a proteggere la vostra privacy.

## Dati Raccolti

- **Dati account**: nome, email, indirizzo
- **Dati ordini**: prodotti, indirizzo di spedizione, metodo di pagamento

## I Vostri Diritti

Contattateci a **{email}** per richieste di accesso, rettifica o cancellazione.

*Ultimo aggiornamento: {date}*`,
        },
    },
    terms: {
        es: {
            title: 'Términos y Condiciones',
            content: `# Términos y Condiciones

Bienvenido a **{business_name}**. Al utilizar nuestra tienda, acepta estos términos.

## Uso del Servicio

Nuestro servicio está disponible para personas mayores de 18 años.

## Pedidos y Pagos

Los precios incluyen IVA. Los pedidos se confirman por email tras el pago.

## Envíos y Devoluciones

Consulte nuestra política de envíos y devoluciones para más información.

## Contacto

**{email}** · **{domain}**

*Última actualización: {date}*`,
        },
        en: { title: 'Terms & Conditions', content: `# Terms & Conditions\n\nBy using **{business_name}**, you agree to these terms.\n\n## Orders & Payments\n\nPrices include applicable taxes. Orders are confirmed via email.\n\n## Contact\n\n**{email}** · **{domain}**\n\n*Last updated: {date}*` },
        de: { title: 'AGB', content: `# Allgemeine Geschäftsbedingungen\n\nDurch die Nutzung von **{business_name}** stimmen Sie diesen Bedingungen zu.\n\n## Kontakt\n\n**{email}**\n\n*Letzte Aktualisierung: {date}*` },
        fr: { title: 'Conditions Générales', content: `# Conditions Générales\n\nEn utilisant **{business_name}**, vous acceptez ces conditions.\n\n## Contact\n\n**{email}**\n\n*Dernière mise à jour: {date}*` },
        it: { title: 'Termini e Condizioni', content: `# Termini e Condizioni\n\nUtilizzando **{business_name}**, accettate questi termini.\n\n## Contatto\n\n**{email}**\n\n*Ultimo aggiornamento: {date}*` },
    },
    cookies: {
        es: {
            title: 'Política de Cookies',
            content: `# Política de Cookies

**{business_name}** utiliza cookies técnicas y funcionales necesarias para el correcto funcionamiento de la tienda.

## Tipos de Cookies

- **Cookies técnicas**: esenciales (sesión, carrito, preferencias)
- **Cookies analíticas**: mejora del servicio (anónimas)

## Gestión de Cookies

Puede configurar su navegador para bloquear cookies, aunque esto puede afectar la funcionalidad.

## Contacto

**{email}**

*Última actualización: {date}*`,
        },
        en: { title: 'Cookie Policy', content: `# Cookie Policy\n\n**{business_name}** uses technical cookies necessary for store operation.\n\n## Types\n\n- **Technical**: session, cart, preferences\n- **Analytics**: service improvement (anonymous)\n\n## Contact\n\n**{email}**\n\n*Last updated: {date}*` },
        de: { title: 'Cookie-Richtlinie', content: `# Cookie-Richtlinie\n\n**{business_name}** verwendet technisch notwendige Cookies.\n\n## Kontakt\n\n**{email}**\n\n*Letzte Aktualisierung: {date}*` },
        fr: { title: 'Politique de Cookies', content: `# Politique de Cookies\n\n**{business_name}** utilise des cookies techniques nécessaires.\n\n## Contact\n\n**{email}**\n\n*Dernière mise à jour: {date}*` },
        it: { title: 'Politica dei Cookie', content: `# Politica dei Cookie\n\n**{business_name}** utilizza cookie tecnici necessari.\n\n## Contatto\n\n**{email}**\n\n*Ultimo aggiornamento: {date}*` },
    },
    imprint: {
        es: {
            title: 'Aviso Legal',
            content: `# Aviso Legal

## Identificación del Titular

- **Nombre comercial**: {business_name}
- **Sitio web**: {domain}
- **Contacto**: {email}

## Propiedad Intelectual

Todos los contenidos son propiedad de **{business_name}** o se utilizan con licencia.

*Última actualización: {date}*`,
        },
        en: { title: 'Legal Notice', content: `# Legal Notice\n\n## Owner\n\n- **Business**: {business_name}\n- **Website**: {domain}\n- **Contact**: {email}\n\n*Last updated: {date}*` },
        de: { title: 'Impressum', content: `# Impressum\n\n## Angaben gemäß § 5 TMG\n\n- **Unternehmen**: {business_name}\n- **Website**: {domain}\n- **Kontakt**: {email}\n\n*Letzte Aktualisierung: {date}*` },
        fr: { title: 'Mentions Légales', content: `# Mentions Légales\n\n## Éditeur\n\n- **Entreprise**: {business_name}\n- **Site**: {domain}\n- **Contact**: {email}\n\n*Dernière mise à jour: {date}*` },
        it: { title: 'Note Legali', content: `# Note Legali\n\n## Titolare\n\n- **Azienda**: {business_name}\n- **Sito**: {domain}\n- **Contatto**: {email}\n\n*Ultimo aggiornamento: {date}*` },
    },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function interpolateContent(content: string, vars: Record<string, string>): string {
    return content
        .replace(/\{business_name\}/g, vars.business_name || 'Our Store')
        .replace(/\{domain\}/g, vars.domain || '')
        .replace(/\{email\}/g, vars.email || '')
        .replace(/\{date\}/g, new Date().toISOString().split('T')[0])
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
    const { lang, slug } = await params
    const type = SLUG_TO_TYPE[slug]
    if (!type) return {}

    const template = DEFAULT_CONTENT[type][lang] || DEFAULT_CONTENT[type].en
    return {
        title: template.title,
        robots: { index: true, follow: true },
    }
}

// ---------------------------------------------------------------------------
// Static generation for all valid legal slugs × locales
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
    return SUPPORTED_LOCALES.flatMap((lang: string) =>
        VALID_SLUGS.map(slug => ({ lang, slug }))
    )
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function LegalPage({ params }: LegalPageProps) {
    const { lang, slug } = await params
    const type = SLUG_TO_TYPE[slug]
    if (!type) notFound()

    // Get config for variable interpolation
    let config: Record<string, string | unknown> = {}
    try {
        const appConfig = await getConfig()
        config = appConfig as unknown as Record<string, string | unknown>
    } catch {
        // Config unavailable — use defaults
    }

    const vars = {
        business_name: String((config as Record<string, unknown>)?.store_name || (config as Record<string, unknown>)?.business_name || 'Our Store'),
        domain: String((config as Record<string, unknown>)?.domain || ''),
        email: String((config as Record<string, unknown>)?.contact_email || ''),
    }

    const template = DEFAULT_CONTENT[type][lang] || DEFAULT_CONTENT[type].en
    const content = interpolateContent(template.content, vars)

    return (
        <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
            <article className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{
                    __html: content
                        .replace(/^# (.+)/gm, '<h1>$1</h1>')
                        .replace(/^## (.+)/gm, '<h2>$1</h2>')
                        .replace(/^- \*\*(.+?)\*\*: (.+)/gm, '<li><strong>$1</strong>: $2</li>')
                        .replace(/^- (.+)/gm, '<li>$1</li>')
                        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.+?)\*/g, '<em>$1</em>')
                        .replace(/\n\n/g, '</p><p>')
                        .replace(/^(?!<[hlu])(.+)$/gm, '<p>$1</p>')
                }} />
            </article>
        </main>
    )
}
