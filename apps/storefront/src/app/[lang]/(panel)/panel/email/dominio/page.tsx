import EmailDomainClient from './EmailDomainClient'

export const metadata = {
    title: 'Dominio de Email — Panel',
    description: 'Configura tu dominio personalizado para envío de emails',
}

export default async function EmailDomainPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    return <EmailDomainClient lang={lang} />
}
