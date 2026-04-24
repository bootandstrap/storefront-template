'use client'

import { useState, useCallback } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { X, Check, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'
import { logger } from '@/lib/logger'

interface AvatarCropModalProps {
    imageSrc: string
    onCropComplete: (blob: Blob) => void
    onCancel: () => void
}

/**
 * Crops the image using a canvas element.
 * Takes the crop area coordinates and produces a square blob.
 */
async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
    const image = new window.Image()
    image.crossOrigin = 'anonymous'

    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = reject
        image.src = imageSrc
    })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const size = 256 // Output size

    canvas.width = size
    canvas.height = size

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        size,
        size
    )

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob)
                else reject(new Error('Canvas toBlob failed'))
            },
            'image/webp',
            0.85
        )
    })
}

export default function AvatarCropModal({ imageSrc, onCropComplete, onCancel }: AvatarCropModalProps) {
    const { t } = useI18n()
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [croppedArea, setCroppedArea] = useState<Area | null>(null)
    const [processing, setProcessing] = useState(false)

    const onCropDone = useCallback((_: Area, croppedAreaPixels: Area) => {
        setCroppedArea(croppedAreaPixels)
    }, [])

    const handleConfirm = useCallback(async () => {
        if (!croppedArea) return
        setProcessing(true)
        try {
            const blob = await getCroppedBlob(imageSrc, croppedArea)
            onCropComplete(blob)
        } catch (err) {
            logger.error('Crop failed:', err)
        } finally {
            setProcessing(false)
        }
    }, [croppedArea, imageSrc, onCropComplete])

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-sf-0 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-sf-3">
                    <h3 className="text-sm font-semibold text-tx">
                        {t('avatar.cropTitle') || 'Crop Avatar'}
                    </h3>
                    <button onClick={onCancel} className="p-1 rounded-lg hover:bg-sf-2 transition-colors">
                        <X className="w-4 h-4 text-tx-muted" />
                    </button>
                </div>

                {/* Cropper area */}
                <div className="relative w-full" style={{ height: 320 }}>
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        onCropComplete={onCropDone}
                        style={{
                            containerStyle: { backgroundColor: '#111' },
                        }}
                    />
                </div>

                {/* Controls */}
                <div className="px-4 py-3 space-y-3 border-t border-sf-3">
                    {/* Zoom slider */}
                    <div className="flex items-center gap-3">
                        <ZoomOut className="w-3.5 h-3.5 text-tx-muted shrink-0" />
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1 accent-brand h-1"
                        />
                        <ZoomIn className="w-3.5 h-3.5 text-tx-muted shrink-0" />

                        <button
                            onClick={() => setRotation((r) => (r + 90) % 360)}
                            className="p-1.5 rounded-lg border border-sf-3 hover:border-brand text-tx-muted hover:text-brand transition-colors ml-2"
                            aria-label="Rotate"
                        >
                            <RotateCw className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={onCancel}
                            className="btn btn-secondary flex-1 text-sm"
                        >
                            {t('common.cancel') || 'Cancel'}
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={processing || !croppedArea}
                            className="btn btn-primary flex-1 text-sm"
                        >
                            {processing ? (
                                <span className="animate-spin">⏳</span>
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            {t('avatar.apply') || 'Apply'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
