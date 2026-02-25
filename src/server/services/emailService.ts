import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const mailgunApiBase = env.mailgun.apiBaseUrl.replace(/\/+$/, '');
const mailgunEndpoint = `${mailgunApiBase}/v3/${env.mailgun.domain}/messages`;
const hasMailgunConfig = !!env.mailgun.apiKey && !!env.mailgun.domain;
const hasPartialMailgunConfig = !!env.mailgun.apiKey || !!env.mailgun.domain;
const mailgunFrom = env.mailgun.from || env.smtp.from;

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

const MAILGUN_MAX_ATTEMPTS = 5;
const MAILGUN_BASE_DELAY_MS = 500;
const MAILGUN_MAX_DELAY_MS = 20_000;

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
    return Math.min(MAILGUN_MAX_DELAY_MS, retryAfterMs);
  }
  const exp = MAILGUN_BASE_DELAY_MS * 2 ** (attempt - 1);
  return Math.min(MAILGUN_MAX_DELAY_MS, exp);
}

async function sendViaMailgun(options: SendEmailOptions) {
  if (!mailgunFrom) {
    throw new Error('Mailgun configured but sender address is missing (set MAILGUN_FROM or SMTP_FROM)');
  }
  if (!options.text && !options.html) {
    throw new Error('Either text or html body is required');
  }

  const payload = new URLSearchParams();
  payload.set('from', mailgunFrom);
  payload.set('to', options.to);
  payload.set('subject', options.subject);
  if (options.text) payload.set('text', options.text);
  if (options.html) payload.set('html', options.html);

  const authToken = Buffer.from(`api:${env.mailgun.apiKey}`).toString('base64');

  for (let attempt = 1; attempt <= MAILGUN_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(mailgunEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload.toString(),
      });

      const raw = await response.text();
      if (response.ok) {
        let parsed: { id?: string; message?: string } = {};
        try {
          parsed = JSON.parse(raw) as { id?: string; message?: string };
        } catch {
          parsed = {};
        }

        return {
          messageId: parsed.id ?? '',
          accepted: [options.to],
          rejected: [],
          response: parsed.message ?? raw,
        };
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < MAILGUN_MAX_ATTEMPTS) {
        const waitMs = getBackoffMs(attempt, response.headers.get('retry-after'));
        await sleep(waitMs);
        continue;
      }

      throw new Error(
        `Mailgun send failed (${response.status}) after ${attempt} attempt(s): ${raw}`,
      );
    } catch (error) {
      if (attempt < MAILGUN_MAX_ATTEMPTS) {
        const waitMs = getBackoffMs(attempt, null);
        await sleep(waitMs);
        continue;
      }
      throw new Error(`Mailgun request failed after ${attempt} attempt(s): ${String(error)}`);
    }
  }

  throw new Error('Mailgun send failed: exhausted retry attempts');
}

export async function sendEmail(options: SendEmailOptions) {
  if (hasMailgunConfig) {
    return sendViaMailgun(options);
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
  if (hasPartialMailgunConfig && !hasMailgunConfig) {
    return {
      ok: false as const,
      provider: 'mailgun' as const,
      reason: 'MAILGUN_API_KEY and MAILGUN_DOMAIN must both be set',
    };
  }

  if (hasMailgunConfig) {
    if (!mailgunFrom) {
      return {
        ok: false as const,
        provider: 'mailgun' as const,
        reason: 'Mailgun configured but MAILGUN_FROM/SMTP_FROM missing',
      };
    }
    return {
      ok: true as const,
      provider: 'mailgun' as const,
      detail: `endpoint ${mailgunEndpoint}`,
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

