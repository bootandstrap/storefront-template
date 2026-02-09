import {
    AbstractFileProviderService,
} from "@medusajs/framework/utils"
import type {
    FileTypes,
    Logger,
} from "@medusajs/framework/types"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { Readable } from "stream"

type InjectedDependencies = {
    logger: Logger
}

type SupabaseStorageOptions = {
    supabaseUrl: string
    supabaseServiceRoleKey: string
    bucketName?: string
}

/**
 * Supabase Storage Provider for Medusa v2.
 * 
 * Uploads product images and other files to a Supabase Storage bucket.
 * Returns public CDN URLs for uploaded files.
 * 
 * Configuration:
 * - supabaseUrl: Project URL (e.g., https://xxx.supabase.co)
 * - supabaseServiceRoleKey: Service role key for admin access
 * - bucketName: Storage bucket name (default: "product-images")
 */
class SupabaseFileProviderService extends AbstractFileProviderService {
    static identifier = "supabase-storage"

    protected logger_: Logger
    protected options_: SupabaseStorageOptions
    protected client_: SupabaseClient
    protected bucketName_: string

    constructor(
        { logger }: InjectedDependencies,
        options: SupabaseStorageOptions
    ) {
        super()

        this.logger_ = logger
        this.options_ = options
        this.bucketName_ = options.bucketName || "product-images"

        this.client_ = createClient(
            options.supabaseUrl,
            options.supabaseServiceRoleKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )
    }

    static validateOptions(options: Record<string, any>) {
        if (!options.supabaseUrl) {
            throw new Error("supabaseUrl is required in Supabase Storage provider options")
        }
        if (!options.supabaseServiceRoleKey) {
            throw new Error("supabaseServiceRoleKey is required in Supabase Storage provider options")
        }
    }

    /**
     * Generate a unique file key with timestamp to avoid collisions.
     */
    private generateFileKey(filename: string): string {
        const timestamp = Date.now()
        const sanitized = filename
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .toLowerCase()
        return `${timestamp}-${sanitized}`
    }

    /**
     * Get the public URL for a file in the bucket.
     */
    private getPublicUrl(fileKey: string): string {
        const { data } = this.client_.storage
            .from(this.bucketName_)
            .getPublicUrl(fileKey)
        return data.publicUrl
    }

    /**
     * Upload a file to Supabase Storage.
     * 
     * Receives file content as base64-encoded string,
     * converts to Buffer, and uploads to the configured bucket.
     */
    async upload(
        file: FileTypes.ProviderUploadFileDTO
    ): Promise<FileTypes.ProviderFileResultDTO> {
        const fileKey = this.generateFileKey(file.filename)

        // Convert base64 content to Buffer
        const buffer = Buffer.from(file.content, "base64")

        const { error } = await this.client_.storage
            .from(this.bucketName_)
            .upload(fileKey, buffer, {
                contentType: file.mimeType || "application/octet-stream",
                upsert: false,
            })

        if (error) {
            this.logger_.error(`Supabase Storage upload failed: ${error.message}`)
            throw new Error(`Failed to upload file: ${error.message}`)
        }

        const url = this.getPublicUrl(fileKey)
        this.logger_.info(`Uploaded file to Supabase Storage: ${fileKey}`)

        return { url, key: fileKey }
    }

    /**
     * Delete one or more files from Supabase Storage.
     */
    async delete(
        files: FileTypes.ProviderDeleteFileDTO | FileTypes.ProviderDeleteFileDTO[]
    ): Promise<void> {
        const fileArray = Array.isArray(files) ? files : [files]
        const fileKeys = fileArray.map((f) => f.fileKey)

        const { error } = await this.client_.storage
            .from(this.bucketName_)
            .remove(fileKeys)

        if (error) {
            this.logger_.error(`Supabase Storage delete failed: ${error.message}`)
            throw new Error(`Failed to delete files: ${error.message}`)
        }

        this.logger_.info(`Deleted ${fileKeys.length} files from Supabase Storage`)
    }

    /**
     * Get file content as a Buffer.
     */
    async getAsBuffer(
        fileData: FileTypes.ProviderGetFileDTO
    ): Promise<Buffer> {
        const { data, error } = await this.client_.storage
            .from(this.bucketName_)
            .download(fileData.fileKey)

        if (error || !data) {
            throw new Error(`Failed to download file: ${error?.message || "Unknown error"}`)
        }

        const arrayBuffer = await data.arrayBuffer()
        return Buffer.from(arrayBuffer)
    }

    /**
     * Get a presigned download URL for a file.
     */
    async getPresignedDownloadUrl(
        fileData: FileTypes.ProviderGetFileDTO
    ): Promise<string> {
        const { data, error } = await this.client_.storage
            .from(this.bucketName_)
            .createSignedUrl(fileData.fileKey, 3600) // 1 hour expiry

        if (error || !data) {
            throw new Error(`Failed to create signed URL: ${error?.message || "Unknown error"}`)
        }

        return data.signedUrl
    }

    /**
     * Get a download stream for a file.
     */
    async getDownloadStream(
        fileData: FileTypes.ProviderGetFileDTO
    ): Promise<Readable> {
        const buffer = await this.getAsBuffer(fileData)
        return Readable.from(buffer)
    }

    /**
     * Get an upload stream for a file.
     */
    async getUploadStream(
        fileData: FileTypes.ProviderUploadStreamDTO
    ): Promise<{
        writeStream: import("stream").Writable
        promise: Promise<FileTypes.ProviderFileResultDTO>
        url: string
        fileKey: string
    }> {
        const fileKey = this.generateFileKey(fileData.filename)
        const url = this.getPublicUrl(fileKey)

        const chunks: Buffer[] = []

        const { Writable } = await import("stream")
        const writeStream: import("stream").Writable = new Writable({
            write(chunk, _encoding, callback) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
                callback()
            },
        })

        const promise = new Promise<FileTypes.ProviderFileResultDTO>(
            (resolve, reject) => {
                writeStream.on("finish", async () => {
                    try {
                        const buffer = Buffer.concat(chunks)
                        const { error } = await this.client_.storage
                            .from(this.bucketName_)
                            .upload(fileKey, buffer, {
                                contentType: fileData.mimeType || "application/octet-stream",
                                upsert: false,
                            })

                        if (error) {
                            reject(new Error(`Upload failed: ${error.message}`))
                            return
                        }

                        resolve({ url, key: fileKey })
                    } catch (err: any) {
                        reject(err)
                    }
                })

                writeStream.on("error", reject)
            }
        )

        return { writeStream, promise, url, fileKey }
    }

    /**
     * Get a presigned upload URL.
     * Note: Supabase Storage supports signed upload URLs.
     */
    async getPresignedUploadUrl(
        fileData: FileTypes.ProviderUploadFileDTO & { expiresIn?: number }
    ): Promise<FileTypes.ProviderFileResultDTO & { signedUrl: string }> {
        const fileKey = this.generateFileKey(fileData.filename)

        const { data, error } = await this.client_.storage
            .from(this.bucketName_)
            .createSignedUploadUrl(fileKey)

        if (error || !data) {
            throw new Error(`Failed to create signed upload URL: ${error?.message || "Unknown error"}`)
        }

        const url = this.getPublicUrl(fileKey)

        return {
            url,
            key: fileKey,
            signedUrl: data.signedUrl,
        }
    }
}

export default SupabaseFileProviderService
