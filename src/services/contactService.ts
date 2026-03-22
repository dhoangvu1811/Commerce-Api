/**
 * Contact Service
 */

import { contactModel } from '~/models/contactModel.js'
import { BrevoProvider } from '~/providers/BrevoProvider.js'
import { env } from '~/config/environment.js'
import { WEBSITE_DOMAIN } from '~/utils/constants.js'
import ApiError from '~/utils/ApiError.js'
import { StatusCodes } from 'http-status-codes'

interface ContactPayload {
  fullName: string
  email: string
  phoneNumber: string
  message: string
}

interface ContactSubmitResult {
  contact: Awaited<ReturnType<typeof contactModel.create>>
  emailNotificationSent: boolean
  autoReplySent: boolean
}

interface ReplyContactPayload {
  subject?: string
  message: string
}

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const logContactEmailError = (flow: 'admin-notification' | 'auto-reply', recipient: string, error: unknown): void => {
  const message = error instanceof Error ? error.message : 'Unknown error while sending email'

  process.stderr.write(`[ContactService] ${flow} failed for ${recipient}: ${message}\n`)
}

const sanitizeContactPayload = (data: ContactPayload): ContactPayload => {
  return {
    fullName: escapeHtml(data.fullName),
    email: escapeHtml(data.email),
    phoneNumber: escapeHtml(data.phoneNumber),
    message: escapeHtml(data.message)
  }
}

const formatMultilineHtml = (value: string): string => {
  return value.replace(/\r?\n/g, '<br/>')
}

const sanitizeRichTextForEmail = (value: string): string => {
  const allowedTags = new Set([
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'ul',
    'ol',
    'li',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'a'
  ])

  const withoutDangerousBlocks = value
    .replace(/<\s*(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<!--([\s\S]*?)-->/g, '')

  const tagRegex = /<\/?([a-z0-9]+)(\s[^>]*)?>/gi
  let sanitized = ''
  let lastIndex = 0
  let match: RegExpExecArray | null = tagRegex.exec(withoutDangerousBlocks)

  while (match) {
    const [fullTag, tagNameRaw = '', attrRaw = ''] = match
    const tagName = tagNameRaw.toLowerCase()
    const textBeforeTag = withoutDangerousBlocks.slice(lastIndex, match.index)

    sanitized += formatMultilineHtml(escapeHtml(textBeforeTag))

    if (allowedTags.has(tagName)) {
      const isClosingTag = fullTag.startsWith('</')

      if (isClosingTag) {
        sanitized += `</${tagName}>`
      } else if (tagName === 'br') {
        sanitized += '<br/>'
      } else if (tagName === 'a') {
        const hrefMatch = attrRaw.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
        const hrefValue = hrefMatch?.[1] || hrefMatch?.[2] || hrefMatch?.[3] || ''
        const trimmedHref = hrefValue.trim()
        const safeHref = /^(https?:\/\/|mailto:|tel:)/i.test(trimmedHref) ? escapeHtml(trimmedHref) : '#'

        sanitized += `<a href="${safeHref}" target="_blank" rel="noopener noreferrer nofollow">`
      } else {
        sanitized += `<${tagName}>`
      }
    }

    lastIndex = match.index + fullTag.length
    match = tagRegex.exec(withoutDangerousBlocks)
  }

  const trailingText = withoutDangerousBlocks.slice(lastIndex)

  sanitized += formatMultilineHtml(escapeHtml(trailingText))

  return sanitized.trim()
}

const sanitizeEmailSubjectValue = (value: string): string => {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

const getSafeWebsiteDomain = (): string | null => {
  const domain = WEBSITE_DOMAIN.trim()

  if (/^https?:\/\//i.test(domain)) {
    return domain
  }

  return null
}

const buildManualReplyTemplate = (fullName: string, message: string): string => {
  const safeName = escapeHtml(fullName)
  const safeMessage = sanitizeRichTextForEmail(message)
  const safeWebsiteDomain = getSafeWebsiteDomain()
  const safeWebsiteLink = safeWebsiteDomain ? escapeHtml(safeWebsiteDomain) : ''
  const ctaSection = safeWebsiteLink
    ? `<div class="cta-wrap"><a class="cta" href="${safeWebsiteLink}">Truy cập website</a></div>`
    : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Phản hồi từ bộ phận hỗ trợ</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #eef5ff; color: #1e293b; padding: 0; }
        .wrapper { width: 100%; padding: 22px 0; }
        .container { max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #dbe8ff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 28px rgba(25, 50, 120, 0.1); }
        .hero { background: linear-gradient(120deg, #1d4ed8, #2563eb 55%, #0ea5e9); color: #ffffff; padding: 28px 30px 22px; }
        .hero h2 { margin: 0; font-size: 23px; line-height: 1.3; }
        .hero p { margin: 8px 0 0; font-size: 14px; opacity: 0.96; }
        .content { padding: 24px 30px 20px; }
        .intro { margin: 0 0 14px; line-height: 1.7; font-size: 15px; }
        .message-box { background: #f8fbff; border: 1px solid #dbe8ff; border-radius: 10px; padding: 14px; line-height: 1.7; font-size: 14px; color: #0f172a; }
        .cta-wrap { text-align: center; margin: 22px 0 12px; }
        .cta { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 10px; padding: 12px 22px; font-size: 14px; font-weight: 700; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 20px; text-align: center; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="hero">
            <h2>Phản hồi từ bộ phận hỗ trợ Commerce</h2>
            <p>Xin chào ${safeName}, chúng tôi đã xử lý yêu cầu của bạn.</p>
          </div>
          <div class="content">
            <p class="intro">Dưới đây là nội dung phản hồi chính thức từ đội ngũ hỗ trợ:</p>
            <div class="message-box">${safeMessage}</div>
            ${ctaSection}
          </div>
          <div class="footer">Email được gửi từ hệ thống chăm sóc khách hàng của Commerce.</div>
        </div>
      </div>
    </body>
    </html>
  `
}

const buildAdminEmailTemplate = (data: ContactPayload): string => {
  const safeData = sanitizeContactPayload(data)
  const formattedMessage = formatMultilineHtml(safeData.message)

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Liên hệ mới từ website</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f0f4ff; color: #1f2937; margin: 0; padding: 0; }
        .wrapper { width: 100%; background: #f0f4ff; padding: 24px 0; }
        .container { max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #dbe3ff; box-shadow: 0 10px 30px rgba(20, 40, 120, 0.08); }
        .hero { background: linear-gradient(120deg, #1d4ed8, #2563eb 55%, #0ea5e9); padding: 26px 28px; color: #ffffff; }
        .hero h2 { margin: 0; font-size: 22px; line-height: 1.35; }
        .hero p { margin: 8px 0 0; opacity: 0.95; font-size: 14px; }
        .content { padding: 24px 28px 28px; }
        .section-title { margin: 0 0 14px; font-size: 16px; color: #0f172a; }
        .row { margin-bottom: 10px; font-size: 14px; }
        .label { display: inline-block; width: 118px; color: #475569; font-weight: 700; }
        .value { color: #0f172a; font-weight: 500; }
        .message-box { margin-top: 14px; background: #f8faff; border: 1px solid #dbe3ff; border-radius: 10px; padding: 14px; line-height: 1.65; font-size: 14px; }
        .footer { border-top: 1px solid #e5e7eb; padding: 14px 20px; font-size: 12px; color: #64748b; text-align: center; background: #fbfdff; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="hero">
            <h2>Bạn có một liên hệ mới từ website</h2>
            <p>Vui lòng kiểm tra chi tiết bên dưới để hỗ trợ khách hàng nhanh nhất.</p>
          </div>

          <div class="content">
            <h3 class="section-title">Thông tin người gửi</h3>
            <div class="row"><span class="label">Họ tên:</span> <span class="value">${safeData.fullName}</span></div>
            <div class="row"><span class="label">Email:</span> <span class="value">${safeData.email}</span></div>
            <div class="row"><span class="label">Số điện thoại:</span> <span class="value">${safeData.phoneNumber}</span></div>

            <h3 class="section-title" style="margin-top: 18px;">Nội dung liên hệ</h3>
            <div class="message-box">${formattedMessage}</div>
          </div>

          <div class="footer">
            Email được gửi từ hệ thống Contact Form của Commerce.
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

const buildAutoReplyTemplate = (data: ContactPayload): string => {
  const safeData = sanitizeContactPayload(data)
  const formattedMessage = formatMultilineHtml(safeData.message)
  const safeWebsiteDomain = getSafeWebsiteDomain()
  const safeWebsiteLink = safeWebsiteDomain ? escapeHtml(safeWebsiteDomain) : ''
  const ctaSection = safeWebsiteLink
    ? `<div class="cta-wrap">
              <a class="cta" href="${safeWebsiteLink}">Quay lại website</a>
            </div>`
    : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Xác nhận đã nhận liên hệ</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #eef5ff; color: #1e293b; padding: 0; }
        .wrapper { width: 100%; padding: 22px 0; }
        .container { max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #dbe8ff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 28px rgba(25, 50, 120, 0.1); }
        .hero { background: radial-gradient(circle at 20% 20%, #3b82f6, #2563eb 45%, #1d4ed8); color: #ffffff; padding: 30px 30px 24px; }
        .badge { display: inline-block; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.45); border-radius: 999px; padding: 6px 12px; font-size: 12px; letter-spacing: 0.3px; }
        .hero h2 { margin: 12px 0 6px; font-size: 24px; line-height: 1.3; }
        .hero p { margin: 0; font-size: 14px; opacity: 0.96; }
        .content { padding: 24px 30px 20px; }
        .intro { margin: 0 0 14px; line-height: 1.7; font-size: 15px; }
        .summary { background: #f8fbff; border: 1px solid #dbe8ff; border-radius: 10px; padding: 14px; }
        .summary-title { margin: 0 0 10px; color: #1e3a8a; font-size: 14px; font-weight: 700; }
        .message { line-height: 1.7; font-size: 14px; color: #0f172a; }
        .cta-wrap { text-align: center; margin: 22px 0 12px; }
        .cta { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 10px; padding: 12px 22px; font-size: 14px; font-weight: 700; }
        .meta { margin-top: 10px; font-size: 13px; color: #475569; line-height: 1.6; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 20px; text-align: center; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="hero">
            <span class="badge">THÔNG BÁO TỪ COMMERCE</span>
            <h2>Cảm ơn ${safeData.fullName} đã liên hệ với chúng tôi</h2>
            <p>Yêu cầu của bạn đã được ghi nhận thành công.</p>
          </div>

          <div class="content">
            <p class="intro">
              Đội ngũ hỗ trợ đang xem xét thông tin và sẽ phản hồi đến bạn trong thời gian sớm nhất.
            </p>

            <div class="summary">
              <p class="summary-title">Nội dung bạn đã gửi</p>
              <div class="message">${formattedMessage}</div>
            </div>

            ${ctaSection}

            <p class="meta">
              Nếu bạn cần cập nhật thêm thông tin, vui lòng gửi lại từ form liên hệ trên website.
            </p>
          </div>

          <div class="footer">
            Đây là email tự động. Vui lòng không trả lời trực tiếp email này.
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Gửi liên hệ
 */
const sendContact = async (data: ContactPayload): Promise<ContactSubmitResult> => {
  const contact = await contactModel.create(data)

  let emailNotificationSent = false
  let autoReplySent = false

  const adminEmail = env.ADMIN_EMAIL_ADDRESS

  if (adminEmail) {
    try {
      const safeSubjectName = sanitizeEmailSubjectValue(data.fullName)
      const safeSubjectEmail = sanitizeEmailSubjectValue(data.email)

      await BrevoProvider.sendEmail(
        adminEmail,
        `[CONTACT] ${safeSubjectName} - ${safeSubjectEmail}`,
        buildAdminEmailTemplate(data)
      )
      emailNotificationSent = true
    } catch (error) {
      emailNotificationSent = false
      logContactEmailError('admin-notification', adminEmail, error)
    }
  } else {
    process.stderr.write('[ContactService] ADMIN_EMAIL_ADDRESS is empty, admin notification email skipped.\n')
  }

  try {
    await BrevoProvider.sendEmail(data.email, 'Chúng tôi đã nhận được liên hệ của bạn', buildAutoReplyTemplate(data))
    autoReplySent = true
  } catch (error) {
    autoReplySent = false
    logContactEmailError('auto-reply', data.email, error)
  }

  return {
    contact,
    emailNotificationSent,
    autoReplySent
  }
}

/**
 * Lấy danh sách contact (Admin)
 */
const getContacts = async (page: number, limit: number, status: 'all' | 'replied' | 'pending' = 'all') => {
  return await contactModel.getMany(page, limit, status)
}

const replyContact = async (contactId: number, payload: ReplyContactPayload) => {
  const targetContact = await contactModel.findById(contactId)

  if (!targetContact) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy liên hệ cần phản hồi')
  }

  if (targetContact.isReply) {
    throw new ApiError(StatusCodes.CONFLICT, 'Liên hệ này đã được phản hồi trước đó')
  }

  const subject = sanitizeEmailSubjectValue(payload.subject || 'Phản hồi liên hệ từ Commerce')

  await BrevoProvider.sendEmail(
    targetContact.email,
    subject,
    buildManualReplyTemplate(targetContact.fullName, payload.message)
  )

  const updatedContact = await contactModel.markAsReplied(contactId)

  return {
    contact: updatedContact,
    repliedEmail: targetContact.email
  }
}

export const contactService = {
  sendContact,
  getContacts,
  replyContact
}
