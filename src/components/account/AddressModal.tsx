'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

export interface AddressFormData {
    first_name: string
    last_name: string
    address_1: string
    address_2: string
    city: string
    province: string
    postal_code: string
    country_code: string
    phone: string
    company: string
}

interface AddressModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: AddressFormData) => Promise<void>
    initial?: Partial<AddressFormData>
    t: (key: string) => string
    mode: 'create' | 'edit'
}

const EMPTY_FORM: AddressFormData = {
    first_name: '',
    last_name: '',
    address_1: '',
    address_2: '',
    city: '',
    province: '',
    postal_code: '',
    country_code: 'ES',
    phone: '',
    company: '',
}

export default function AddressModal({
    isOpen,
    onClose,
    onSubmit,
    initial,
    t,
    mode,
}: AddressModalProps) {
    const [form, setForm] = useState<AddressFormData>({
        ...EMPTY_FORM,
        ...initial,
    })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    if (!isOpen) return null

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
        setError('')
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.first_name || !form.last_name || !form.address_1 || !form.city || !form.postal_code) {
            setError(t('address.requiredFields') || 'Please fill all required fields')
            return
        }
        setSubmitting(true)
        try {
            await onSubmit(form)
            onClose()
        } catch {
            setError(t('address.saveFailed') || 'Failed to save address')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative glass rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold font-display text-text-primary">
                        {mode === 'create' ? t('address.addNew') : t('address.edit')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-surface/50 transition-colors"
                    >
                        <X className="w-5 h-5 text-text-muted" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-text-muted mb-1">
                                {t('address.firstName')} *
                            </label>
                            <input
                                name="first_name"
                                value={form.first_name}
                                onChange={handleChange}
                                className="input w-full"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-text-muted mb-1">
                                {t('address.lastName')} *
                            </label>
                            <input
                                name="last_name"
                                value={form.last_name}
                                onChange={handleChange}
                                className="input w-full"
                                required
                            />
                        </div>
                    </div>

                    {/* Company */}
                    <div>
                        <label className="block text-xs text-text-muted mb-1">
                            {t('address.company')}
                        </label>
                        <input
                            name="company"
                            value={form.company}
                            onChange={handleChange}
                            className="input w-full"
                        />
                    </div>

                    {/* Address 1 */}
                    <div>
                        <label className="block text-xs text-text-muted mb-1">
                            {t('address.address1')} *
                        </label>
                        <input
                            name="address_1"
                            value={form.address_1}
                            onChange={handleChange}
                            className="input w-full"
                            required
                        />
                    </div>

                    {/* Address 2 */}
                    <div>
                        <label className="block text-xs text-text-muted mb-1">
                            {t('address.address2')}
                        </label>
                        <input
                            name="address_2"
                            value={form.address_2}
                            onChange={handleChange}
                            className="input w-full"
                        />
                    </div>

                    {/* City + Postal code */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-text-muted mb-1">
                                {t('address.city')} *
                            </label>
                            <input
                                name="city"
                                value={form.city}
                                onChange={handleChange}
                                className="input w-full"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-text-muted mb-1">
                                {t('address.postalCode')} *
                            </label>
                            <input
                                name="postal_code"
                                value={form.postal_code}
                                onChange={handleChange}
                                className="input w-full"
                                required
                            />
                        </div>
                    </div>

                    {/* Province + Country */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-text-muted mb-1">
                                {t('address.province')}
                            </label>
                            <input
                                name="province"
                                value={form.province}
                                onChange={handleChange}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-text-muted mb-1">
                                {t('address.country')} *
                            </label>
                            <input
                                name="country_code"
                                value={form.country_code}
                                onChange={handleChange}
                                className="input w-full"
                                placeholder="ES"
                                maxLength={2}
                                required
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-xs text-text-muted mb-1">
                            {t('address.phone')}
                        </label>
                        <input
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            className="input w-full"
                            type="tel"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-red-400">{error}</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-ghost flex-1"
                        >
                            {t('common.cancel') || 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {mode === 'create'
                                ? t('address.save') || 'Save'
                                : t('address.update') || 'Update'
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
