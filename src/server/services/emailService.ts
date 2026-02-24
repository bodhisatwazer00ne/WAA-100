import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const resendApiBase = env.resend.apiBaseUrl.replace(/\/+$/, '');
const resendEndpoint = `${resendApiBase}/emails`;
const hasResendConfig = !!env.resend.apiKey;
const resendFrom = env.resend.from || env.smtp.from;

const hasUrl = !!env.smtp.url;
const hasService = !!env.smtp.service;
const hasHostConfig = !!env.smtp.host;
const hasAuth = !!env.smtp.user && !!env.smtp.pass;
const disabled = (!hasUrl && !hasService && !hasHostConfig) || !hasAuth;

const transporter = !disabled ? nodemailer.createTransport(
  hasUrl
    ? env.smtp.url
    : {
        ...(hasService ? { service: env.smtp.service } : {
          host: env.smtp.host,
          port: env.smtp.port,
          secure: env.smtp.secure,
        }),
        requireTLS: env.smtp.requireTls,
        auth: {
          user: env.smtp.user,
          pass: env.smtp.pass,
        },
      },
) : null;

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

const RESEND_MAX_ATTEMPTS = 5;
const RESEND_BASE_DELAY_MS = 500;
const RESEND_MAX_DELAY_MS = 20_000;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseRetryAfterMs(retryAfter: string | null): number | null {
  if (!retryAfter) return null;

  const asSeconds = Number(retryAfter);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.round(asSeconds * 1000);
  }

  const asDate = Date.parse(retryAfter);
  if (!Number.isNaN(asDate)) {
    const delta = asDate - Date.now();
    return delta > 0 ? delta : 0;
  }

  return null;
}

function getBackoffMs(attempt: number, retryAfterHeader: string | null): number {
  const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
  if (retryAfterMs !== null) {
    return Math.min(RESEND_MAX_DELAY_MS, retryAfterMs);
  }
  const exp = RESEND_BASE_DELAY_MS * 2 ** (attempt - 1);
  return Math.min(RESEND_MAX_DELAY_MS, exp);
}

async function sendViaResend(options: SendEmailOptions) {
  if (!resendFrom) {
    throw new Error('Resend configured but sender address is missing (set RESEND_FROM)');
  }

  const payload = {
    from: resendFrom,
    to: [options.to],
    subject: options.subject,
    ...(options.text ? { text: options.text } : {}),
    ...(options.html ? { html: options.html } : {}),
  };

  for (let attempt = 1; attempt <= RESEND_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(resendEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.resend.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const raw = await response.text();
      if (response.ok) {
        let parsed: { id?: string } = {};
        try {
          parsed = JSON.parse(raw) as { id?: string };
        } catch {
          parsed = {};
        }

        return {
          messageId: parsed.id ?? '',
          accepted: [options.to],
          rejected: [],
          response: raw,
        };
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < RESEND_MAX_ATTEMPTS) {
        const waitMs = getBackoffMs(attempt, response.headers.get('retry-after'));
        await sleep(waitMs);
        continue;
      }

      throw new Error(
        `Resend send failed (${response.status}) after ${attempt} attempt(s): ${raw}`,
      );
    } catch (error) {
      if (attempt < RESEND_MAX_ATTEMPTS) {
        const waitMs = getBackoffMs(attempt, null);
        await sleep(waitMs);
        continue;
      }
      throw new Error(`Resend request failed after ${attempt} attempt(s): ${String(error)}`);
    }
  }

  throw new Error('Resend send failed: exhausted retry attempts');
}

export async function sendEmail(options: SendEmailOptions) {
  if (hasResendConfig) {
    return sendViaResend(options);
  }

  if (!transporter) {
    throw new Error('Email disabled; no provider configured');
  }

  const info = await transporter.sendMail({
    from: env.smtp.from,
    ...options,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  };
}

export async function verifyEmailConnection() {
  if (hasResendConfig) {
    if (!resendFrom) {
      return {
        ok: false as const,
        provider: 'resend' as const,
        reason: 'Resend configured but RESEND_FROM/SMTP_FROM missing',
      };
    }
    return {
      ok: true as const,
      provider: 'resend' as const,
      detail: `endpoint ${resendEndpoint}`,
    };
  }

  if (!transporter) {
    return { ok: false as const, provider: 'none' as const, reason: 'No email provider configured' };
  }
  try {
    await transporter.verify();
    return { ok: true as const, provider: 'smtp' as const, detail: 'SMTP connection verified' };
  } catch (error) {
    return { ok: false as const, provider: 'smtp' as const, reason: String(error) };
  }
}

