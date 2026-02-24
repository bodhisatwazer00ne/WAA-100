# SMTP Setup (Nodemailer)

WAA-100 now sends absence emails using Nodemailer through SMTP.

## 1) Configure `.env`

Choose one method.

### Method A: SMTP service + user/pass (easy for Gmail)

```env
SMTP_SERVICE="gmail"
SMTP_USER="yourgmail@gmail.com"
SMTP_PASS="your-16-char-app-password"
SMTP_FROM="WAA-100 <yourgmail@gmail.com>"
SMTP_REQUIRE_TLS="true"
```

### Method B: SMTP host/port

```env
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-smtp-login"
SMTP_PASS="your-smtp-key"
SMTP_FROM="WAA-100 <your-verified-sender@domain.com>"
SMTP_REQUIRE_TLS="true"
```

### Method C: SMTP URL

```env
SMTP_URL="smtps://user:pass@smtp.example.com:465"
SMTP_FROM="WAA-100 <no-reply@yourdomain.com>"
```

## 2) Restart backend

When backend starts, it now logs one of:

- `SMTP connection verified`
- `SMTP not ready: ...`

If you see `SMTP not ready`, email delivery will fail.

## 3) Test email directly

```powershell
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:4000/api/public/test-email" `
  -ContentType "application/json" `
  -Body '{"to":"kimika2807@dolofan.com"}'
```

If this returns `{ ok: true }`, absence emails will also send.
