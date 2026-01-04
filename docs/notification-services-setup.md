# Notification Services Setup Guide

## Overview
SCALPERIUM supports multiple notification channels through integrated third-party services:
- **Email**: Mailgun
- **SMS & WhatsApp**: Twilio

## 1. Mailgun Setup (Email)

### Step 1: Create Mailgun Account
1. Go to [mailgun.com](https://www.mailgun.com/)
2. Sign up for a free account (includes 5,000 emails/month for 3 months)
3. Verify your email address

### Step 2: Get API Credentials
1. Log in to [Mailgun Dashboard](https://app.mailgun.com/)
2. Go to **Settings → API Keys**
3. Copy your **Private API Key**
4. Note your **Domain** (e.g., `sandbox12345.mailgun.org` or your custom domain)

### Step 3: Configure Domain (Optional but Recommended)
**For Production:**
1. Go to **Sending → Domains**
2. Add your custom domain (e.g., `mail.yourdomain.com`)
3. Add DNS records to your domain provider:
   - TXT record for SPF
   - TXT record for DKIM
   - CNAME for tracking
   - MX records for inbound

**For Testing:**
- Use the sandbox domain provided (limited to authorized recipients)

### Step 4: Add to .env File
```bash
MAILGUN_API_KEY="your-private-api-key-here"
MAILGUN_DOMAIN="your-domain.mailgun.org"
MAILGUN_FROM_EMAIL="SCALPERIUM <noreply@yourdomain.com>"
```

### Step 5: Test Email
```bash
curl -X POST http://localhost:5173/api/admin/test-notifications \
  -H "Content-Type: application/json" \
  -H "Cookie: user_session=..." \
  -d '{"testEmail":"your@email.com"}'
```

---

## 2. Twilio Setup (SMS & WhatsApp)

### Step 1: Create Twilio Account
1. Go to [twilio.com](https://www.twilio.com/)
2. Sign up for a free trial account ($15 credit)
3. Verify your email and phone number

### Step 2: Get API Credentials
1. Log in to [Twilio Console](https://console.twilio.com/)
2. From the Dashboard, copy:
   - **Account SID**
   - **Auth Token**

### Step 3: Get Phone Number

**For SMS:**
1. Go to **Phone Numbers → Manage → Buy a number**
2. Choose a number with SMS capabilities
3. Complete the purchase (uses trial credit or $1-$2/month)
4. Copy the phone number (format: +1234567890)

**For WhatsApp:**
1. Go to **Messaging → Try it out → Send a WhatsApp message**
2. Follow Twilio's WhatsApp sandbox setup
3. Send the join code to the Twilio WhatsApp number
4. Use format: `whatsapp:+14155238886` (Twilio sandbox)
5. For production: Apply for WhatsApp Business API access

### Step 4: Add to .env File
```bash
TWILIO_ACCOUNT_SID="AC1234567890abcdef1234567890abcd"
TWILIO_AUTH_TOKEN="your-auth-token-here"
TWILIO_FROM_NUMBER="+1234567890"
```

### Step 5: Test SMS
```bash
curl -X POST http://localhost:5173/api/admin/test-notifications \
  -H "Content-Type: application/json" \
  -H "Cookie: user_session=..." \
  -d '{"testPhone":"+1234567890"}'
```

---

## 3. Pricing Information

### Mailgun Pricing
- **Free Tier**: 5,000 emails/month for first 3 months
- **Foundation**: $35/month (50,000 emails)
- **Growth**: $80/month (100,000 emails)
- **Pay as you go**: $0.80 per 1,000 emails after free tier

### Twilio Pricing
- **SMS**: $0.0079 per message (US)
- **WhatsApp**: $0.005 per message
- **Phone Number**: ~$1-2/month
- **Free Trial**: $15 credit (enough for testing)

---

## 4. Environment Variables Summary

Add these to your `.env` file:

```bash
# Mailgun (Email)
MAILGUN_API_KEY="your-mailgun-api-key"
MAILGUN_DOMAIN="your-domain.mailgun.org"
MAILGUN_FROM_EMAIL="SCALPERIUM <noreply@yourdomain.com>"

# Twilio (SMS & WhatsApp)
TWILIO_ACCOUNT_SID="AC1234567890abcdef"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_FROM_NUMBER="+1234567890"
```

---

## 5. Testing Integration

### From Admin Panel
1. Login as admin: `admin@scalperium.com` / `Admin123!`
2. Go to Admin → Automations
3. Create a test automation
4. Select Email and/or SMS channels
5. Save and trigger manually

### From API
```javascript
// Test endpoint
POST /api/admin/test-notifications
{
  "testEmail": "test@example.com",
  "testPhone": "+1234567890"
}
```

---

## 6. Production Checklist

### Before Going Live:
- [ ] Verify Mailgun domain DNS records
- [ ] Move from sandbox to production domain
- [ ] Purchase Twilio phone number
- [ ] Set up WhatsApp Business API (if needed)
- [ ] Add authorized recipients (for sandbox testing)
- [ ] Test all notification channels
- [ ] Monitor delivery rates
- [ ] Set up webhooks for delivery status
- [ ] Configure bounce handling
- [ ] Add unsubscribe links (for emails)

---

## 7. Code Integration

The notification system is already integrated:

### Automatic Sending
When an automation trigger fires, notifications are sent automatically through all selected channels.

### Manual Sending (Example)
```typescript
import { getNotificationService } from '$lib/server/notifications';

const service = getNotificationService();

await service.send({
  automation: automationObject,
  recipient: {
    email: 'user@example.com',
    phone: '+1234567890',
    firstName: 'John',
    lastName: 'Doe'
  },
  variables: {
    totalProfit: 1250.50,
    tradeCount: 42
  }
});
```

---

## 8. Troubleshooting

### Mailgun Issues
- **Authentication failed**: Check API key is correct
- **Domain not found**: Verify MAILGUN_DOMAIN matches your dashboard
- **Not delivering**: Check DNS records, verify domain
- **Sandbox limitations**: Add recipient to authorized list

### Twilio Issues
- **Authentication failed**: Verify Account SID and Auth Token
- **Invalid number**: Ensure phone number starts with + and country code
- **WhatsApp not working**: Complete sandbox setup, send join code
- **Trial limitations**: Verify phone numbers in Twilio console

### General Issues
- **Service not configured**: Fill in all required .env variables
- **500 errors**: Check server logs for detailed error messages
- **Variables not replacing**: Use exact format: `{variableName}`

---

## 9. Security Best Practices

1. **Never commit .env to git**
2. **Rotate API keys regularly**
3. **Use environment-specific keys** (dev/staging/prod)
4. **Monitor usage for anomalies**
5. **Set up rate limiting**
6. **Enable 2FA on service accounts**
7. **Use separate accounts for production**

---

## Support Resources

- **Mailgun Docs**: https://documentation.mailgun.com/
- **Twilio Docs**: https://www.twilio.com/docs
- **Support**: Contact your service provider's support team
