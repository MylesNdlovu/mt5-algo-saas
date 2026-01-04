import FormData from 'form-data';
import Mailgun from 'mailgun.js';

interface MailgunConfig {
	apiKey: string;
	domain: string;
	from: string;
}

interface EmailData {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

export class MailgunService {
	private client: any;
	private domain: string;
	private from: string;

	constructor(config: MailgunConfig) {
		const mailgun = new Mailgun(FormData);
		this.client = mailgun.client({
			username: 'api',
			key: config.apiKey
		});
		this.domain = config.domain;
		this.from = config.from;
	}

	async sendEmail(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
		try {
			const messageData = {
				from: this.from,
				to: data.to,
				subject: data.subject,
				html: data.html,
				text: data.text || this.stripHtml(data.html)
			};

			const response = await this.client.messages.create(this.domain, messageData);

			return {
				success: true,
				messageId: response.id
			};
		} catch (error: any) {
			console.error('Mailgun send error:', error);
			return {
				success: false,
				error: error.message || 'Failed to send email'
			};
		}
	}

	async sendBulkEmail(recipients: string[], subject: string, html: string): Promise<{
		success: boolean;
		sent: number;
		failed: number;
		errors: string[];
	}> {
		const results = await Promise.allSettled(
			recipients.map(to => this.sendEmail({ to, subject, html }))
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

	private stripHtml(html: string): string {
		return html.replace(/<[^>]*>/g, '').trim();
	}
}

// Singleton instance
let mailgunService: MailgunService | null = null;

export function getMailgunService(): MailgunService {
	if (!mailgunService) {
		const apiKey = process.env.MAILGUN_API_KEY || 'test-key';
		const domain = process.env.MAILGUN_DOMAIN || 'test.com';
		const from = process.env.MAILGUN_FROM_EMAIL || 'SCALPERIUM <noreply@scalperium.com>';

		if (apiKey === 'test-key' || domain === 'test.com') {
			console.warn('⚠️  Mailgun not configured - emails will be logged only');
		}

		mailgunService = new MailgunService({ apiKey, domain, from });
	}

	return mailgunService;
}
