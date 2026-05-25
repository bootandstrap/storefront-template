export const STARTER_FEATURE_KEYS = [
    'timeline',
    'project_messages',
    'asset_upload_center',
    'requirements_view',
    'design_preview',
    'feedback_thread',
    'basic_profile_form',
    'catalog_intake',
    'launch_checklist_view',
    'support_contact_panel',
] as const

export type StarterFeatureKey = (typeof STARTER_FEATURE_KEYS)[number]

export const STARTER_PHASE_TYPES = [
    'informative',
    'input_required',
    'asset_collection',
    'review_feedback',
    'preview_signoff_optional',
    'launch_preparation',
    'post_launch_followup',
] as const

export type StarterPhaseType = (typeof STARTER_PHASE_TYPES)[number]

export const STARTER_REQUEST_TYPES = [
    'text_form',
    'single_asset_upload',
    'multi_asset_upload',
    'structured_choice',
    'feedback_note',
    'acknowledgement',
    'approval_optional',
] as const

export type StarterRequestType = (typeof STARTER_REQUEST_TYPES)[number]

export type StarterPhaseStatus = 'pending' | 'in_progress' | 'completed'
export type StarterRequestStatus = 'pending' | 'submitted' | 'in_review' | 'completed'

export interface StarterRequestAsset {
    path: string
    fileName: string
    fileSize?: number
    contentType?: string
    uploadedAt?: string
    signedUrl?: string | null
}

export interface StarterRequestResponsePayload {
    textValue?: string
    note?: string
    choiceValue?: string
    approvalValue?: 'approved' | 'changes_requested'
    acknowledged?: boolean
    assets?: StarterRequestAsset[]
    submittedAt?: string
}

export interface StarterProjectPhaseLike {
    phase_key: string
    title: string
    phase_status: StarterPhaseStatus
    sort_order?: number
}

export interface StarterProjectRequestLike {
    request_key: string
    sort_order?: number
}
