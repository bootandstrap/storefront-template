'use client'

import { useCallback, useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useCheckoutModalFocus(
    isOpen: boolean,
    onClose: () => void,
    step: string,
    loadingMethods: boolean,
    methodsError: string | null
) {
    const modalRef = useRef<HTMLDivElement>(null)
    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const previousFocusRef = useRef<HTMLElement | null>(null)

    useEffect(() => {
        if (!isOpen) return
        previousFocusRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null
        const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus())

        return () => {
            cancelAnimationFrame(focusFrame)
            previousFocusRef.current?.focus()
            previousFocusRef.current = null
        }
    }, [isOpen])

    const handleModalKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
            return
        }
        if (event.key !== 'Tab' || !modalRef.current) return

        const focusable = Array.from(
            modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (!modalRef.current.contains(document.activeElement)) {
            event.preventDefault()
            ;(event.shiftKey ? last : first).focus()
        } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
        }
    }, [onClose])

    useEffect(() => {
        if (!isOpen) return
        document.addEventListener('keydown', handleModalKeyDown)
        return () => document.removeEventListener('keydown', handleModalKeyDown)
    }, [handleModalKeyDown, isOpen])

    useEffect(() => {
        if (
            !isOpen
            || !modalRef.current
            || modalRef.current.contains(document.activeElement)
        ) return

        const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus())
        return () => cancelAnimationFrame(focusFrame)
    }, [isOpen, loadingMethods, methodsError, step])

    return { closeButtonRef, modalRef }
}
