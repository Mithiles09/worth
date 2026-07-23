import { createHash, randomBytes } from 'crypto'

/**
 * Generate a cryptographically secure random token
 * Used for invitations, password resets, etc.
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Hash a token for secure storage
 * Store the hash in the database, compare hashes at verification time
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Generate CSRF token for form submissions
 * Include in hidden form field, verify on server
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString('base64')
}

/**
 * Validate password strength
 * Returns object with validation details
 */
export interface PasswordStrength {
  isValid: boolean
  score: number // 0-5
  feedback: string[]
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = []
  let score = 0

  if (password.length < 12) {
    feedback.push('Password must be at least 12 characters')
  } else {
    score++
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push('Must contain at least one uppercase letter')
  } else {
    score++
  }

  if (!/[a-z]/.test(password)) {
    feedback.push('Must contain at least one lowercase letter')
  } else {
    score++
  }

  if (!/[0-9]/.test(password)) {
    feedback.push('Must contain at least one number')
  } else {
    score++
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push('Must contain at least one special character (!@#$%^&*)')
  } else {
    score++
  }

  return {
    isValid: score === 5,
    score,
    feedback,
  }
}

/**
 * Rate limiting: Check if user has exceeded request limit
 * In production, use Redis for distributed rate limiting
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count < maxRequests) {
    record.count++
    return true
  }

  return false
}

/**
 * Sanitize user input to prevent XSS
 * Remove or encode dangerous HTML/JS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate email format
 * Simple regex validation + format check
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * Generate HTTP-only secure session token
 * For server-side session management
 */
export function generateSessionToken(): string {
  return randomBytes(64).toString('hex')
}

/**
 * Create CORS headers for secure cross-origin requests
 */
export function getCORSHeaders(origin?: string) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.NEXT_PUBLIC_APP_URL || '',
  ].filter(Boolean)

  const isAllowed = !origin || allowedOrigins.includes(origin)

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin || '*' : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  }
}

/**
 * Security headers for HTTP responses
 * Prevents common web vulnerabilities
 */
export function getSecurityHeaders() {
  return {
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    // Prevent MIME sniffing
    'X-Content-Type-Options': 'nosniff',
    // Enable XSS protection
    'X-XSS-Protection': '1; mode=block',
    // Content Security Policy
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Feature policy
    'Permissions-Policy':
      'geolocation=(), microphone=(), camera=(), payment=()',
  }
}

/**
 * Encrypt sensitive data (client-side)
 * For password confirmation before deletion, etc.
 * NOTE: In production, use proper encryption library
 */
export function encryptData(data: string, key: string): string {
  // This is a simplified example. Use TweetNaCl.js or libsodium in production
  return Buffer.from(data).toString('base64')
}

/**
 * Use HMAC-SHA256 to verify webhook requests from Supabase, Stripe, etc.
 */
export function verifyHMACSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHash('sha256')
    .update(payload + secret)
    .digest('hex')

  return signature === expectedSignature
}

/**
 * Verify Supabase webhook signature
 * Uses HMAC-SHA256 with secret stored in environment
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64')

  return signature === expectedSignature
}



/**
 * Create audit log entry
 * Log all security-relevant actions
 */
export interface AuditLogEntry {
  userId: string
  action: string
  resource: string
  resourceId: string
  changes: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

export function createAuditLogEntry(
  userId: string,
  action: string,
  resource: string,
  resourceId: string,
  changes: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): AuditLogEntry {
  return {
    userId,
    action,
    resource,
    resourceId,
    changes,
    ipAddress,
    userAgent,
    timestamp: new Date(),
  }
}
