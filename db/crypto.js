import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16

/**
 * Get the encryption key from environment.
 * Must be a 64-character hex string (32 bytes).
 */
function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY
    if (!key || key.length !== 64) {
        throw new Error(
            "ENCRYPTION_KEY must be set as a 64-character hex string (32 bytes). " +
            "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        )
    }
    return Buffer.from(key, "hex")
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns format: iv:authTag:ciphertext (all hex-encoded).
 */
export function encrypt(text) {
    if (!text) return null
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(text, "utf8", "hex")
    encrypted += cipher.final("hex")
    const authTag = cipher.getAuthTag().toString("hex")

    return `${iv.toString("hex")}:${authTag}:${encrypted}`
}

/**
 * Decrypt a string encrypted by encrypt().
 * Expects format: iv:authTag:ciphertext (all hex-encoded).
 * Returns null if input is null/empty.
 * Throws if decryption fails (wrong key, tampered data).
 */
export function decrypt(encryptedText) {
    if (!encryptedText) return null
    const key = getEncryptionKey()

    const parts = encryptedText.split(":")
    if (parts.length !== 3) {
        // Not in encrypted format — might be legacy plaintext data
        return encryptedText
    }

    const [ivHex, authTagHex, ciphertext] = parts
    const iv = Buffer.from(ivHex, "hex")
    const authTag = Buffer.from(authTagHex, "hex")

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(ciphertext, "hex", "utf8")
    decrypted += decipher.final("utf8")
    return decrypted
}
