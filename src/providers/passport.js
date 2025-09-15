import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as FacebookStrategy } from 'passport-facebook'
import { env } from '~/config/environment'
import { oAuthService } from '~/services/oAuthService'

// Không cần serialize/deserialize vì sử dụng JWT thay vì session

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        // Development logging
        if (env.BUILD_MODE === 'dev') {
          // eslint-disable-next-line no-console
          console.log('🚀 ~ Google Profile:', profile)
        }

        // Sử dụng service để xử lý logic OAuth
        const user = await oAuthService.handleOAuth(profile, 'GOOGLE')
        return done(null, user)
      } catch (error) {
        if (env.BUILD_MODE === 'dev') {
          // eslint-disable-next-line no-console
          console.error('❌ Google OAuth Error:', error)
        }
        return done(error, null)
      }
    }
  )
)

passport.use(
  new FacebookStrategy(
    {
      clientID: env.FACEBOOK_CLIENT_ID,
      clientSecret: env.FACEBOOK_CLIENT_SECRET,
      callbackURL: env.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'displayName', 'photos', 'email', 'name']
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        // Development logging
        if (env.BUILD_MODE === 'dev') {
          // eslint-disable-next-line no-console
          console.log('🚀 ~ Facebook Profile:', profile)
        }

        // Sử dụng service để xử lý logic OAuth
        const user = await oAuthService.handleOAuth(profile, 'FACEBOOK')
        return done(null, user)
      } catch (error) {
        if (env.BUILD_MODE === 'dev') {
          // eslint-disable-next-line no-console
          console.error('❌ Facebook OAuth Error:', error)
        }
        return done(error, null)
      }
    }
  )
)

export default passport
