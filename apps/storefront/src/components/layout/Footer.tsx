import Link from 'next/link'
import { CreditCard, Banknote, MessageCircle, Shield, Phone, Mail, MapPin } from 'lucide-react'
import type { Dictionary } from '@/lib/i18n'
import { createTranslator } from '@/lib/i18n'
import type { StoreConfig, FeatureFlags } from '@/lib/config'
import NewsletterSignup from '@/components/newsletter/NewsletterSignup'

interface FooterProps {
    config: StoreConfig
    featureFlags: FeatureFlags
    dictionary: Dictionary
    lang: string
}

export default function Footer({ config, featureFlags, dictionary, lang }: FooterProps) {
    const t = createTranslator(dictionary)
    const year = new Date().getFullYear()
    const businessName = config.business_name || 'Store'

    return (
        <footer data-testid="main-footer" className="bg-surface-1 border-t border-surface-3">
            <div className="container-page py-12 md:py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <h3 className="text-lg font-bold font-display text-text-primary mb-3">
                            {businessName}
                        </h3>
                        {config.footer_description && (
                            <p className="text-sm text-text-muted leading-relaxed">
                                {config.footer_description}
                            </p>
                        )}

                        {/* Social links — gated by enable_social_links */}
                        {featureFlags.enable_social_links && (config.social_instagram || config.social_facebook || config.social_tiktok) && (
                            <div className="mt-4">
                                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                                    {t('footer.followUs')}
                                </p>
                                <div className="flex gap-3">
                                    {config.social_instagram && (
                                        <a href={config.social_instagram} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-primary transition-colors" aria-label="Instagram">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                                        </a>
                                    )}
                                    {config.social_facebook && (
                                        <a href={config.social_facebook} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-primary transition-colors" aria-label="Facebook">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                        </a>
                                    )}
                                    {config.social_tiktok && (
                                        <a href={config.social_tiktok} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-primary transition-colors" aria-label="TikTok">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Store nav */}
                    <div>
                        <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
                            {t('footer.shop')}
                        </h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href={`/${lang}/productos`} className="text-sm text-text-muted hover:text-primary transition-colors">
                                    {t('nav.products')}
                                </Link>
                            </li>
                            <li>
                                <Link href={`/${lang}/carrito`} className="text-sm text-text-muted hover:text-primary transition-colors">
                                    {t('nav.cart')}
                                </Link>
                            </li>
                            {/* Account link — only when customer accounts are enabled */}
                            {featureFlags.enable_customer_accounts && (
                                <li>
                                    <Link href={`/${lang}/cuenta`} className="text-sm text-text-muted hover:text-primary transition-colors">
                                        {t('nav.account')}
                                    </Link>
                                </li>
                            )}
                            <li>
                                <Link href={`/${lang}/pedido`} className="text-sm text-text-muted hover:text-primary transition-colors">
                                    {t('order.lookup')}
                                </Link>
                            </li>
                            <li>
                                <Link href={`/${lang}/faq`} className="text-sm text-text-muted hover:text-primary transition-colors">
                                    {t('footer.faq')}
                                </Link>
                            </li>
                            <li>
                                <Link href={`/${lang}/about`} className="text-sm text-text-muted hover:text-primary transition-colors">
                                    {t('footer.about')}
                                </Link>
                            </li>
                            <li>
                                <Link href={`/${lang}/legal/devoluciones`} className="text-sm text-text-muted hover:text-primary transition-colors">
                                    {t('footer.returns')}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
                            {t('footer.legal')}
                        </h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href={`/${lang}/legal/terminos`} className="text-sm text-text-muted hover:text-primary transition-colors">
                                    {t('footer.terms')}
                                </Link>
                            </li>
                            <li>
                                <Link href={`/${lang}/legal/privacidad`} className="text-sm text-text-muted hover:text-primary transition-colors">
                                    {t('footer.privacy')}
                                </Link>
                            </li>
                            <li>
                                <Link href={`/${lang}/legal/cookies`} className="text-sm text-text-muted hover:text-primary transition-colors">
                                    {t('footer.cookies')}
                                </Link>
                            </li>
                            <li>
                                <Link href={`/${lang}/legal/aviso`} className="text-sm text-text-muted hover:text-primary transition-colors">
                                    {t('footer.imprint')}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
                            {t('footer.contact')}
                        </h4>
                        <ul className="space-y-3">
                            {/* WhatsApp contact — gated by enable_whatsapp_contact */}
                            {featureFlags.enable_whatsapp_contact && config.whatsapp_number && (
                                <li>
                                    <a
                                        href={`https://wa.me/${config.whatsapp_number}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-text-muted hover:text-primary transition-colors"
                                    >
                                        <Phone className="w-4 h-4 flex-shrink-0" />
                                        {config.whatsapp_number}
                                    </a>
                                </li>
                            )}
                            {config.store_email && (
                                <li>
                                    <a
                                        href={`mailto:${config.store_email}`}
                                        className="flex items-center gap-2 text-sm text-text-muted hover:text-primary transition-colors"
                                    >
                                        <Mail className="w-4 h-4 flex-shrink-0" />
                                        {config.store_email}
                                    </a>
                                </li>
                            )}
                            {config.store_address && (
                                <li className="flex items-start gap-2 text-sm text-text-muted">
                                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    {config.store_address}
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Newsletter signup — gated by enable_newsletter */}
                {featureFlags.enable_newsletter && (
                    <div className="mt-10 pt-8 border-t border-surface-3">
                        <NewsletterSignup />
                    </div>
                )}

                {/* Payment badges — only show icons for enabled payment methods */}
                <div className="mt-10 pt-8 border-t border-surface-3">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Payment methods — flag-gated badges */}
                        <div className="flex items-center gap-3 text-text-muted">
                            <span className="text-xs font-medium">{t('footer.securePurchase')}:</span>
                            <div className="flex items-center gap-2">
                                {featureFlags.enable_online_payments && (
                                    <CreditCard className="w-6 h-6" />
                                )}
                                {featureFlags.enable_cash_on_delivery && (
                                    <Banknote className="w-6 h-6" />
                                )}
                                {featureFlags.enable_whatsapp_checkout && (
                                    <MessageCircle className="w-5 h-5" />
                                )}
                                <Shield className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Owner access — discrete link when customer login is hidden */}
                        {!featureFlags.enable_customer_accounts && (
                            <Link
                                href={`/${lang}/login`}
                                className="text-xs text-text-muted/50 hover:text-text-muted transition-colors"
                            >
                                {t('footer.ownerAccess')}
                            </Link>
                        )}

                        {/* Copyright */}
                        <p className="text-xs text-text-muted">
                            © {year} {businessName}. {t('footer.rights')}.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    )
}
