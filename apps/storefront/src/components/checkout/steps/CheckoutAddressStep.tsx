'use client'

import { useMemo } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import type { FeatureFlags } from '@/lib/config'

export interface CheckoutCountry {
    iso_2: string
    display_name: string
}

interface CheckoutAddressStepProps {
    street: string
    street2: string
    city: string
    postalCode: string
    countryCode: string
    notes: string
    addressLoading: boolean
    featureFlags: FeatureFlags
    countries?: CheckoutCountry[]
    lang?: string
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
    countries = [],
    lang = 'en',
    onStreetChange,
    onStreet2Change,
    onCityChange,
    onPostalCodeChange,
    onCountryCodeChange,
    onNotesChange,
    t,
}: CheckoutAddressStepProps) {
    // Locale-aware country display names via Intl API
    const displayNames = useMemo(() => {
        try {
            return new Intl.DisplayNames([lang], { type: 'region' })
        } catch {
            return null
        }
    }, [lang])

    const localizedCountries = useMemo(() => {
        if (countries.length === 0) return []
        return countries.map((c) => ({
            iso_2: c.iso_2.toLowerCase(),
            name: displayNames?.of(c.iso_2.toUpperCase()) ?? c.display_name,
        })).sort((a, b) => a.name.localeCompare(b.name, lang))
    }, [countries, displayNames, lang])

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-brand" />
                <h3 className="font-bold">{t('checkout.steps.address')}</h3>
            </div>
            <div>
                <label htmlFor="checkout-street" className="text-sm text-tx-sec block mb-1">
                    {t('checkout.form.street') || 'Address'} *
                </label>
                <input
                    id="checkout-street"
                    name="checkout-street"
                    type="text"
                    value={street}
                    onChange={(e) => onStreetChange(e.target.value)}
                    placeholder={t('checkout.form.streetPlaceholder') || '123 Main Street'}
                    className="input w-full"
                    required
                />
            </div>
            <div>
                <label htmlFor="checkout-street2" className="text-sm text-tx-sec block mb-1">
                    {t('checkout.form.street2') || 'Apt / Suite (optional)'}
                </label>
                <input
                    id="checkout-street2"
                    name="checkout-street2"
                    type="text"
                    value={street2}
                    onChange={(e) => onStreet2Change(e.target.value)}
                    placeholder={t('checkout.form.street2Placeholder') || '2B'}
                    className="input w-full"
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label htmlFor="checkout-city" className="text-sm text-tx-sec block mb-1">
                        {t('checkout.form.city') || 'City'} *
                    </label>
                    <input
                        id="checkout-city"
                        name="checkout-city"
                        type="text"
                        value={city}
                        onChange={(e) => onCityChange(e.target.value)}
                        placeholder={t('checkout.form.cityPlaceholder') || 'City'}
                        className="input w-full"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="checkout-postal-code" className="text-sm text-tx-sec block mb-1">
                        {t('checkout.form.postalCode') || 'Postal code'} *
                    </label>
                    <input
                        id="checkout-postal-code"
                        name="checkout-postal-code"
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
                <label htmlFor="checkout-country" className="text-sm text-tx-sec block mb-1">
                    {t('checkout.form.country') || 'Country'} *
                </label>
                <select
                    id="checkout-country"
                    name="checkout-country"
                    value={countryCode}
                    onChange={(e) => onCountryCodeChange(e.target.value)}
                    className="input w-full"
                >
                    {localizedCountries.length > 0 ? (
                        localizedCountries.map((c) => (
                            <option key={c.iso_2} value={c.iso_2}>
                                {c.name}
                            </option>
                        ))
                    ) : (
                        <option value={countryCode}>
                            {displayNames?.of(countryCode.toUpperCase()) ?? countryCode}
                        </option>
                    )}
                </select>
            </div>
            {featureFlags.enable_order_notes && (
                <div>
                    <label htmlFor="checkout-notes" className="text-sm text-tx-sec block mb-1">
                        {t('checkout.form.notes')}
                    </label>
                    <textarea
                        id="checkout-notes"
                        name="checkout-notes"
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
                    <Loader2 className="w-4 h-4 animate-spin text-brand" />
                    <span className="ml-2 text-sm text-tx-muted">
                        {t('checkout.savingAddress') || 'Saving address...'}
                    </span>
                </div>
            )}
        </div>
    )
}
