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
  DATABASE_DIRECT_URL: string

  // App
  LOCAL_DEV_APP_HOST: string
  LOCAL_DEV_APP_PORT: number
  BUILD_MODE: BuildMode
  AUTHOR: string
  RECOMMENDER_API_URL: string

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
  BREVO_SENDER_EMAIL: string
  BREVO_SENDER_NAME: string
  ADMIN_NOTIFICATION_EMAIL: string

  // Website domains
  WEBSITE_DOMAIN_DEVELOPMENT: string
  WEBSITE_DOMAIN_PRODUCTION: string

  // CORS
  CORS_WHITELIST: string

  // GHN Shipping
  GHN_API_BASE_URL: string
  GHN_TOKEN: string
  GHN_SHOP_ID: number
  GHN_FROM_DISTRICT_ID: number
  GHN_FROM_WARD_ID: string
  GHN_DEFAULT_WEIGHT: string
  GHN_DEFAULT_LENGTH: string
  GHN_DEFAULT_WIDTH: string
  GHN_DEFAULT_HEIGHT: string
  GHN_FALLBACK_FEE: string

  // PayPal
  PAYPAL_CLIENT_ID: string
  PAYPAL_CLIENT_SECRET: string
  PAYPAL_ENV: string
  PAYPAL_WEBHOOK_ID: string
  PAYPAL_CURRENCY: string
  PAYPAL_SOURCE_CURRENCY: string
  PAYPAL_VND_TO_USD_RATE: number
}

/**
 * Alias cho EnvironmentConfig
 */
export type EnvironmentVariables = EnvironmentConfig
