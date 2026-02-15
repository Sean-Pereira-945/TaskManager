import nodemailer, { type Transporter } from 'nodemailer'

import { env } from '../config/env'

const emailConfigured = Boolean(
  env.EMAIL_SMTP_HOST &&
  env.EMAIL_SMTP_PORT &&
  env.EMAIL_SMTP_USER &&
  env.EMAIL_SMTP_PASS &&
  env.EMAIL_FROM,
)

let transporter: Transporter | null = null

if (emailConfigured) {
  transporter = nodemailer.createTransport({
    host: env.EMAIL_SMTP_HOST as string,
    port: env.EMAIL_SMTP_PORT as number,
    secure: env.EMAIL_SMTP_SECURE,
    auth: {
      user: env.EMAIL_SMTP_USER as string,
      pass: env.EMAIL_SMTP_PASS as string,
    },
  })
} else {
  console.info('SMTP credentials missing – email reminders are disabled.')
}

export const isEmailEnabled = () => transporter !== null

export type SendEmailPayload = {
  to: string
  subject: string
  text: string
  html?: string
}

export const sendEmail = async (payload: SendEmailPayload) => {
  if (!transporter) {
    throw new Error('Email transport not configured')
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    ...payload,
  })
}
