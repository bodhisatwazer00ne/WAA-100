import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? process.env.BACKEND_PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:5173',
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY ?? '',
    domain: process.env.MAILGUN_DOMAIN ?? '',
    from: process.env.MAILGUN_FROM ?? '',
    apiBaseUrl: process.env.MAILGUN_API_BASE_URL ?? 'https://api.mailgun.net',
  },
  smtp: {
    url: process.env.SMTP_URL ?? '',
    service: process.env.SMTP_SERVICE ?? '',
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    requireTls: process.env.SMTP_REQUIRE_TLS === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'WAA-100 <no-reply@example.com>',
  },
};
