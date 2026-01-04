import { CSHARP_AGENT_URL, CSHARP_AGENT_API_KEY } from '$env/static/private';

export interface EAControlRequest {
	accountId: string;
	action: 'start' | 'stop' | 'pause';
}

export interface EAStatusResponse {
	accountId: string;
	status: 'RUNNING' | 'STOPPED' | 'PAUSED' | 'ERROR';
	safetyIndicator: 'RED' | 'ORANGE' | 'GREEN';
	message?: string;
}

export interface AccountSetupRequest {
	userId: string;
	accountNumber: string;
	broker: string;
	serverName: string;
	login: string;
	password: string;
}

class CSharpAgentClient {
	private baseUrl: string;
	private apiKey: string;

	constructor() {
		this.baseUrl = CSHARP_AGENT_URL;
		this.apiKey = CSHARP_AGENT_API_KEY;
	}

	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': this.apiKey,
				...options.headers
			}
		});

		if (!response.ok) {
			throw new Error(`Agent API error: ${response.statusText}`);
		}

		return response.json();
	}

	async controlEA(request: EAControlRequest): Promise<EAStatusResponse> {
		return this.request<EAStatusResponse>('/api/ea/control', {
			method: 'POST',
			body: JSON.stringify(request)
		});
	}

	async getEAStatus(accountId: string): Promise<EAStatusResponse> {
		return this.request<EAStatusResponse>(`/api/ea/status/${accountId}`);
	}

	async setupAccount(request: AccountSetupRequest): Promise<{ success: boolean; message: string }> {
		return this.request('/api/account/setup', {
			method: 'POST',
			body: JSON.stringify(request)
		});
	}

	async getSafetyIndicator(): Promise<{ indicator: 'RED' | 'ORANGE' | 'GREEN'; reason: string }> {
		return this.request('/api/market/safety');
	}

	async syncTrades(accountId: string): Promise<{ success: boolean; tradesCount: number }> {
		return this.request(`/api/trades/sync/${accountId}`, {
			method: 'POST'
		});
	}
}

export const agentClient = new CSharpAgentClient();
