/**
 * Passport Configuration
 * Cấu hình OAuth strategies cho Google và Facebook
 */

import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import type {
  Profile as GoogleProfile,
  VerifyCallback
} from 'passport-google-oauth20'
import { Strategy as FacebookStrategy } from 'passport-facebook'
import type { Profile as FacebookProfile } from 'passport-facebook'
import { env } from '~/config/environment.js'
import { oAuthService } from '~/services/oAuthService.js'
import type { OAuthProvider } from '~/types/oauth.types.js'

// Không cần serialize/deserialize vì sử dụng JWT thay vì session

// ============================================================
// === Google OAuth Strategy ===
// ============================================================

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL
    },
    async function (
      _accessToken: string,
      _refreshToken: string,
      profile: GoogleProfile,
      done: VerifyCallback
    ): Promise<void> {
      try {
        // Development logging
        if (env.BUILD_MODE === 'dev') {
          // eslint-disable-next-line no-console
          console.log('🚀 ~ Google Profile:', profile)
        }

        // Sử dụng service để xử lý logic OAuth
        const provider: OAuthProvider = 'GOOGLE'
        const user = await oAuthService.handleOAuth(profile, provider)
        // Type assertion vì oAuthService trả về Document từ MongoDB
        done(null, user as unknown as Express.User | undefined)
      } catch (error) {
        if (env.BUILD_MODE === 'dev') {
          // eslint-disable-next-line no-console
          console.error('❌ Google OAuth Error:', error)
        }
        done(error as Error, undefined)
      }
    }
  )
)

// ============================================================
// === Facebook OAuth Strategy ===
// ============================================================

passport.use(
  new FacebookStrategy(
    {
      clientID: env.FACEBOOK_CLIENT_ID,
      clientSecret: env.FACEBOOK_CLIENT_SECRET,
      callbackURL: env.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'displayName', 'photos', 'email', 'name']
    },
    async function (
      _accessToken: string,
      _refreshToken: string,
      profile: FacebookProfile,
      done: (error: Error | null, user?: Express.User | false) => void
    ): Promise<void> {
      try {
        // Development logging
        if (env.BUILD_MODE === 'dev') {
          // eslint-disable-next-line no-console
          console.log('🚀 ~ Facebook Profile:', profile)
        }

        // Sử dụng service để xử lý logic OAuth
        const provider: OAuthProvider = 'FACEBOOK'
        const user = await oAuthService.handleOAuth(profile, provider)
        // Type assertion vì oAuthService trả về Document từ MongoDB
        done(null, user as unknown as Express.User | undefined)
      } catch (error) {
        if (env.BUILD_MODE === 'dev') {
          // eslint-disable-next-line no-console
          console.error('❌ Facebook OAuth Error:', error)
        }
        done(error as Error, undefined)
      }
    }
  )
)

export default passport
