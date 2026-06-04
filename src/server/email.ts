import nodemailer from 'nodemailer'
import type { MaizzleConfig } from '../types/index.ts'

export interface SendEmailPayload {
  to: string[]
  subject: string
  html: string
  text?: string
}

interface SendEmailResponse {
  success: boolean
  message: string
  previewUrl?: string
}

export async function sendEmail(
  payload: SendEmailPayload,
  config: MaizzleConfig,
  templateConfig: MaizzleConfig,
): Promise<SendEmailResponse> {
  // Template-level config takes priority over global config
  const emailConfig = templateConfig.server?.email ?? config.server?.email

  let transport: nodemailer.Transporter
  let isEthereal = false

  if (emailConfig?.transport) {
    transport = nodemailer.createTransport(emailConfig.transport as any)
  } else {
    // Fallback to Ethereal
    const testAccount = await nodemailer.createTestAccount()
    transport = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
    isEthereal = true
  }

  const from = emailConfig?.from ?? 'Maizzle <maizzle@ethereal.email>'

  const info = await transport.sendMail({
    from,
    to: payload.to.join(', '),
    subject: payload.subject || 'Test email',
    html: payload.html,
    text: payload.text || undefined,
  })

  const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) || undefined : undefined

  const recipient = payload.to.length === 1
    ? payload.to[0]
    : `${payload.to.length} recipients`

  return {
    success: true,
    message: isEthereal
      ? 'Sent via Ethereal'
      : `Sent to ${recipient}`,
    previewUrl: typeof previewUrl === 'string' ? previewUrl : undefined,
  }
}
