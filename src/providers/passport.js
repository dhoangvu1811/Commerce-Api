import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { env } from '~/config/environment'
import { googleOAuthService } from '~/services/googleOAuthService'

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
        // // Development logging
        // if (env.BUILD_MODE === 'dev') {
        //   // eslint-disable-next-line no-console
        //   console.log('🚀 ~ Google Profile:', profile)
        // }

        // Sử dụng service để xử lý logic OAuth
        const user = await googleOAuthService.handleGoogleOAuth(profile)
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

export default passport
