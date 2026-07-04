'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requirePanelAuth } from '@/lib/panel-auth'
import type {
    StarterRequestAsset,
    StarterRequestResponsePayload,
    StarterRequestStatus,
    StarterRequestType,
} from './types'

const STARTER_ASSETS_BUCKET = 'starter-assets'

interface StarterOwnerRequestRow {
    id: string
    tenant_id: string
    request_type: StarterRequestType
    request_status: StarterRequestStatus
    asset_requirements: Record<string, unknown> | null
    response_payload: Record<string, unknown> | null
}

interface SaveStarterRequestResponseInput {
    lang: string
    requestId: string
    responsePayload: StarterRequestResponsePayload
}

function sanitizeFileName(fileName: string) {
    return fileName
        .normalize('NFKD')
        .replace(/[^\w.-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase()
}

function normalizeAssetList(value: unknown): StarterRequestAsset[] {
    if (!Array.isArray(value)) return []

    return value
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        .filter((item) => typeof item.path === 'string' && typeof item.fileName === 'string')
        .map((item) => ({
            path: item.path as string,
            fileName: item.fileName as string,
            fileSize: typeof item.fileSize === 'number' ? item.fileSize : undefined,
            contentType: typeof item.contentType === 'string' ? item.contentType : undefined,
            uploadedAt: typeof item.uploadedAt === 'string' ? item.uploadedAt : undefined,
            signedUrl: typeof item.signedUrl === 'string' ? item.signedUrl : undefined,
        }))
}

function normalizeResponsePayload(value: unknown): StarterRequestResponsePayload {
    if (!value || typeof value !== 'object') {
        return {}
    }

    const payload = value as Record<string, unknown>
    return {
        textValue: typeof payload.textValue === 'string' ? payload.textValue : undefined,
        note: typeof payload.note === 'string' ? payload.note : undefined,
        choiceValue: typeof payload.choiceValue === 'string' ? payload.choiceValue : undefined,
        approvalValue: payload.approvalValue === 'approved' || payload.approvalValue === 'changes_requested'
            ? payload.approvalValue
            : undefined,
        acknowledged: typeof payload.acknowledged === 'boolean' ? payload.acknowledged : undefined,
        assets: normalizeAssetList(payload.assets),
        submittedAt: typeof payload.submittedAt === 'string' ? payload.submittedAt : undefined,
    }
}

function getNextOwnerRequestStatus(currentStatus: StarterRequestStatus): StarterRequestStatus {
    return currentStatus === 'completed' ? 'completed' : 'submitted'
}

async function getStarterRequestForOwner(requestId: string): Promise<StarterOwnerRequestRow & { db: SupabaseClient }> {
    const { supabase, tenantId } = await requirePanelAuth()
    const db = supabase as unknown as SupabaseClient

    const { data, error } = await db
        .from('starter_project_requests')
        .select('id, tenant_id, request_type, request_status, asset_requirements, response_payload')
        .eq('tenant_id', tenantId)
        .eq('id', requestId)
        .single()

    if (error || !data) {
        throw new Error('No se encontro el request starter solicitado.')
    }

    return { ...(data as StarterOwnerRequestRow), db }
}

function validateUploadFiles(request: StarterOwnerRequestRow, files: File[]) {
    if (request.request_type !== 'single_asset_upload' && request.request_type !== 'multi_asset_upload') {
        throw new Error('Este request starter no acepta assets.')
    }

    if (files.length === 0) {
        throw new Error('Selecciona al menos un archivo para continuar.')
    }

    if (request.request_type === 'single_asset_upload' && files.length > 1) {
        throw new Error('Este request solo acepta un archivo.')
    }

    const requirements = (request.asset_requirements ?? {}) as Record<string, unknown>
    const allowedFormats = Array.isArray(requirements.allowedFormats)
        ? requirements.allowedFormats
            .filter((value): value is string => typeof value === 'string')
            .map((value) => value.toLowerCase())
        : []
    const maxFileSizeMb = typeof requirements.maxFileSizeMb === 'number'
        ? requirements.maxFileSizeMb
        : null

    for (const file of files) {
        const extension = file.name.split('.').pop()?.toLowerCase()
        if (allowedFormats.length > 0 && extension && !allowedFormats.includes(extension)) {
            throw new Error(`El archivo ${file.name} no cumple los formatos permitidos: ${allowedFormats.join(', ')}`)
        }

        if (maxFileSizeMb !== null && file.size > maxFileSizeMb * 1024 * 1024) {
            throw new Error(`El archivo ${file.name} supera el maximo de ${maxFileSizeMb} MB`)
        }
    }
}

async function buildSignedAssets(db: SupabaseClient, assets: StarterRequestAsset[]) {
    if (assets.length === 0) return assets

    const paths = assets.map((asset) => asset.path)
    const { data, error } = await db.storage.from(STARTER_ASSETS_BUCKET).createSignedUrls(paths, 3600)

    if (error || !data) {
        return assets
    }

    return assets.map((asset, index) => ({
        ...asset,
        signedUrl: data[index]?.signedUrl ?? null,
    }))
}

export async function saveStarterRequestResponse(input: SaveStarterRequestResponseInput) {
    const { db, ...request } = await getStarterRequestForOwner(input.requestId)
    const currentPayload = normalizeResponsePayload(request.response_payload)
    const nextPayload: StarterRequestResponsePayload = {
        ...currentPayload,
        ...input.responsePayload,
        submittedAt: new Date().toISOString(),
    }

    const { error } = await db
        .from('starter_project_requests')
        .update({
            response_payload: nextPayload,
            request_status: getNextOwnerRequestStatus(request.request_status),
        })
        .eq('id', request.id)
        .eq('tenant_id', request.tenant_id)

    if (error) {
        throw new Error(`No se pudo guardar la respuesta starter: ${error.message}`)
    }

    revalidatePath(`/${input.lang}/panel`)
    return { success: true }
}

export async function uploadStarterRequestAssets(formData: FormData) {
    const requestId = formData.get('requestId')
    const lang = formData.get('lang')

    if (typeof requestId !== 'string' || requestId.trim().length === 0) {
        throw new Error('Falta el request starter para subir assets.')
    }

    if (typeof lang !== 'string' || lang.trim().length === 0) {
        throw new Error('Falta el idioma del panel para refrescar el starter.')
    }

    const files = formData
        .getAll('files')
        .filter((entry): entry is File => entry instanceof File && entry.size > 0)

    const { db, ...request } = await getStarterRequestForOwner(requestId)
    validateUploadFiles(request, files)

    const currentPayload = normalizeResponsePayload(request.response_payload)
    const existingAssets = normalizeAssetList(currentPayload.assets)

    const uploadedAssets: StarterRequestAsset[] = []
    for (const file of files) {
        const safeName = sanitizeFileName(file.name)
        const path = `${request.tenant_id}/${request.id}/${randomUUID()}-${safeName}`
        const { error } = await db.storage.from(STARTER_ASSETS_BUCKET).upload(path, file, {
            upsert: false,
            contentType: file.type || undefined,
        })

        if (error) {
            throw new Error(`No se pudo subir ${file.name}: ${error.message}`)
        }

        uploadedAssets.push({
            path,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type || undefined,
            uploadedAt: new Date().toISOString(),
        })
    }

    const nextAssets = [...existingAssets, ...uploadedAssets]
    const nextPayload: StarterRequestResponsePayload = {
        ...currentPayload,
        assets: nextAssets,
        submittedAt: new Date().toISOString(),
    }

    const { error: updateError } = await db
        .from('starter_project_requests')
        .update({
            response_payload: nextPayload,
            request_status: getNextOwnerRequestStatus(request.request_status),
        })
        .eq('id', request.id)
        .eq('tenant_id', request.tenant_id)

    if (updateError) {
        throw new Error(`No se pudo registrar el upload starter: ${updateError.message}`)
    }

    revalidatePath(`/${lang}/panel`)

    return {
        success: true,
        assets: await buildSignedAssets(db, nextAssets),
    }
}
