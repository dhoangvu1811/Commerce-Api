/**
 * Brevo (Email) Provider type definitions
 */

/**
 * Email sender info
 */
export interface EmailSender {
  email: string
  name: string
}

/**
 * Email recipient info
 */
export interface EmailRecipient {
  email: string
  name?: string
}

/**
 * Email attachment
 */
export interface EmailAttachment {
  url?: string
  content?: string
  name: string
}

/**
 * Kết quả gửi email từ Brevo
 */
export interface BrevoEmailResult {
  messageId: string
}

/**
 * Alias cho BrevoEmailResult
 */
export type BrevoSendEmailResult = BrevoEmailResult

/**
 * Options cho gửi email
 */
export interface SendEmailOptions {
  recipientEmail: string
  subject: string
  htmlContent: string
  textContent?: string
  attachments?: EmailAttachment[]
}

/**
 * Brevo Provider interface
 */
export interface IBrevoProvider {
  sendEmail: (
    recipientEmail: string,
    customSubject: string,
    customHtmlContent: string
  ) => Promise<BrevoEmailResult>
}

/**
 * Email templates
 */
export type EmailTemplateType =
  | 'verification'
  | 'welcome'
  | 'password_reset'
  | 'order_confirmation'
  | 'order_shipped'
  | 'order_delivered'
