import { getMailgunService } from './mailgun';
import { getTwilioService } from './twilio';
import type { Automation } from '../automationStorage';

interface NotificationPayload {
	automation: Automation;
	recipient: {
		email?: string;
		phone?: string;
		firstName?: string;
		lastName?: string;
		[key: string]: any;
	};
	variables?: Record<string, any>;
}

interface NotificationResult {
	channel: string;
	success: boolean;
	messageId?: string;
	error?: string;
}

export class NotificationService {
	/**
	 * Send notification through specified channel
	 */
	async send(payload: NotificationPayload): Promise<NotificationResult[]> {
		const { automation, recipient, variables = {} } = payload;
		const results: NotificationResult[] = [];

		// Replace variables in message
		const message = this.replaceVariables(automation.messageBody, {
			...recipient,
			...variables
		});

		const subject = automation.messageSubject
			? this.replaceVariables(automation.messageSubject, { ...recipient, ...variables })
			: 'Notification from SCALPERIUM';

		// Send through each selected channel
		for (const channel of automation.actionTypes) {
			try {
				let result: NotificationResult;

				switch (channel) {
					case 'EMAIL':
						result = await this.sendEmail(recipient.email!, subject, message);
						break;
					case 'SMS':
						result = await this.sendSMS(recipient.phone!, message);
						break;
					case 'WHATSAPP':
						result = await this.sendWhatsApp(recipient.phone!, message);
						break;
					case 'PUSH_NOTIFICATION':
						result = await this.sendPushNotification(recipient, message);
						break;
					case 'IN_APP_MESSAGE':
						result = await this.sendInAppMessage(recipient, message);
						break;
					default:
						result = {
							channel,
							success: false,
							error: 'Unknown channel type'
						};
				}

				results.push(result);
			} catch (error: any) {
				results.push({
					channel,
					success: false,
					error: error.message
				});
			}
		}

		return results;
	}

	/**
	 * Send email via Mailgun
	 */
	private async sendEmail(to: string, subject: string, message: string): Promise<NotificationResult> {
		if (!to) {
			return { channel: 'EMAIL', success: false, error: 'No email address provided' };
		}

		try {
			const mailgun = getMailgunService();
			const result = await mailgun.sendEmail({
				to,
				subject,
				html: this.formatHtmlEmail(message),
				text: message
			});

			return {
				channel: 'EMAIL',
				success: result.success,
				messageId: result.messageId,
				error: result.error
			};
		} catch (error: any) {
			// If Mailgun is not configured, log but don't fail
			console.warn('Email service not configured:', error.message);
			return {
				channel: 'EMAIL',
				success: false,
				error: 'Email service not configured'
			};
		}
	}

	/**
	 * Send SMS via Twilio
	 */
	private async sendSMS(to: string, message: string): Promise<NotificationResult> {
		if (!to) {
			return { channel: 'SMS', success: false, error: 'No phone number provided' };
		}

		try {
			const twilio = getTwilioService();
			const result = await twilio.sendSMS({ to, message });

			return {
				channel: 'SMS',
				success: result.success,
				messageId: result.sid,
				error: result.error
			};
		} catch (error: any) {
			console.warn('SMS service not configured:', error.message);
			return {
				channel: 'SMS',
				success: false,
				error: 'SMS service not configured'
			};
		}
	}

	/**
	 * Send WhatsApp message via Twilio WhatsApp
	 */
	private async sendWhatsApp(to: string, message: string): Promise<NotificationResult> {
		if (!to) {
			return { channel: 'WHATSAPP', success: false, error: 'No phone number provided' };
		}

		try {
			const twilio = getTwilioService();
			// WhatsApp uses Twilio with whatsapp: prefix
			const whatsappNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
			const result = await twilio.sendSMS({ to: whatsappNumber, message });

			return {
				channel: 'WHATSAPP',
				success: result.success,
				messageId: result.sid,
				error: result.error
			};
		} catch (error: any) {
			console.warn('WhatsApp service not configured:', error.message);
			return {
				channel: 'WHATSAPP',
				success: false,
				error: 'WhatsApp service not configured'
			};
		}
	}

	/**
	 * Send push notification (placeholder - integrate with FCM/OneSignal)
	 */
	private async sendPushNotification(
		recipient: any,
		message: string
	): Promise<NotificationResult> {
		// TODO: Integrate with Firebase Cloud Messaging or OneSignal
		console.log('Push notification:', { recipient, message });
		return {
			channel: 'PUSH_NOTIFICATION',
			success: false,
			error: 'Push notification service not implemented'
		};
	}

	/**
	 * Send in-app message (placeholder - store in database)
	 */
	private async sendInAppMessage(recipient: any, message: string): Promise<NotificationResult> {
		// TODO: Store in database for in-app display
		console.log('In-app message:', { recipient, message });
		return {
			channel: 'IN_APP_MESSAGE',
			success: false,
			error: 'In-app message service not implemented'
		};
	}

	/**
	 * Replace variables in message template
	 */
	private replaceVariables(template: string, data: Record<string, any>): string {
		let result = template;

		// Replace {variableName} with actual values
		Object.keys(data).forEach((key) => {
			const value = data[key];
			const regex = new RegExp(`{${key}}`, 'g');
			result = result.replace(regex, value != null ? String(value) : '');
		});

		return result;
	}

	/**
	 * Format plain text message as HTML email
	 */
	private formatHtmlEmail(message: string): string {
		const lines = message.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('');
		
		return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>SCALPERIUM Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0a0a; color: #9ca3af;">
	<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
		<tr>
			<td align="center">
				<table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(to bottom right, #1f2937, #000000); border: 1px solid #374151; border-radius: 8px; overflow: hidden;">
					<!-- Header -->
					<tr>
						<td style="padding: 30px; text-align: center; border-bottom: 1px solid #374151;">
							<h1 style="margin: 0; color: #9ca3af; font-size: 28px; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); font-family: 'Arial Black', sans-serif;">
								SCALPERIUM
							</h1>
						</td>
					</tr>
					<!-- Content -->
					<tr>
						<td style="padding: 40px 30px; color: #d1d5db; font-size: 16px; line-height: 1.6;">
							${lines}
						</td>
					</tr>
					<!-- Footer -->
					<tr>
						<td style="padding: 20px 30px; text-align: center; border-top: 1px solid #374151; font-size: 12px; color: #6b7280;">
							<p style="margin: 0;">© ${new Date().getFullYear()} SCALPERIUM. All rights reserved.</p>
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
	 * Test all notification channels
	 */
	async testChannels(testEmail?: string, testPhone?: string): Promise<Record<string, any>> {
		const results: Record<string, any> = {};

		// Test Email
		if (testEmail) {
			try {
				results.email = await this.sendEmail(
					testEmail,
					'Test Email from SCALPERIUM',
					'This is a test email. If you received this, email integration is working! 🎉'
				);
			} catch (error: any) {
				results.email = { success: false, error: error.message };
			}
		}

		// Test SMS
		if (testPhone) {
			try {
				results.sms = await this.sendSMS(
					testPhone,
					'Test SMS from SCALPERIUM: Integration is working! 🎉'
				);
			} catch (error: any) {
				results.sms = { success: false, error: error.message };
			}
		}

		return results;
	}
}

// Singleton instance
let notificationService: NotificationService | null = null;

export function getNotificationService(): NotificationService {
	if (!notificationService) {
		notificationService = new NotificationService();
	}
	return notificationService;
}
