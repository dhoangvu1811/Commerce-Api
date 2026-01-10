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
  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI || '',
  DATABASE_NAME: process.env.DATABASE_NAME || '',

  // App Configuration
  LOCAL_DEV_APP_HOST: process.env.LOCAL_DEV_APP_HOST || 'localhost',
  LOCAL_DEV_APP_PORT: Number(process.env.LOCAL_DEV_APP_PORT) || 8017,
  BUILD_MODE: (process.env.BUILD_MODE as 'dev' | 'production') || 'dev',

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
  ADMIN_EMAIL_ADDRESS: process.env.ADMIN_EMAIL_ADDRESS || '',
  ADMIN_EMAIL_NAME: process.env.ADMIN_EMAIL_NAME || '',

  // Website Domains
  WEBSITE_DOMAIN_DEVELOPMENT: process.env.WEBSITE_DOMAIN_DEVELOPMENT || 'http://localhost:5173',
  WEBSITE_DOMAIN_PRODUCTION: process.env.WEBSITE_DOMAIN_PRODUCTION || '',

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || '',

  // Facebook OAuth
  FACEBOOK_CLIENT_ID: process.env.FACEBOOK_CLIENT_ID || '',
  FACEBOOK_CLIENT_SECRET: process.env.FACEBOOK_CLIENT_SECRET || '',
  FACEBOOK_CALLBACK_URL: process.env.FACEBOOK_CALLBACK_URL || ''
}
