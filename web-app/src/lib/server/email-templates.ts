/**
 * Email Template Helper
 * Generates branded email templates for SCALPERIUM and IB partners
 */

export interface EmailBranding {
	brandName: string;
	brandColor: string;
	logo?: string | null;
	domain?: string | null;
}

const DEFAULT_BRANDING: EmailBranding = {
	brandName: 'SCALPERIUM',
	brandColor: '#EF4444',
	logo: null,
	domain: null
};

/**
 * Generate hex color variations for gradients
 */
function darkenColor(hex: string, percent: number): string {
	const num = parseInt(hex.replace('#', ''), 16);
	const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
	const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100));
	const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100));
	return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

/**
 * Generate the email header with logo or brand name
 */
function getEmailHeader(branding: EmailBranding): string {
	if (branding.logo) {
		return `<img src="${branding.logo}" alt="${branding.brandName}" style="max-height: 60px; max-width: 200px;" />`;
	}
	return `
		<h1 style="margin: 0; color: #9ca3af; font-size: 28px; text-shadow: 0 0 10px ${branding.brandColor}40; font-family: 'Arial Black', sans-serif;">
			${branding.brandName}
		</h1>
	`;
}

/**
 * Generate verification email HTML
 */
export function generateVerificationEmail(options: {
	recipientName: string;
	verificationLink: string;
	branding?: EmailBranding;
	isIBPartner?: boolean;
}): string {
	const { recipientName, verificationLink, isIBPartner = false } = options;
	const branding = options.branding || DEFAULT_BRANDING;
	const darkColor = darkenColor(branding.brandColor, 20);

	const welcomeMessage = isIBPartner
		? 'Welcome to the IB Partner Program!'
		: `Welcome to ${branding.brandName}!`;

	const bodyMessage = isIBPartner
		? `Thank you for applying to become a ${branding.brandName} Introducing Broker Partner.`
		: `Thank you for creating your ${branding.brandName} account.`;

	const footerNote = isIBPartner
		? '<p style="color: #9ca3af; font-size: 14px;">Once verified, your application will be reviewed by our team within 48 hours.</p>'
		: '';

	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Email Verification - ${branding.brandName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0a0a; color: #9ca3af;">
	<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
		<tr>
			<td align="center">
				<table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(to bottom right, #1f2937, #000000); border: 1px solid #374151; border-radius: 8px; overflow: hidden;">
					<tr>
						<td style="padding: 30px; text-align: center; border-bottom: 1px solid #374151;">
							${getEmailHeader(branding)}
						</td>
					</tr>
					<tr>
						<td style="padding: 40px 30px; color: #d1d5db; font-size: 16px; line-height: 1.6;">
							<h2 style="color: #f9fafb; margin: 0 0 20px 0;">${welcomeMessage}</h2>
							<p>Hello ${recipientName},</p>
							<p>${bodyMessage}</p>
							<p>Please verify your email address by clicking the button below:</p>
							<table width="100%" cellpadding="0" cellspacing="0">
								<tr>
									<td align="center" style="padding: 30px 0;">
										<a href="${verificationLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(to right, ${branding.brandColor}, ${darkColor}); color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 16px;">
											VERIFY EMAIL
										</a>
									</td>
								</tr>
							</table>
							<p style="color: #9ca3af; font-size: 14px;">Or copy and paste this link into your browser:</p>
							<p style="word-break: break-all; color: #60a5fa; font-size: 12px;">${verificationLink}</p>
							<p style="margin-top: 30px; color: #9ca3af; font-size: 14px;">This verification link will expire in 24 hours.</p>
							${footerNote}
						</td>
					</tr>
					<tr>
						<td style="padding: 20px 30px; text-align: center; border-top: 1px solid #374151; font-size: 12px; color: #6b7280;">
							<p style="margin: 0;">&copy; ${new Date().getFullYear()} ${branding.brandName}. All rights reserved.</p>
							<p style="margin: 10px 0 0 0;">Gold Trading Excellence</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
	`.trim();
}

/**
 * Generate welcome email after verification
 */
export function generateWelcomeEmail(options: {
	recipientName: string;
	loginLink: string;
	branding?: EmailBranding;
}): string {
	const { recipientName, loginLink } = options;
	const branding = options.branding || DEFAULT_BRANDING;
	const darkColor = darkenColor(branding.brandColor, 20);

	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Welcome - ${branding.brandName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0a0a; color: #9ca3af;">
	<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
		<tr>
			<td align="center">
				<table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(to bottom right, #1f2937, #000000); border: 1px solid #374151; border-radius: 8px; overflow: hidden;">
					<tr>
						<td style="padding: 30px; text-align: center; border-bottom: 1px solid #374151;">
							${getEmailHeader(branding)}
						</td>
					</tr>
					<tr>
						<td style="padding: 40px 30px; color: #d1d5db; font-size: 16px; line-height: 1.6;">
							<h2 style="color: #f9fafb; margin: 0 0 20px 0;">Your Account is Ready!</h2>
							<p>Hello ${recipientName},</p>
							<p>Your email has been verified and your account is now fully activated.</p>
							<p>You can now log in and start trading with our gold scalping system.</p>
							<table width="100%" cellpadding="0" cellspacing="0">
								<tr>
									<td align="center" style="padding: 30px 0;">
										<a href="${loginLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(to right, ${branding.brandColor}, ${darkColor}); color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 16px;">
											LOGIN NOW
										</a>
									</td>
								</tr>
							</table>
						</td>
					</tr>
					<tr>
						<td style="padding: 20px 30px; text-align: center; border-top: 1px solid #374151; font-size: 12px; color: #6b7280;">
							<p style="margin: 0;">&copy; ${new Date().getFullYear()} ${branding.brandName}. All rights reserved.</p>
							<p style="margin: 10px 0 0 0;">Gold Trading Excellence</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
	`.trim();
}
