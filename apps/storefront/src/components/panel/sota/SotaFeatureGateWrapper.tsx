'use client'

import React, { useState } from 'react'
import { Sparkles, Lock } from 'lucide-react'
import ClientFeatureGate from '../../ui/ClientFeatureGate'

interface SotaFeatureGateWrapperProps {
    children: React.ReactNode
    isLocked: boolean
    flag: string
    /** Option to either blur the content completely, or just show a badge */
    variant?: 'blur' | 'badge'
}

export function SotaFeatureGateWrapper({ children, isLocked, flag, variant = 'blur' }: SotaFeatureGateWrapperProps) {
    const [isGateOpen, setIsGateOpen] = useState(false)

    if (!isLocked) {
        return <>{children}</>
    }

    return (
        <>
            <div className={`relative group ${variant === 'blur' ? 'overflow-hidden rounded-2xl' : ''}`}>
                {/* 1. Underlying component (blurred and unclickable) */}
                <div className={`pointer-events-none transition-all duration-500 ease-out ${variant === 'blur' ? 'opacity-40 blur-md grayscale-[40%]' : 'opacity-80'}`}>
                    {children}
                </div>

                {/* 2. SOTA Overlay */}
                <div 
                    className={`absolute inset-0 z-10 flex items-center justify-center cursor-pointer ${variant === 'blur' ? 'bg-sf-0/10' : ''}`}
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsGateOpen(true)
                    }}
                >
                    {/* The Glow Badge */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-sf-0/80 backdrop-blur-xl border border-sf-3 shadow-2xl rounded-full text-sm font-semibold tracking-wide text-tx-sec group-hover:text-brand transition-all duration-400 group-hover:scale-105 group-hover:-translate-y-1 group-hover:shadow-[0_8px_30px_rgb(139,195,74,0.2)]">
                        {variant === 'blur' ? <Lock className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-brand" />}
                        <span>Función Premium</span>
                    </div>
                </div>
            </div>

            <ClientFeatureGate 
                isOpen={isGateOpen}
                onClose={() => setIsGateOpen(false)}
                flag={flag}
            />
        </>
    )
}
