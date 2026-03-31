import type { MedusaAddress } from '@/lib/medusa/client'
import { MapPin, Star, Edit2, Trash2 } from 'lucide-react'

interface AddressCardProps {
    address: MedusaAddress
    t: (key: string) => string
    onEdit: (id: string) => void
    onDelete: (id: string) => void
    onSetDefault?: (id: string) => void
}

export default function AddressCard({
    address,
    t,
    onEdit,
    onDelete,
    onSetDefault,
}: AddressCardProps) {
    return (
        <div className={`glass rounded-xl p-5 relative group transition-all ${address.is_default_shipping ? 'ring-2 ring-soft' : ''
            }`}>
            {/* Default badge */}
            {address.is_default_shipping && (
                <span className="absolute -top-2 -right-2 bg-brand text-white text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {t('address.default')}
                </span>
            )}

            {/* Address content */}
            <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                <div className="text-sm space-y-0.5 flex-1 min-w-0">
                    <p className="font-medium text-tx">
                        {address.first_name ?? ''} {address.last_name ?? ''}
                    </p>
                    {address.company && (
                        <p className="text-tx-muted">{address.company}</p>
                    )}
                    {address.address_1 && (
                        <p className="text-tx-muted">{address.address_1}</p>
                    )}
                    {address.address_2 && (
                        <p className="text-tx-muted">{address.address_2}</p>
                    )}
                    <p className="text-tx-muted">
                        {address.postal_code ?? ''} {address.city ?? ''}
                        {address.province && `, ${address.province}`}
                    </p>
                    <p className="text-tx-muted">{address.country_code?.toUpperCase()}</p>
                    {address.phone && (
                        <p className="text-tx-muted text-xs mt-1">{address.phone}</p>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                <button
                    onClick={() => onEdit(address.id)}
                    className="flex items-center gap-1.5 text-xs text-brand hover:underline"
                >
                    <Edit2 className="w-3 h-3" />
                    {t('address.edit')}
                </button>
                {!address.is_default_shipping && onSetDefault && (
                    <button
                        onClick={() => onSetDefault(address.id)}
                        className="flex items-center gap-1.5 text-xs text-tx-muted hover:text-brand"
                    >
                        <Star className="w-3 h-3" />
                        {t('address.setDefault')}
                    </button>
                )}
                <button
                    onClick={() => onDelete(address.id)}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-500 ml-auto"
                >
                    <Trash2 className="w-3 h-3" />
                    {t('address.delete')}
                </button>
            </div>
        </div>
    )
}
