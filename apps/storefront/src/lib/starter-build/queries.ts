import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getCurrentPhaseKey, normalizeStarterFeatureKeys, sortStarterPhases, sortStarterRequests } from './utils'
import type {
    StarterFeatureKey,
    StarterPhaseStatus,
    StarterPhaseType,
    StarterRequestResponsePayload,
    StarterRequestStatus,
    StarterRequestType,
} from './types'

const STARTER_ASSETS_BUCKET = 'starter-assets'

type StarterSupabaseClient = Awaited<ReturnType<typeof createClient>> | SupabaseClient

export interface StarterOwnerPhase {
    id: string
    phase_key: string
    title: string
    description: string | null
    phase_type: StarterPhaseType
    phase_status: StarterPhaseStatus
    sort_order: number
    visible_features: StarterFeatureKey[]
    updated_at?: string
}

export interface StarterOwnerRequest {
    id: string
    request_key: string
    title: string
    description: string | null
    request_type: StarterRequestType
    request_status: StarterRequestStatus
    is_required: boolean
    sort_order: number
    validation_rules: Record<string, unknown>
    asset_requirements: Record<string, unknown>
    response_payload: StarterRequestResponsePayload
    config: Record<string, unknown>
    updated_at?: string
}

export interface StarterOwnerProject {
    tenantId: string
    currentPhaseKey: string | null
    phases: StarterOwnerPhase[]
    requestsByPhase: Record<string, StarterOwnerRequest[]>
}

function normalizeRequestResponsePayload(value: unknown): StarterRequestResponsePayload {
    if (!value || typeof value !== 'object') {
        return {}
    }

    const payload = value as Record<string, unknown>
    const assets = Array.isArray(payload.assets)
        ? payload.assets
            .filter((asset): asset is Record<string, unknown> => Boolean(asset) && typeof asset === 'object')
            .filter((asset) => typeof asset.path === 'string' && typeof asset.fileName === 'string')
            .map((asset) => ({
                path: asset.path as string,
                fileName: asset.fileName as string,
                fileSize: typeof asset.fileSize === 'number' ? asset.fileSize : undefined,
                contentType: typeof asset.contentType === 'string' ? asset.contentType : undefined,
                uploadedAt: typeof asset.uploadedAt === 'string' ? asset.uploadedAt : undefined,
                signedUrl: typeof asset.signedUrl === 'string' ? asset.signedUrl : undefined,
            }))
        : []

    return {
        textValue: typeof payload.textValue === 'string' ? payload.textValue : undefined,
        note: typeof payload.note === 'string' ? payload.note : undefined,
        choiceValue: typeof payload.choiceValue === 'string' ? payload.choiceValue : undefined,
        approvalValue: payload.approvalValue === 'approved' || payload.approvalValue === 'changes_requested'
            ? payload.approvalValue
            : undefined,
        acknowledged: typeof payload.acknowledged === 'boolean' ? payload.acknowledged : undefined,
        assets,
        submittedAt: typeof payload.submittedAt === 'string' ? payload.submittedAt : undefined,
    }
}

export async function getStarterOwnerProject(
    tenantId: string,
    client?: StarterSupabaseClient
): Promise<StarterOwnerProject | null> {
    const supabase = client ?? await createClient()
    const db = supabase

    const { data: project } = await db
        .from('starter_projects')
        .select('current_phase_key')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    const { data: phases, error: phasesError } = await db
        .from('starter_project_phases')
        .select('id, phase_key, title, description, phase_type, phase_status, sort_order, visible_features, updated_at')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true })

    if (phasesError) {
        return null
    }

    const normalizedPhases = sortStarterPhases(
        ((phases ?? []) as Record<string, unknown>[]).map((phase) => ({
            id: String(phase.id),
            phase_key: String(phase.phase_key),
            title: String(phase.title),
            description: typeof phase.description === 'string' ? phase.description : null,
            phase_type: phase.phase_type as StarterPhaseType,
            phase_status: phase.phase_status as StarterPhaseStatus,
            sort_order: typeof phase.sort_order === 'number' ? phase.sort_order : 0,
            visible_features: normalizeStarterFeatureKeys(
                Array.isArray(phase.visible_features)
                    ? phase.visible_features.filter((feature): feature is string => typeof feature === 'string')
                    : []
            ),
            updated_at: typeof phase.updated_at === 'string' ? phase.updated_at : undefined,
        }))
    )

    const { data: requests, error: requestsError } = await db
        .from('starter_project_requests')
        .select('id, request_key, title, description, request_type, request_status, is_required, validation_rules, asset_requirements, response_payload, config, sort_order, starter_project_phase_id, updated_at')
        .eq('tenant_id', tenantId)
        .eq('visible_to_owner', true)
        .order('sort_order', { ascending: true })

    if (requestsError) {
        return {
            tenantId,
            currentPhaseKey: (project?.current_phase_key as string | null) ?? getCurrentPhaseKey(normalizedPhases),
            phases: normalizedPhases,
            requestsByPhase: {},
        }
    }

    const phaseById = new Map(normalizedPhases.map((phase) => [phase.id, phase.phase_key]))
    const requestsByPhase: Record<string, StarterOwnerRequest[]> = {}
    const requestAssets = new Map<string, string[]>()

    for (const rawRequest of (requests ?? []) as Record<string, unknown>[]) {
        const responsePayload = normalizeRequestResponsePayload(rawRequest.response_payload)
        const assets = Array.isArray(responsePayload.assets)
            ? responsePayload.assets.filter((asset) => typeof asset.path === 'string')
            : []
        requestAssets.set(String(rawRequest.id), assets.map((asset) => asset.path))
    }

    const signedUrlByPath = new Map<string, string | null>()
    const allAssetPaths = [...new Set([...requestAssets.values()].flat())]
    if (allAssetPaths.length > 0) {
        const { data: signedUrls } = await db.storage.from(STARTER_ASSETS_BUCKET).createSignedUrls(allAssetPaths, 3600)
        allAssetPaths.forEach((path, index) => {
            signedUrlByPath.set(path, signedUrls?.[index]?.signedUrl ?? null)
        })
    }

    for (const rawRequest of (requests ?? []) as Record<string, unknown>[]) {
        const phaseKey = phaseById.get(String(rawRequest.starter_project_phase_id))
        if (!phaseKey) continue

        const responsePayload = normalizeRequestResponsePayload(rawRequest.response_payload)
        const request: StarterOwnerRequest = {
            id: String(rawRequest.id),
            request_key: String(rawRequest.request_key),
            title: String(rawRequest.title),
            description: typeof rawRequest.description === 'string' ? rawRequest.description : null,
            request_type: rawRequest.request_type as StarterRequestType,
            request_status: rawRequest.request_status as StarterRequestStatus,
            is_required: Boolean(rawRequest.is_required),
            sort_order: typeof rawRequest.sort_order === 'number' ? rawRequest.sort_order : 0,
            validation_rules: (rawRequest.validation_rules as Record<string, unknown> | null) ?? {},
            asset_requirements: (rawRequest.asset_requirements as Record<string, unknown> | null) ?? {},
            response_payload: {
                ...responsePayload,
                assets: Array.isArray(responsePayload.assets)
                    ? responsePayload.assets.map((asset) => ({
                        ...asset,
                        signedUrl: typeof asset.path === 'string' ? (signedUrlByPath.get(asset.path) ?? null) : null,
                    }))
                    : [],
            },
            config: (rawRequest.config as Record<string, unknown> | null) ?? {},
            updated_at: typeof rawRequest.updated_at === 'string' ? rawRequest.updated_at : undefined,
        }

        requestsByPhase[phaseKey] = [...(requestsByPhase[phaseKey] ?? []), request]
    }

    for (const [phaseKey, phaseRequests] of Object.entries(requestsByPhase)) {
        requestsByPhase[phaseKey] = sortStarterRequests(phaseRequests)
    }

    return {
        tenantId,
        currentPhaseKey: (project?.current_phase_key as string | null) ?? getCurrentPhaseKey(normalizedPhases),
        phases: normalizedPhases,
        requestsByPhase,
    }
}
