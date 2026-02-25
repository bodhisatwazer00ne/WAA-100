# Email Setup (Mailgun Preferred)

WAA-100 now supports:

- Mailgun HTTP API (recommended for Render Free)
- SMTP via Nodemailer (fallback if Mailgun vars are not set)

## 1) Recommended: Mailgun Sandbox/Domain API

Set these backend env vars:

```env
MAILGUN_API_KEY="key-xxxxxxxxxxxxxxxx"
MAILGUN_DOMAIN="sandbox-xxxx.mailgun.org"
MAILGUN_FROM="WAA-100 <postmaster@sandbox-xxxx.mailgun.org>"
MAILGUN_API_BASE_URL="https://api.mailgun.net"
```

Notes:

- For sandbox mode, recipients must be authorized in Mailgun.
- For production, switch to a verified custom domain.

## 2) Optional fallback: SMTP

Use SMTP only when Mailgun config is not set.

```env
SMTP_SERVICE="gmail"
SMTP_USER="yourgmail@gmail.com"
SMTP_PASS="your-16-char-app-password"
SMTP_FROM="WAA-100 <yourgmail@gmail.com>"
SMTP_REQUIRE_TLS="true"
```

## 3) Backend startup log

On backend start, look for:

- `Email provider ready (mailgun): ...`
- or `Email provider ready (smtp): ...`
- otherwise `Email provider not ready (...)`

## 4) Test email

```powershell
curl.exe --http1.1 -sS -X POST "https://<your-backend>.onrender.com/api/public/test-email" `
  -H "Content-Type: application/json" `
  --data-raw "{\"to\":\"your-email@example.com\"}"
```

Expected success response:

```json
{ "ok": true, "result": { ... } }
```
