/**
 * Brevo Email Provider
 * Xử lý gửi email thông qua Brevo (formerly Sendinblue)
 */

import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo'
import { env } from '~/config/environment.js'
import type { BrevoEmailResult } from '~/types/brevo.types.js'

// Khởi tạo API instance
const apiInstance = new TransactionalEmailsApi()

// Cấu hình API key - sử dụng setApiKey method
apiInstance.setApiKey(0, env.BREVO_API_KEY)

/**
 * Gửi email thông qua Brevo
 * @param {string} recipientEmail - Email người nhận
 * @param {string} customSubject - Tiêu đề email
 * @param {string} customHtmlContent - Nội dung HTML của email
 * @returns {Promise<BrevoEmailResult>} Kết quả gửi email
 */
const sendEmail = async (
  recipientEmail: string,
  customSubject: string,
  customHtmlContent: string
): Promise<BrevoEmailResult> => {
  // Khởi tạo SendSmtpEmail với thông tin cần thiết
  const sendSmtpEmail = new SendSmtpEmail()

  // Tài khoản gửi mail
  sendSmtpEmail.sender = {
    email: env.ADMIN_EMAIL_ADDRESS,
    name: env.ADMIN_EMAIL_NAME
  }

  // Những tài khoản nhận mail
  sendSmtpEmail.to = [{ email: recipientEmail }]

  // Tiêu đề email
  sendSmtpEmail.subject = customSubject

  // Nội dung email
  sendSmtpEmail.htmlContent = customHtmlContent

  // Gọi hành động gửi mail - result có body.messageId
  const result = await apiInstance.sendTransacEmail(sendSmtpEmail)

  return { messageId: result.body.messageId || '' }
}

/**
 * Brevo Provider object chứa các methods
 */
export const BrevoProvider = {
  sendEmail
}
