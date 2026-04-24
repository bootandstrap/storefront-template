'use client'

/**
 * useFormGuard — Tracks unsaved changes and provides a Shopify-style save guard
 *
 * Detects dirty state by comparing current values to initial values.
 * Provides:
 *   - isDirty: boolean indicating if any field changed
 *   - dirtyFields: set of changed field keys
 *   - save(): async function to submit changes
 *   - discard(): reset to initial values
 *   - beforeUnload event listener (warns on tab close with unsaved changes)
 *
 * Design decision: Explicit Save (Shopify-style)
 *   - No auto-save, no debounce
 *   - Floating bar appears when dirty
 *   - Owner must explicitly click Save or Discard
 *   - beforeunload prevents accidental data loss
 *
 * @module useFormGuard
 * @locked 🟡 YELLOW — UX infrastructure
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

export interface FormGuardOptions<T extends Record<string, unknown>> {
    /** Initial form values (from server) */
    initialValues: T
    /** Async function to persist changes */
    onSave: (values: T) => Promise<void>
    /** Optional callback after successful save */
    onSaveSuccess?: () => void
    /** Optional callback on save error */
    onSaveError?: (error: Error) => void
    /** Whether to warn before unload (default: true) */
    warnOnUnload?: boolean
}

export interface FormGuardReturn<T extends Record<string, unknown>> {
    /** Current form values */
    values: T
    /** Whether any field differs from initial */
    isDirty: boolean
    /** Set of changed field keys */
    dirtyFields: Set<string>
    /** Number of changed fields */
    dirtyCount: number
    /** Whether a save is in progress */
    isSaving: boolean
    /** Last save error, if any */
    saveError: Error | null
    /** Whether save succeeded (resets after 3s) */
    saveSuccess: boolean
    /** Update a single field */
    setValue: <K extends keyof T>(key: K, value: T[K]) => void
    /** Update multiple fields at once */
    setValues: (partial: Partial<T>) => void
    /** Submit current values via onSave */
    save: () => Promise<void>
    /** Reset to initial values */
    discard: () => void
    /** Reset initial values (e.g., after server refetch) */
    resetInitial: (newInitial: T) => void
}

export function useFormGuard<T extends Record<string, unknown>>({
    initialValues,
    onSave,
    onSaveSuccess,
    onSaveError,
    warnOnUnload = true,
}: FormGuardOptions<T>): FormGuardReturn<T> {
    const [values, setValuesState] = useState<T>(initialValues)
    const [initial, setInitial] = useState<T>(initialValues)
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<Error | null>(null)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Compute dirty state
    const dirtyFields = useMemo(() => {
        const dirty = new Set<string>()
        for (const key of Object.keys(initial)) {
            const initialVal = initial[key]
            const currentVal = values[key]
            // Deep comparison for objects/arrays, strict for primitives
            if (typeof initialVal === 'object' && initialVal !== null) {
                if (JSON.stringify(initialVal) !== JSON.stringify(currentVal)) {
                    dirty.add(key)
                }
            } else if (initialVal !== currentVal) {
                dirty.add(key)
            }
        }
        return dirty
    }, [values, initial])

    const isDirty = dirtyFields.size > 0
    const dirtyCount = dirtyFields.size

    // Set a single value
    const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
        setValuesState(prev => ({ ...prev, [key]: value }))
        setSaveError(null)
        setSaveSuccess(false)
    }, [])

    // Set multiple values
    const setValues = useCallback((partial: Partial<T>) => {
        setValuesState(prev => ({ ...prev, ...partial }))
        setSaveError(null)
        setSaveSuccess(false)
    }, [])

    // Save
    const save = useCallback(async () => {
        if (!isDirty || isSaving) return
        setIsSaving(true)
        setSaveError(null)
        setSaveSuccess(false)

        try {
            await onSave(values)
            setInitial(values) // After save, current becomes the new baseline
            setSaveSuccess(true)
            onSaveSuccess?.()

            // Clear success after 3s
            if (successTimerRef.current) clearTimeout(successTimerRef.current)
            successTimerRef.current = setTimeout(() => setSaveSuccess(false), 3000)
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err))
            setSaveError(error)
            onSaveError?.(error)
        } finally {
            setIsSaving(false)
        }
    }, [isDirty, isSaving, values, onSave, onSaveSuccess, onSaveError])

    // Discard
    const discard = useCallback(() => {
        setValuesState(initial)
        setSaveError(null)
        setSaveSuccess(false)
    }, [initial])

    // Reset initial (for server refetch)
    const resetInitial = useCallback((newInitial: T) => {
        setInitial(newInitial)
        setValuesState(newInitial)
        setSaveError(null)
        setSaveSuccess(false)
    }, [])

    // beforeunload guard
    useEffect(() => {
        if (!warnOnUnload || !isDirty) return

        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault()
            // Modern browsers show their own message regardless
        }

        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [isDirty, warnOnUnload])

    // Cleanup
    useEffect(() => {
        return () => {
            if (successTimerRef.current) clearTimeout(successTimerRef.current)
        }
    }, [])

    return {
        values,
        isDirty,
        dirtyFields,
        dirtyCount,
        isSaving,
        saveError,
        saveSuccess,
        setValue,
        setValues,
        save,
        discard,
        resetInitial,
    }
}
