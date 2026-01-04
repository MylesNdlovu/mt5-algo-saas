// Utility functions for formatting and calculations

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(amount);
}

export function formatDate(date: string | Date): string {
	return new Date(date).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function formatDateTime(date: string | Date): string {
	return new Date(date).toLocaleString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});
}

export function calculatePnL(trades: Array<{ profit: number; commission: number; swap: number }>) {
	return trades.reduce(
		(acc, trade) => {
			acc.profit += trade.profit;
			acc.commission += trade.commission;
			acc.swap += trade.swap;
			acc.total = acc.profit + acc.commission + acc.swap;
			return acc;
		},
		{ total: 0, profit: 0, commission: 0, swap: 0 }
	);
}

export function getSafetyColor(indicator: 'RED' | 'ORANGE' | 'GREEN'): string {
	const colors = {
		RED: 'bg-red-500',
		ORANGE: 'bg-orange-500',
		GREEN: 'bg-green-500'
	};
	return colors[indicator];
}

export function getStatusColor(status: 'STOPPED' | 'RUNNING' | 'PAUSED' | 'ERROR'): string {
	const colors = {
		RUNNING: 'bg-green-100 text-green-700',
		STOPPED: 'bg-gray-100 text-gray-700',
		PAUSED: 'bg-yellow-100 text-yellow-700',
		ERROR: 'bg-red-100 text-red-700'
	};
	return colors[status];
}
