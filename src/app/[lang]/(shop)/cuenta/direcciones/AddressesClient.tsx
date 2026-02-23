'use client'

import { useState } from 'react'
import type { MedusaAddress } from '@/lib/medusa/client'
import type { Dictionary } from '@/lib/i18n'
import { createTranslator } from '@/lib/i18n'
import AddressCard from '@/components/account/AddressCard'
import AddressModal, { type AddressFormData } from '@/components/account/AddressModal'
import { createAddressAction, updateAddressAction, deleteAddressAction, setDefaultAddressAction } from './actions'
import { Plus, MapPin } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'

export default function AddressesClient({
    addresses: initialAddresses,
    dictionary,
    lang: _lang,
}: {
    addresses: MedusaAddress[]
    dictionary: Dictionary
    lang: string
}) {
    const t = createTranslator(dictionary)
    const { success, error: showError } = useToast()
    const [addresses, setAddresses] = useState(initialAddresses)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingAddress, setEditingAddress] = useState<MedusaAddress | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    async function handleCreate(data: AddressFormData) {
        const result = await createAddressAction(data)
        if (result.success && result.address) {
            setAddresses(prev => [...prev, result.address!])
            success(t('address.createSuccess') || 'Address created')
        } else {
            showError(t('address.saveFailed') || 'Failed to save')
        }
    }

    async function handleUpdate(data: AddressFormData) {
        if (!editingAddress) return
        const result = await updateAddressAction(editingAddress.id, data)
        if (result.success && result.address) {
            setAddresses(prev => prev.map(a => a.id === editingAddress.id ? result.address! : a))
            success(t('address.updateSuccess') || 'Address updated')
        } else {
            showError(t('address.saveFailed') || 'Failed to save')
        }
    }

    async function handleDelete(id: string) {
        const result = await deleteAddressAction(id)
        if (result.success) {
            setAddresses(prev => prev.filter(a => a.id !== id))
            success(t('address.deleteSuccess') || 'Address deleted')
        } else {
            showError(t('address.deleteFailed') || 'Failed to delete')
        }
        setDeleteConfirm(null)
    }

    async function handleSetDefault(id: string) {
        const result = await setDefaultAddressAction(id)
        if (result.success) {
            setAddresses(prev => prev.map(a => ({
                ...a,
                is_default_shipping: a.id === id,
            })))
            success(t('address.defaultSuccess') || 'Default address set')
        } else {
            showError(t('address.defaultFailed') || 'Failed to set default')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-display text-text-primary">
                    {t('account.addresses')}
                </h1>
                <button
                    onClick={() => {
                        setEditingAddress(null)
                        setModalOpen(true)
                    }}
                    className="btn btn-primary text-sm flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    {t('address.addNew')}
                </button>
            </div>

            {/* Address list */}
            {addresses.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                    <MapPin className="w-12 h-12 text-text-muted/40 mx-auto mb-3" />
                    <p className="text-text-muted text-sm mb-1">{t('address.noAddresses')}</p>
                    <p className="text-text-muted text-xs">{t('address.noAddressesHint')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map(address => (
                        <AddressCard
                            key={address.id}
                            address={address}
                            t={t}
                            onEdit={(id) => {
                                const addr = addresses.find(a => a.id === id)
                                if (addr) {
                                    setEditingAddress(addr)
                                    setModalOpen(true)
                                }
                            }}
                            onDelete={(id) => setDeleteConfirm(id)}
                            onSetDefault={handleSetDefault}
                        />
                    ))}
                </div>
            )}

            {/* Address modal (create/edit) */}
            <AddressModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false)
                    setEditingAddress(null)
                }}
                onSubmit={editingAddress ? handleUpdate : handleCreate}
                initial={editingAddress ? {
                    first_name: editingAddress.first_name ?? '',
                    last_name: editingAddress.last_name ?? '',
                    address_1: editingAddress.address_1 ?? '',
                    address_2: editingAddress.address_2 ?? '',
                    city: editingAddress.city ?? '',
                    province: editingAddress.province ?? '',
                    postal_code: editingAddress.postal_code ?? '',
                    country_code: editingAddress.country_code?.toUpperCase() ?? 'ES',
                    phone: editingAddress.phone ?? '',
                    company: editingAddress.company ?? '',
                } : undefined}
                t={t}
                mode={editingAddress ? 'edit' : 'create'}
            />

            {/* Delete confirmation modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setDeleteConfirm(null)}
                    />
                    <div className="relative glass rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-text-primary mb-2">
                            {t('address.confirmDelete') || 'Delete address?'}
                        </h3>
                        <p className="text-sm text-text-muted mb-4">
                            {t('address.confirmDeleteMessage') || 'This action cannot be undone.'}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="btn btn-ghost flex-1"
                            >
                                {t('common.cancel') || 'Cancel'}
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="btn flex-1 bg-red-500 text-white hover:bg-red-600"
                            >
                                {t('address.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
