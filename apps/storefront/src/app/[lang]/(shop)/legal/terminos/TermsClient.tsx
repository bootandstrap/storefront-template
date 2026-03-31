'use client'

import {
    FileText, ShoppingCart, Undo2, Euro, Shield,
    Scale, Clock, AlertTriangle, Gavel, Mail
} from 'lucide-react'
import LegalAccordion from '@/components/legal/LegalAccordion'

interface TermsClientProps {
    lang: string
    t: (key: string) => string
    businessName: string
    domain: string
    contactEmail: string
}

export default function TermsClient({
    lang,
    t,
    businessName,
    domain,
    contactEmail,
}: TermsClientProps) {
    const isEs = lang === 'es'
    const lastUpdated = new Date().toLocaleDateString(isEs ? 'es-ES' : 'en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
    })

    const sections = [
        {
            id: 'general',
            icon: <FileText className="w-4 h-4" />,
            title: isEs ? '1. Disposiciones Generales' : '1. General Provisions',
            defaultOpen: true,
            content: (
                <div className="space-y-2">
                    <p>
                        {isEs
                            ? `Estos términos y condiciones regulan el uso de la tienda online de ${businessName || 'nuestra tienda'} (${domain || 'nuestro sitio web'}) y la relación contractual entre ${businessName || 'nosotros'} y usted, el cliente.`
                            : `These terms and conditions govern the use of the online store of ${businessName || 'our store'} (${domain || 'our website'}) and the contractual relationship between ${businessName || 'us'} and you, the customer.`
                        }
                    </p>
                    <p>
                        {isEs
                            ? 'Al realizar un pedido, usted acepta estos términos en su totalidad.'
                            : 'By placing an order, you accept these terms in their entirety.'
                        }
                    </p>
                </div>
            ),
        },
        {
            id: 'ordering',
            icon: <ShoppingCart className="w-4 h-4" />,
            title: isEs ? '2. Proceso de Pedido y Contrato' : '2. Ordering Process & Contract',
            content: (
                <div className="space-y-3">
                    {/* Visual stepper */}
                    <div className="grid sm:grid-cols-4 gap-2">
                        {(isEs
                            ? ['Selección de productos', 'Datos y pago', 'Confirmación del pedido', 'Contrato formalizado']
                            : ['Product selection', 'Details & payment', 'Order confirmation', 'Contract formed']
                        ).map((step, i) => (
                            <div key={i} className="glass rounded-lg p-3 text-center">
                                <div className="w-8 h-8 rounded-full bg-brand-subtle text-brand text-sm font-bold flex items-center justify-center mx-auto mb-2">
                                    {i + 1}
                                </div>
                                <p className="text-[11px] text-tx-muted">{step}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs">
                        {isEs
                            ? 'La presentación de productos en nuestra web no constituye una oferta vinculante. El contrato se formaliza cuando enviamos la confirmación de pedido por email.'
                            : 'The presentation of products on our website does not constitute a binding offer. The contract is formed when we send the order confirmation email.'
                        }
                    </p>
                </div>
            ),
        },
        {
            id: 'pricing',
            icon: <Euro className="w-4 h-4" />,
            title: isEs ? '3. Precios e Impuestos' : '3. Pricing & Taxes',
            content: (
                <div className="space-y-2">
                    <p>
                        {isEs
                            ? 'Todos los precios mostrados en nuestra tienda incluyen el IVA aplicable (IVA en España, MWST en Suiza, MwSt en Alemania), salvo indicación contraria.'
                            : 'All prices displayed in our store include applicable VAT (IVA in Spain, MWST in Switzerland, MwSt in Germany), unless otherwise stated.'
                        }
                    </p>
                    <p>
                        {isEs
                            ? 'Los gastos de envío se indican claramente antes de completar el pedido y se muestran por separado.'
                            : 'Shipping costs are clearly indicated before completing the order and are shown separately.'
                        }
                    </p>
                </div>
            ),
        },
        {
            id: 'withdrawal',
            icon: <Undo2 className="w-4 h-4" />,
            title: isEs ? '4. Derecho de Desistimiento (14 días)' : '4. Right of Withdrawal (14 days)',
            content: (
                <div className="space-y-3">
                    {/* Highlight card */}
                    <div className="bg-brand-subtle/30 border border-brand/20 rounded-xl p-4">
                        <div className="flex items-start gap-2">
                            <Clock className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-tx mb-1">
                                    {isEs ? '14 días naturales' : '14 calendar days'}
                                </p>
                                <p className="text-[11px] text-tx-muted">
                                    {isEs
                                        ? 'Conforme a la Directiva 2011/83/UE, usted tiene derecho a desistir del contrato en un plazo de 14 días naturales a partir de la recepción de los bienes, sin necesidad de justificación.'
                                        : 'In accordance with Directive 2011/83/EU, you have the right to withdraw from the contract within 14 calendar days of receiving the goods, without giving any reason.'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs font-semibold text-tx">{isEs ? 'Para ejercer su derecho:' : 'To exercise your right:'}</p>
                    <ol className="space-y-1.5 list-decimal list-inside text-xs">
                        <li>{isEs ? `Comunique su decisión por email a ${contactEmail || 'nuestro email de contacto'}` : `Communicate your decision by email to ${contactEmail || 'our contact email'}`}</li>
                        <li>{isEs ? 'Devuelva los productos en su embalaje original, sin uso' : 'Return the products in original packaging, unused'}</li>
                        <li>{isEs ? 'Recibirá el reembolso en un máximo de 14 días tras recibir la devolución' : 'You will receive a refund within 14 days of us receiving the return'}</li>
                    </ol>

                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                        <p className="text-[11px] text-red-500 flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>
                                {isEs
                                    ? 'Excepciones: productos perecederos, artículos personalizados, productos precintados por higiene (una vez abiertos) y contenido digital tras inicio de descarga.'
                                    : 'Exceptions: perishable goods, personalized items, hygiene-sealed products (once opened), and digital content after download begins.'
                                }
                            </span>
                        </p>
                    </div>
                </div>
            ),
        },
        {
            id: 'guarantee',
            icon: <Shield className="w-4 h-4" />,
            title: isEs ? '5. Garantía Legal' : '5. Legal Guarantee',
            content: (
                <div className="space-y-2">
                    <p>
                        {isEs
                            ? 'Todos los productos tienen una garantía legal de conformidad de 2 años desde la fecha de entrega, conforme a la Directiva (UE) 2019/771.'
                            : 'All products have a 2-year legal guarantee of conformity from the delivery date, in accordance with Directive (EU) 2019/771.'
                        }
                    </p>
                    <p>
                        {isEs
                            ? 'Si un producto no es conforme, tiene derecho a la reparación, sustitución, rebaja del precio o resolución del contrato.'
                            : 'If a product is not in conformity, you are entitled to repair, replacement, price reduction, or contract termination.'
                        }
                    </p>
                </div>
            ),
        },
        {
            id: 'liability',
            icon: <Scale className="w-4 h-4" />,
            title: isEs ? '6. Limitación de Responsabilidad' : '6. Limitation of Liability',
            content: (
                <p>
                    {isEs
                        ? `${businessName || 'Nuestra tienda'} no será responsable de daños indirectos, pérdidas de beneficios o daños derivados de caso fortuito o fuerza mayor. Nuestra responsabilidad queda limitada al importe del pedido.`
                        : `${businessName || 'Our store'} shall not be liable for indirect damages, loss of profits, or damages arising from force majeure. Our liability is limited to the order amount.`
                    }
                </p>
            ),
        },
        {
            id: 'jurisdiction',
            icon: <Gavel className="w-4 h-4" />,
            title: isEs ? '7. Jurisdicción y Ley Aplicable' : '7. Jurisdiction & Applicable Law',
            content: (
                <div className="space-y-2">
                    <p>
                        {isEs
                            ? 'Estos términos se rigen por la legislación aplicable según la ubicación del vendedor, sin perjuicio de las normas imperativas de protección del consumidor del país de residencia del cliente.'
                            : 'These terms are governed by the applicable law of the seller\'s jurisdiction, without prejudice to mandatory consumer protection rules of the customer\'s country of residence.'
                        }
                    </p>
                    <p>
                        {isEs
                            ? 'Para resolución alternativa de litigios: Plataforma ODR de la UE — https://ec.europa.eu/odr'
                            : 'For alternative dispute resolution: EU ODR Platform — https://ec.europa.eu/odr'
                        }
                    </p>
                </div>
            ),
        },
        {
            id: 'contact',
            icon: <Mail className="w-4 h-4" />,
            title: isEs ? '8. Contacto' : '8. Contact',
            content: (
                <div className="glass rounded-lg p-4 text-xs space-y-1">
                    <p className="font-semibold text-tx">{businessName || (isEs ? 'Nuestra Tienda' : 'Our Store')}</p>
                    {contactEmail && (
                        <p>Email: <a href={`mailto:${contactEmail}`} className="text-brand hover:underline">{contactEmail}</a></p>
                    )}
                    {domain && <p>Web: {domain}</p>}
                </div>
            ),
        },
    ]

    return (
        <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-subtle mb-4">
                    <FileText className="w-7 h-7 text-brand" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-display text-tx mb-3">
                    {isEs ? 'Términos y Condiciones' : 'Terms & Conditions'}
                </h1>
                <p className="text-tx-muted">
                    {isEs ? 'Condiciones generales de contratación de nuestra tienda online.' : 'General terms and conditions of our online store.'}
                </p>
                <p className="text-xs text-tx-faint mt-2">
                    {isEs ? 'Última actualización' : 'Last updated'}: {lastUpdated}
                </p>
            </div>

            <LegalAccordion items={sections} allowMultiple />
        </div>
    )
}
