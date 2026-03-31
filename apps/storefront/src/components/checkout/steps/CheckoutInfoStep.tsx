'use client'

import { User } from 'lucide-react'

interface CheckoutInfoStepProps {
    firstName: string
    lastName: string
    email: string
    phone: string
    onFirstNameChange: (v: string) => void
    onLastNameChange: (v: string) => void
    onEmailChange: (v: string) => void
    onPhoneChange: (v: string) => void
    t: (key: string) => string
}

export default function CheckoutInfoStep({
    firstName,
    lastName,
    email,
    phone,
    onFirstNameChange,
    onLastNameChange,
    onEmailChange,
    onPhoneChange,
    t,
}: CheckoutInfoStepProps) {
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-brand" />
                <h3 className="font-bold">{t('checkout.steps.info')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-sm text-tx-sec block mb-1">
                        {t('checkout.form.firstName') || 'Nombre'} *
                    </label>
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => onFirstNameChange(e.target.value)}
                        placeholder={t('checkout.form.firstNamePlaceholder') || 'Juan'}
                        className="input w-full"
                        required
                    />
                </div>
                <div>
                    <label className="text-sm text-tx-sec block mb-1">
                        {t('checkout.form.lastName') || 'Apellido'} *
                    </label>
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => onLastNameChange(e.target.value)}
                        placeholder={t('checkout.form.lastNamePlaceholder') || 'García'}
                        className="input w-full"
                        required
                    />
                </div>
            </div>
            <div>
                <label className="text-sm text-tx-sec block mb-1">
                    {t('checkout.form.email')}
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder="tu@email.com"
                    className="input w-full"
                />
            </div>
            <div>
                <label className="text-sm text-tx-sec block mb-1">
                    {t('checkout.form.phone')}
                </label>
                <input
                    type="tel"
                    value={phone}
                    onChange={(e) => onPhoneChange(e.target.value)}
                    placeholder="+34 600 123 456"
                    className="input w-full"
                />
            </div>
        </div>
    )
}
