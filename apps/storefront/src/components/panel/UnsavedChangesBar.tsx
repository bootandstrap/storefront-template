'use client'

/**
 * UnsavedChangesBar — Shopify-Style Floating Save Bar
 *
 * A fixed bottom bar that appears when form state is dirty.
 * Shows dirty field count, error state, and Save/Discard buttons.
 *
 * Animation: slides up from bottom with spring physics.
 * Success: brief green flash before sliding back down.
 *
 * Pairs with useFormGuard() hook.
 *
 * @module UnsavedChangesBar
 * @locked 🟡 YELLOW — UX infrastructure
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, Undo2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface UnsavedChangesBarProps {
    /** Whether the form has unsaved changes */
    isDirty: boolean
    /** Number of dirty fields */
    dirtyCount: number
    /** Whether save is in progress */
    isSaving: boolean
    /** Save error, if any */
    saveError: Error | null
    /** Whether save just succeeded */
    saveSuccess: boolean
    /** Save callback */
    onSave: () => void
    /** Discard callback */
    onDiscard: () => void
    /** Labels (i18n) */
    labels?: {
        unsavedChanges?: string
        fieldChanged?: string
        fieldsChanged?: string
        save?: string
        discard?: string
        saving?: string
        saved?: string
        errorPrefix?: string
    }
}

// --- Inline styles (Turbopack-proof, consistent with PanelSidebar) ---
const styles = {
    bar: {
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 90,
        padding: '0 16px 16px',
        pointerEvents: 'none' as const,
    },
    inner: {
        maxWidth: 800,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        borderRadius: 16,
        border: '1px solid rgba(139,195,74,0.2)',
        background: 'rgba(17,26,11,0.95)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 -4px 30px rgba(0,0,0,0.3), 0 0 60px rgba(139,195,74,0.05)',
        pointerEvents: 'auto' as const,
        color: 'rgba(255,255,255,0.85)',
    },
    innerError: {
        border: '1px solid rgba(239,68,68,0.3)',
        boxShadow: '0 -4px 30px rgba(0,0,0,0.3), 0 0 60px rgba(239,68,68,0.05)',
    },
    innerSuccess: {
        border: '1px solid rgba(34,197,94,0.3)',
        boxShadow: '0 -4px 30px rgba(0,0,0,0.3), 0 0 60px rgba(34,197,94,0.1)',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: '#f59e0b',
        boxShadow: '0 0 8px rgba(245,158,11,0.5)',
        flexShrink: 0,
        animation: 'pulse 2s infinite',
    },
    text: {
        flex: 1,
        fontSize: 13,
        fontWeight: 500 as const,
        minWidth: 0,
    },
    count: {
        fontWeight: 700 as const,
        fontVariantNumeric: 'tabular-nums' as const,
        color: '#f59e0b',
    },
    btnPrimary: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 20px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600 as const,
        background: '#8BC34A',
        color: '#111A0B',
        border: 'none',
        cursor: 'pointer' as const,
        transition: 'background 0.2s, transform 0.15s',
        whiteSpace: 'nowrap' as const,
    },
    btnSecondary: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 500 as const,
        background: 'rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.6)',
        border: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer' as const,
        transition: 'background 0.2s, color 0.2s',
        whiteSpace: 'nowrap' as const,
    },
}

export default function UnsavedChangesBar({
    isDirty,
    dirtyCount,
    isSaving,
    saveError,
    saveSuccess,
    onSave,
    onDiscard,
    labels = {},
}: UnsavedChangesBarProps) {
    const l = {
        unsavedChanges: labels.unsavedChanges || 'Unsaved changes',
        fieldChanged: labels.fieldChanged || 'field changed',
        fieldsChanged: labels.fieldsChanged || 'fields changed',
        save: labels.save || 'Save',
        discard: labels.discard || 'Discard',
        saving: labels.saving || 'Saving…',
        saved: labels.saved || 'Saved',
        errorPrefix: labels.errorPrefix || 'Error:',
    }

    // Compute visibility: show when dirty OR during save success flash
    const [showSuccessFlash, setShowSuccessFlash] = useState(false)
    useEffect(() => {
        if (saveSuccess) {
            setShowSuccessFlash(true)
            const timer = setTimeout(() => setShowSuccessFlash(false), 2000)
            return () => clearTimeout(timer)
        }
    }, [saveSuccess])

    const isVisible = isDirty || isSaving || showSuccessFlash

    // Determine state for styling
    const barState = saveError ? 'error' : showSuccessFlash ? 'success' : 'dirty'

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 35,
                        mass: 0.8,
                    }}
                    style={styles.bar}
                >
                    <div
                        style={{
                            ...styles.inner,
                            ...(barState === 'error' ? styles.innerError : {}),
                            ...(barState === 'success' ? styles.innerSuccess : {}),
                        }}
                    >
                        {/* Status indicator */}
                        {barState === 'success' ? (
                            <CheckCircle2 style={{ width: 18, height: 18, color: '#22c55e', flexShrink: 0 }} />
                        ) : barState === 'error' ? (
                            <AlertCircle style={{ width: 18, height: 18, color: '#ef4444', flexShrink: 0 }} />
                        ) : (
                            <span style={styles.dot} />
                        )}

                        {/* Message */}
                        <span style={styles.text}>
                            {barState === 'success' ? (
                                <span style={{ color: '#22c55e', fontWeight: 600 }}>{l.saved} ✓</span>
                            ) : barState === 'error' ? (
                                <span style={{ color: '#fca5a5' }}>
                                    {l.errorPrefix} {saveError?.message || 'Unknown error'}
                                </span>
                            ) : (
                                <>
                                    {l.unsavedChanges}
                                    <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.3)' }}>·</span>
                                    <span style={styles.count}>{dirtyCount}</span>{' '}
                                    {dirtyCount === 1 ? l.fieldChanged : l.fieldsChanged}
                                </>
                            )}
                        </span>

                        {/* Actions */}
                        {barState !== 'success' && (
                            <>
                                <button
                                    type="button"
                                    onClick={onDiscard}
                                    disabled={isSaving}
                                    style={{
                                        ...styles.btnSecondary,
                                        ...(isSaving ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
                                    }}
                                >
                                    <Undo2 style={{ width: 14, height: 14 }} />
                                    {l.discard}
                                </button>
                                <button
                                    type="button"
                                    onClick={onSave}
                                    disabled={isSaving || !isDirty}
                                    style={{
                                        ...styles.btnPrimary,
                                        ...(isSaving ? { opacity: 0.7, cursor: 'wait' } : {}),
                                    }}
                                >
                                    {isSaving ? (
                                        <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                                    ) : (
                                        <Save style={{ width: 14, height: 14 }} />
                                    )}
                                    {isSaving ? l.saving : l.save}
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
