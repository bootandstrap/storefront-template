'use client'

import { MapPin, Loader2 } from 'lucide-react'
import type { FeatureFlags } from '@/lib/config'

interface CheckoutAddressStepProps {
    street: string
    street2: string
    city: string
    postalCode: string
    countryCode: string
    notes: string
    addressLoading: boolean
    featureFlags: FeatureFlags
    onStreetChange: (v: string) => void
    onStreet2Change: (v: string) => void
    onCityChange: (v: string) => void
    onPostalCodeChange: (v: string) => void
    onCountryCodeChange: (v: string) => void
    onNotesChange: (v: string) => void
    t: (key: string) => string
}

export default function CheckoutAddressStep({
    street,
    street2,
    city,
    postalCode,
    countryCode,
    notes,
    addressLoading,
    featureFlags,
    onStreetChange,
    onStreet2Change,
    onCityChange,
    onPostalCodeChange,
    onCountryCodeChange,
    onNotesChange,
    t,
}: CheckoutAddressStepProps) {
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="font-bold">{t('checkout.steps.address')}</h3>
            </div>
            <div>
                <label className="text-sm text-text-secondary block mb-1">
                    {t('checkout.form.street') || 'Dirección'} *
                </label>
                <input
                    type="text"
                    value={street}
                    onChange={(e) => onStreetChange(e.target.value)}
                    placeholder={t('checkout.form.streetPlaceholder') || 'Calle Mayor 123'}
                    className="input w-full"
                    required
                />
            </div>
            <div>
                <label className="text-sm text-text-secondary block mb-1">
                    {t('checkout.form.street2') || 'Piso / Puerta (opcional)'}
                </label>
                <input
                    type="text"
                    value={street2}
                    onChange={(e) => onStreet2Change(e.target.value)}
                    placeholder={t('checkout.form.street2Placeholder') || '2ºB'}
                    className="input w-full"
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-sm text-text-secondary block mb-1">
                        {t('checkout.form.city') || 'Ciudad'} *
                    </label>
                    <input
                        type="text"
                        value={city}
                        onChange={(e) => onCityChange(e.target.value)}
                        placeholder={t('checkout.form.cityPlaceholder') || 'Madrid'}
                        className="input w-full"
                        required
                    />
                </div>
                <div>
                    <label className="text-sm text-text-secondary block mb-1">
                        {t('checkout.form.postalCode') || 'C.P.'} *
                    </label>
                    <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => onPostalCodeChange(e.target.value)}
                        placeholder="28001"
                        className="input w-full"
                        required
                    />
                </div>
            </div>
            <div>
                <label className="text-sm text-text-secondary block mb-1">
                    {t('checkout.form.country') || 'País'} *
                </label>
                <select
                    value={countryCode}
                    onChange={(e) => onCountryCodeChange(e.target.value)}
                    className="input w-full"
                >
                    <option value="ES">España</option>
                    <option value="CO">Colombia</option>
                    <option value="MX">México</option>
                    <option value="AR">Argentina</option>
                    <option value="CL">Chile</option>
                    <option value="DE">Alemania</option>
                    <option value="FR">Francia</option>
                    <option value="IT">Italia</option>
                    <option value="US">Estados Unidos</option>
                    <option value="GB">Reino Unido</option>
                </select>
            </div>
            {featureFlags.enable_order_notes && (
                <div>
                    <label className="text-sm text-text-secondary block mb-1">
                        {t('checkout.form.notes')}
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => onNotesChange(e.target.value)}
                        placeholder={t('checkout.form.notesPlaceholder')}
                        rows={3}
                        className="input w-full resize-none"
                    />
                </div>
            )}
            {addressLoading && (
                <div className="flex items-center justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-text-muted">
                        {t('checkout.savingAddress') || 'Guardando dirección...'}
                    </span>
                </div>
            )}
        </div>
    )
}
