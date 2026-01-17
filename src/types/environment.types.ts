/**
 * Environment type definitions
 */

/**
 * Build mode
 */
export type BuildMode = 'dev' | 'production'

/**
 * Environment variables configuration
 * @alias EnvironmentVariables
 */
export interface EnvironmentConfig {
  // PostgreSQL
  DATABASE_URL: string

  // App
  LOCAL_DEV_APP_HOST: string
  LOCAL_DEV_APP_PORT: number
  BUILD_MODE: BuildMode
  AUTHOR: string

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: string
  CLOUDINARY_API_KEY: string
  CLOUDINARY_API_SECRET: string

  // JWT
  JWT_ACCESS_SECRET: string
  JWT_ACCESS_EXPIRES_IN: string
  JWT_REFRESH_SECRET: string
  JWT_REFRESH_EXPIRES_IN: string

  // Google OAuth
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_CALLBACK_URL: string

  // Facebook OAuth
  FACEBOOK_CLIENT_ID: string
  FACEBOOK_CLIENT_SECRET: string
  FACEBOOK_CALLBACK_URL: string

  // Brevo Email
  BREVO_API_KEY: string
  ADMIN_EMAIL_ADDRESS: string
  ADMIN_EMAIL_NAME: string

  // Website domains
  WEBSITE_DOMAIN_DEVELOPMENT: string
  WEBSITE_DOMAIN_PRODUCTION: string
}

/**
 * Alias cho EnvironmentConfig
 */
export type EnvironmentVariables = EnvironmentConfig
