/**
 * Unit tests for SupabaseFileProviderService.
 * Tests validateOptions contract, file key generation, upload, delete, and error paths.
 */

// ── Mocks ──
const mockUpload = jest.fn()
const mockRemove = jest.fn()
const mockDownload = jest.fn()
const mockGetPublicUrl = jest.fn()
const mockCreateSignedUrl = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        storage: {
            from: jest.fn(() => ({
                upload: mockUpload,
                remove: mockRemove,
                download: mockDownload,
                getPublicUrl: mockGetPublicUrl,
                createSignedUrl: mockCreateSignedUrl,
            })),
        },
    })),
}))

const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}

const validOptions = {
    supabaseUrl: 'https://test.supabase.co',
    supabaseServiceRoleKey: 'test-service-role-key',
    bucketName: 'test-bucket',
}

// ── Import after mocks ──
import SupabaseFileProviderService from '../modules/supabase-storage/service'

describe('SupabaseFileProviderService', () => {
    let service: SupabaseFileProviderService

    beforeEach(() => {
        jest.clearAllMocks()
        mockGetPublicUrl.mockReturnValue({
            data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/test-bucket/file.jpg' },
        })
        service = new SupabaseFileProviderService(
            { logger: mockLogger as any },
            validOptions
        )
    })

    // ── validateOptions ──
    describe('validateOptions', () => {
        it('throws when supabaseUrl is missing', () => {
            expect(() =>
                SupabaseFileProviderService.validateOptions({
                    supabaseServiceRoleKey: 'key',
                })
            ).toThrow('supabaseUrl is required')
        })

        it('throws when supabaseServiceRoleKey is missing', () => {
            expect(() =>
                SupabaseFileProviderService.validateOptions({
                    supabaseUrl: 'https://test.supabase.co',
                })
            ).toThrow('supabaseServiceRoleKey is required')
        })

        it('succeeds with valid options', () => {
            expect(() =>
                SupabaseFileProviderService.validateOptions(validOptions)
            ).not.toThrow()
        })
    })

    // ── upload ──
    describe('upload', () => {
        it('uploads file and returns url + key', async () => {
            mockUpload.mockResolvedValue({ error: null })

            const result = await service.upload({
                filename: 'test-image.jpg',
                mimeType: 'image/jpeg',
                content: Buffer.from('fake-image-data').toString('base64'),
            } as any)

            expect(result.url).toBeDefined()
            expect(result.key).toBeDefined()
            expect(result.key).toContain('test-image')
            expect(mockUpload).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(Buffer),
                expect.objectContaining({ contentType: 'image/jpeg' })
            )
        })

        it('throws on upload error', async () => {
            mockUpload.mockResolvedValue({
                error: { message: 'Bucket not found' },
            })

            await expect(
                service.upload({
                    filename: 'test.jpg',
                    mimeType: 'image/jpeg',
                    content: Buffer.from('data').toString('base64'),
                } as any)
            ).rejects.toThrow('Bucket not found')
        })

        it('sanitizes special characters in filename', async () => {
            mockUpload.mockResolvedValue({ error: null })

            const result = await service.upload({
                filename: 'My File (1)!@#$.jpg',
                mimeType: 'image/jpeg',
                content: Buffer.from('data').toString('base64'),
            } as any)

            // Key should not contain special chars (except _, -, .)
            expect(result.key).not.toMatch(/[()!@#$%^&*]/)
            expect(result.key).toContain('.jpg')
        })
    })

    // ── delete ──
    describe('delete', () => {
        it('deletes a single file', async () => {
            mockRemove.mockResolvedValue({ error: null })

            await service.delete({ fileKey: 'file-to-delete.jpg' } as any)

            expect(mockRemove).toHaveBeenCalledWith(['file-to-delete.jpg'])
        })

        it('deletes multiple files', async () => {
            mockRemove.mockResolvedValue({ error: null })

            await service.delete([
                { fileKey: 'file1.jpg' },
                { fileKey: 'file2.jpg' },
            ] as any)

            expect(mockRemove).toHaveBeenCalledWith(['file1.jpg', 'file2.jpg'])
        })

        it('throws on delete error', async () => {
            mockRemove.mockResolvedValue({
                error: { message: 'Permission denied' },
            })

            await expect(
                service.delete({ fileKey: 'protected.jpg' } as any)
            ).rejects.toThrow('Permission denied')
        })
    })

    // ── getPresignedDownloadUrl ──
    describe('getPresignedDownloadUrl', () => {
        it('returns signed URL', async () => {
            mockCreateSignedUrl.mockResolvedValue({
                data: { signedUrl: 'https://signed.url/file' },
                error: null,
            })

            const url = await service.getPresignedDownloadUrl({
                fileKey: 'private-file.pdf',
            } as any)

            expect(url).toBe('https://signed.url/file')
        })

        it('throws on signed URL error', async () => {
            mockCreateSignedUrl.mockResolvedValue({
                data: null,
                error: { message: 'File not found' },
            })

            await expect(
                service.getPresignedDownloadUrl({
                    fileKey: 'missing.pdf',
                } as any)
            ).rejects.toThrow('File not found')
        })
    })
})
