# Email Setup (Resend Preferred)

WAA-100 now supports:

- Resend HTTP API (recommended for Render Free)
- SMTP via Nodemailer (fallback if Resend key is not set)

## 1) Recommended: Resend

Set these backend env vars:

```env
RESEND_API_KEY="re_xxxxxxxxx"
RESEND_FROM="WAA-100 <onboarding@resend.dev>"
RESEND_API_BASE_URL="https://api.resend.com"
```

Notes:

- `RESEND_FROM` must be allowed by your Resend account.
- For production, verify your own domain sender in Resend.

## 2) Optional fallback: SMTP

Use SMTP only when `RESEND_API_KEY` is empty.

```env
SMTP_SERVICE="gmail"
SMTP_USER="yourgmail@gmail.com"
SMTP_PASS="your-16-char-app-password"
SMTP_FROM="WAA-100 <yourgmail@gmail.com>"
SMTP_REQUIRE_TLS="true"
```

## 3) Backend startup log

On backend start, look for:

- `Email provider ready (resend): ...`
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
