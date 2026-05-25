'use client'

import { startTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveStarterRequestResponse, uploadStarterRequestAssets } from '@/lib/starter-build/owner-actions'
import type { StarterOwnerRequest } from '@/lib/starter-build/queries'
import type { StarterRequestResponsePayload } from '@/lib/starter-build/types'

interface StarterRequestResponsePanelProps {
    lang: string
    requests: StarterOwnerRequest[]
}

function getSavedText(request: StarterOwnerRequest) {
    return request.response_payload.textValue
        ?? request.response_payload.note
        ?? ''
}

function getButtonLabel(requestType: StarterOwnerRequest['request_type']) {
    if (requestType === 'acknowledgement') return 'Confirmar'
    if (requestType === 'approval_optional') return 'Guardar decision'
    return 'Guardar respuesta'
}

function getStatusLabel(request: StarterOwnerRequest) {
    if (request.request_status === 'completed') return 'Completado'
    if (request.request_status === 'in_review') return 'Revisando equipo'
    if (request.request_status === 'submitted') return 'Respuesta enviada'
    return request.is_required ? 'Pendiente de tu lado' : 'Opcional'
}

function formatRequirementSummary(requirements: Record<string, unknown>) {
    const formats = Array.isArray(requirements.allowedFormats) ? requirements.allowedFormats.join(', ') : null
    const maxSize = typeof requirements.maxFileSizeMb === 'number' ? `${requirements.maxFileSizeMb} MB max` : null
    return [formats, maxSize].filter(Boolean).join(' · ')
}

function AssetList({ request }: { request: StarterOwnerRequest }) {
    const assets = request.response_payload.assets ?? []

    if (assets.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                No hay assets subidos todavia.
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {assets.map((asset) => (
                <div key={asset.path} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm">
                    <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{asset.fileName}</p>
                        <p className="text-slate-500">
                            {asset.contentType ?? 'archivo'}
                            {typeof asset.fileSize === 'number' ? ` · ${Math.max(1, Math.round(asset.fileSize / 1024))} KB` : ''}
                        </p>
                    </div>
                    {asset.signedUrl ? (
                        <a
                            href={asset.signedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-sm font-semibold text-sky-700 hover:text-sky-900"
                        >
                            Ver
                        </a>
                    ) : null}
                </div>
            ))}
        </div>
    )
}

function StarterRequestForm({
    lang,
    request,
}: {
    lang: string
    request: StarterOwnerRequest
}) {
    const router = useRouter()
    const [textValue, setTextValue] = useState(getSavedText(request))
    const [choiceValue, setChoiceValue] = useState(request.response_payload.choiceValue ?? '')
    const [approvalValue, setApprovalValue] = useState(request.response_payload.approvalValue ?? '')
    const [acknowledged, setAcknowledged] = useState(Boolean(request.response_payload.acknowledged))
    const [error, setError] = useState<string | null>(null)
    const [isPending, setIsPending] = useState(false)

    const saveResponse = (payload: StarterRequestResponsePayload) => {
        setError(null)
        setIsPending(true)
        startTransition(async () => {
            try {
                await saveStarterRequestResponse({
                    lang,
                    requestId: request.id,
                    responsePayload: payload,
                })
                router.refresh()
            } catch (err) {
                setError(err instanceof Error ? err.message : 'No se pudo guardar la respuesta.')
            } finally {
                setIsPending(false)
            }
        })
    }

    const handleTextSubmit = () => {
        const nextValue = textValue.trim()
        if (request.request_type !== 'feedback_note' && nextValue.length === 0) {
            setError('Escribe una respuesta antes de guardar.')
            return
        }

        if (request.request_type === 'feedback_note') {
            saveResponse({ note: nextValue })
            return
        }

        saveResponse({ textValue: nextValue })
    }

    const handleChoiceSubmit = () => {
        if (!choiceValue) {
            setError('Selecciona una opcion para continuar.')
            return
        }
        saveResponse({ choiceValue })
    }

    const handleApprovalSubmit = () => {
        saveResponse({ approvalValue: approvalValue === 'changes_requested' ? 'changes_requested' : 'approved' })
    }

    const handleAcknowledgeSubmit = () => {
        saveResponse({ acknowledged: !acknowledged })
        setAcknowledged((current) => !current)
    }

    const handleUpload = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        const form = event.currentTarget
        const formData = new FormData(form)
        formData.set('requestId', request.id)
        formData.set('lang', lang)

        setIsPending(true)
        startTransition(async () => {
            try {
                await uploadStarterRequestAssets(formData)
                router.refresh()
                form.reset()
            } catch (err) {
                setError(err instanceof Error ? err.message : 'No se pudo subir el archivo.')
            } finally {
                setIsPending(false)
            }
        })
    }

    return (
        <div className="mt-4 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            {request.request_type === 'structured_choice' ? (
                <div className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-900">Selecciona una opcion</label>
                    <select
                        value={choiceValue}
                        onChange={(event) => setChoiceValue(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                    >
                        <option value="">Selecciona una opcion</option>
                        {Array.isArray(request.config.options)
                            ? request.config.options.map((option) => (
                                <option key={String(option)} value={String(option)}>
                                    {String(option)}
                                </option>
                            ))
                            : null}
                    </select>
                    <button
                        type="button"
                        onClick={handleChoiceSubmit}
                        disabled={isPending}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isPending ? 'Guardando...' : getButtonLabel(request.request_type)}
                    </button>
                </div>
            ) : null}

            {(request.request_type === 'text_form' || request.request_type === 'feedback_note') ? (
                <div className="space-y-3">
                    <textarea
                        value={textValue}
                        onChange={(event) => setTextValue(event.target.value)}
                        rows={4}
                        placeholder="Escribe aqui la respuesta para el equipo"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                    />
                    <button
                        type="button"
                        onClick={handleTextSubmit}
                        disabled={isPending}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isPending ? 'Guardando...' : getButtonLabel(request.request_type)}
                    </button>
                </div>
            ) : null}

            {request.request_type === 'acknowledgement' ? (
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-slate-600">
                        {acknowledged ? 'Confirmacion registrada.' : 'Confirma cuando este punto quede entendido.'}
                    </p>
                    <button
                        type="button"
                        onClick={handleAcknowledgeSubmit}
                        disabled={isPending}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isPending ? 'Guardando...' : getButtonLabel(request.request_type)}
                    </button>
                </div>
            ) : null}

            {request.request_type === 'approval_optional' ? (
                <div className="space-y-3">
                    <select
                        value={approvalValue}
                        onChange={(event) => setApprovalValue(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                    >
                        <option value="">Sin decision todavia</option>
                        <option value="approved">Aprobado</option>
                        <option value="changes_requested">Solicitar cambios</option>
                    </select>
                    <button
                        type="button"
                        onClick={handleApprovalSubmit}
                        disabled={isPending}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isPending ? 'Guardando...' : getButtonLabel(request.request_type)}
                    </button>
                </div>
            ) : null}

            {(request.request_type === 'single_asset_upload' || request.request_type === 'multi_asset_upload') ? (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-1">asset upload</span>
                        {formatRequirementSummary(request.asset_requirements) ? (
                            <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">
                                {formatRequirementSummary(request.asset_requirements)}
                            </span>
                        ) : null}
                    </div>
                    <form onSubmit={handleUpload} className="space-y-3">
                        <input
                            name="files"
                            type="file"
                            multiple={request.request_type === 'multi_asset_upload'}
                            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-sky-100 file:px-4 file:py-2 file:font-semibold file:text-sky-800 hover:file:bg-sky-200"
                        />
                        <button
                            type="submit"
                            disabled={isPending}
                            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isPending ? 'Subiendo...' : 'Subir assets'}
                        </button>
                    </form>
                </div>
            ) : null}

            <AssetList request={request} />

            {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                </div>
            ) : null}
        </div>
    )
}

export function StarterRequestResponsePanel({
    lang,
    requests,
}: StarterRequestResponsePanelProps) {
    if (requests.length === 0) {
        return (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
                No hay requests visibles para esta fase todavia.
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {requests.map((request) => (
                <article key={request.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-black text-slate-900">{request.title}</h3>
                                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${
                                    request.request_status === 'completed'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : request.request_status === 'in_review'
                                            ? 'bg-amber-100 text-amber-700'
                                            : request.request_status === 'submitted'
                                                ? 'bg-sky-100 text-sky-700'
                                                : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {getStatusLabel(request)}
                                </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">{request.description ?? 'Sin descripcion adicional.'}</p>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                            <p>{request.is_required ? 'Necesario para avanzar' : 'No bloqueante'}</p>
                            {request.response_payload.submittedAt ? (
                                <p className="mt-1">Ultimo envio: {new Date(request.response_payload.submittedAt).toLocaleString('es-CH')}</p>
                            ) : null}
                        </div>
                    </div>
                    <StarterRequestForm lang={lang} request={request} />
                </article>
            ))}
        </div>
    )
}
