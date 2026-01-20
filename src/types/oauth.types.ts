/**
 * OAuth type definitions
 * Types cho Google và Facebook OAuth
 */

/**
 * OAuth Provider types
 */
export type OAuthProvider = 'google' | 'facebook' | 'GOOGLE' | 'FACEBOOK'

/**
 * Google profile từ Passport
 */
export interface GoogleProfile {
  id: string
  displayName: string
  name: {
    familyName: string
    givenName: string
  }
  emails: Array<{
    value: string
    verified: boolean
  }>
  photos: Array<{
    value: string
  }>
  provider: 'google'
  _raw: string
  _json: GoogleProfileJson
}

/**
 * Google profile JSON data
 */
export interface GoogleProfileJson {
  sub: string
  name: string
  given_name: string
  family_name: string
  picture: string
  email: string
  email_verified: boolean
  locale: string
}

/**
 * Facebook profile từ Passport
 */
export interface FacebookProfile {
  id: string
  displayName: string
  name?: {
    familyName: string
    givenName: string
    middleName?: string
  }
  emails?: Array<{
    value: string
  }>
  photos?: Array<{
    value: string
  }>
  provider: 'facebook'
  _raw: string
  _json: FacebookProfileJson
}

/**
 * Facebook profile JSON data
 */
export interface FacebookProfileJson {
  id: string
  name: string
  email?: string
  picture?: {
    data: {
      url: string
      width: number
      height: number
    }
  }
}

/**
 * Normalized OAuth user data
 */
export interface OAuthUserData {
  email: string
  name: string
  avatar: string
  provider: OAuthProvider
  providerId: string
  emailVerified: boolean
}

/**
 * OAuth callback result
 */
export interface OAuthCallbackResult {
  user: OAuthUserData
  isNewUser: boolean
  accessToken: string
  refreshToken: string
  sessionId: string
}

/**
 * Passport done callback
 */
export type PassportDoneCallback = (
  error: Error | null,
  user?: Express.User | false,
  info?: { message: string }
) => void

/**
 * Passport verify callback for Google
 */
export type GoogleVerifyCallback = (
  accessToken: string,
  refreshToken: string,
  profile: GoogleProfile,
  done: PassportDoneCallback
) => void | Promise<void>

/**
 * Passport verify callback for Facebook
 */
export type FacebookVerifyCallback = (
  accessToken: string,
  refreshToken: string,
  profile: FacebookProfile,
  done: PassportDoneCallback
) => void | Promise<void>
