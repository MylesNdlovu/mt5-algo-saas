import twilio from 'twilio';

interface TwilioConfig {
	accountSid: string;
	authToken: string;
	fromNumber: string;
}

interface SMSData {
	to: string;
	message: string;
}

export class TwilioService {
	private client: any;
	private fromNumber: string;

	constructor(config: TwilioConfig) {
		this.client = twilio(config.accountSid, config.authToken);
		this.fromNumber = config.fromNumber;
	}

	async sendSMS(data: SMSData): Promise<{ success: boolean; sid?: string; error?: string }> {
		try {
			// Validate phone number format (basic)
			const phone = data.to.startsWith('+') ? data.to : `+${data.to}`;

			const message = await this.client.messages.create({
				body: data.message,
				from: this.fromNumber,
				to: phone
			});

			return {
				success: true,
				sid: message.sid
			};
		} catch (error: any) {
			console.error('Twilio send error:', error);
			return {
				success: false,
				error: error.message || 'Failed to send SMS'
			};
		}
	}

	async sendBulkSMS(recipients: string[], message: string): Promise<{
		success: boolean;
		sent: number;
		failed: number;
		errors: string[];
	}> {
		const results = await Promise.allSettled(
			recipients.map(to => this.sendSMS({ to, message }))
		);

		const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
		const failed = results.length - sent;
		const errors = results
			.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
			.map(r => {
				if (r.status === 'rejected') return r.reason.message;
				if (r.status === 'fulfilled') return r.value.error || 'Unknown error';
				return 'Unknown error';
			});

		return {
			success: failed === 0,
			sent,
			failed,
			errors
		};
	}

	async getStatus(messageSid: string): Promise<{ status: string; error?: string }> {
		try {
			const message = await this.client.messages(messageSid).fetch();
			return {
				status: message.status
			};
		} catch (error: any) {
			return {
				status: 'unknown',
				error: error.message
			};
		}
	}
}

// Singleton instance
let twilioService: TwilioService | null = null;

export function getTwilioService(): TwilioService {
	if (!twilioService) {
		const accountSid = process.env.TWILIO_ACCOUNT_SID || 'test';
		const authToken = process.env.TWILIO_AUTH_TOKEN || 'test';
		const fromNumber = process.env.TWILIO_FROM_NUMBER || '+1234567890';

		if (accountSid === 'test' || authToken === 'test') {
			console.warn('⚠️  Twilio not configured - SMS will be logged only');
		}

		twilioService = new TwilioService({ accountSid, authToken, fromNumber });
	}

	return twilioService;
}
