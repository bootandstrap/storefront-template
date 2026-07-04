import { NextResponse } from 'next/server'

const AUTH_FAILURES = new Map<string, { error: string; status: number }>([
    ['Not authenticated', { error: 'Unauthorized', status: 401 }],
    ['Unauthorized', { error: 'Unauthorized', status: 401 }],
    ['Insufficient permissions', { error: 'Forbidden', status: 403 }],
    ['Forbidden', { error: 'Forbidden', status: 403 }],
])

/** Normalize panel guard failures without leaking raw internal errors. */
export function toPanelErrorResponse(error: unknown): NextResponse {
    const message = error instanceof Error ? error.message : ''
    const knownFailure = AUTH_FAILURES.get(message)

    if (knownFailure) {
        return NextResponse.json(
            { error: knownFailure.error },
            { status: knownFailure.status }
        )
    }

    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
}
