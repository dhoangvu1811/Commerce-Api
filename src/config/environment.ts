/**
 * Environment Configuration
 * Cấu hình biến môi trường cho ứng dụng
 */

import type { EnvironmentVariables } from '~/types/environment.types.js'

/**
 * Object chứa các biến môi trường ứng dụng
 * @type {EnvironmentVariables}
 */
export const env: EnvironmentVariables = {
  // PostgreSQL
  DATABASE_URL: process.env.DATABASE_URL || '',
  DATABASE_DIRECT_URL: process.env.DATABASE_DIRECT_URL || '',

  // App Configuration
  LOCAL_DEV_APP_HOST: process.env.LOCAL_DEV_APP_HOST || 'localhost',
  LOCAL_DEV_APP_PORT: Number(process.env.LOCAL_DEV_APP_PORT) || 8017,
  BUILD_MODE: (process.env.BUILD_MODE as 'dev' | 'production') || 'dev',
  AUTHOR: process.env.AUTHOR || 'Developer',

  // JWT Secrets
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || '',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '5m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  // Brevo Email
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || process.env.ADMIN_EMAIL_ADDRESS || '',
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || process.env.ADMIN_EMAIL_NAME || '',
  ADMIN_NOTIFICATION_EMAIL: process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL_ADDRESS || '',

  // Website Domains
  WEBSITE_DOMAIN_DEVELOPMENT: process.env.WEBSITE_DOMAIN_DEVELOPMENT || 'http://localhost:5173',
  WEBSITE_DOMAIN_PRODUCTION: process.env.WEBSITE_DOMAIN_PRODUCTION || '',

  // CORS
  CORS_WHITELIST: process.env.CORS_WHITELIST || '',

  // GHN Shipping
  GHN_API_BASE_URL: process.env.GHN_API_BASE_URL || 'https://online-gateway.ghn.vn/shiip/public-api',
  GHN_TOKEN: process.env.GHN_TOKEN || '',
  GHN_SHOP_ID: Number(process.env.GHN_SHOP_ID) || 0,
  GHN_FROM_DISTRICT_ID: Number(process.env.GHN_FROM_DISTRICT_ID) || 0,
  GHN_FROM_WARD_ID: process.env.GHN_FROM_WARD_ID || '',
  GHN_DEFAULT_WEIGHT: process.env.GHN_DEFAULT_WEIGHT || '500',
  GHN_DEFAULT_LENGTH: process.env.GHN_DEFAULT_LENGTH || '20',
  GHN_DEFAULT_WIDTH: process.env.GHN_DEFAULT_WIDTH || '15',
  GHN_DEFAULT_HEIGHT: process.env.GHN_DEFAULT_HEIGHT || '5',
  GHN_FALLBACK_FEE: process.env.GHN_FALLBACK_FEE || '25000',

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || '',

  // Facebook OAuth
  FACEBOOK_CLIENT_ID: process.env.FACEBOOK_CLIENT_ID || '',
  FACEBOOK_CLIENT_SECRET: process.env.FACEBOOK_CLIENT_SECRET || '',
  FACEBOOK_CALLBACK_URL: process.env.FACEBOOK_CALLBACK_URL || '',

  // PayPal
  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || '',
  PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || '',
  PAYPAL_ENV: process.env.PAYPAL_ENV || 'sandbox',
  PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID || '',
  PAYPAL_CURRENCY: process.env.PAYPAL_CURRENCY || 'USD',
  PAYPAL_SOURCE_CURRENCY: process.env.PAYPAL_SOURCE_CURRENCY || 'VND',
  PAYPAL_VND_TO_USD_RATE: Number(process.env.PAYPAL_VND_TO_USD_RATE || '26000')
}
