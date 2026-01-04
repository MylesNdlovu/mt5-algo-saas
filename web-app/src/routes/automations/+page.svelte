<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	
	interface Automation {
		id: string;
		name: string;
		description?: string;
		userId?: string;
		triggerType: string;
		actionTypes: string[];
		messageBody: string;
		status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
		isUserEnabled: boolean;
		totalTriggered: number;
		totalSent: number;
		createdBy?: string;
	}
	
	let automations: Automation[] = [];
	let loading = true;
	let error = '';
	
	async function loadAutomations() {
		try {
			const response = await fetch('/api/user/automations');
			if (!response.ok) {
				if (response.status === 401) {
					goto('/login');
					return;
				}
				throw new Error('Failed to load automations');
			}
			
			const result = await response.json();
			automations = result.data || [];
			loading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load automations';
			loading = false;
		}
	}
	
	async function toggleAutomation(automationId: string, currentState: boolean) {
		try {
			const response = await fetch(`/api/user/automations/${automationId}/toggle`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isEnabled: !currentState })
			});
			
			if (!response.ok) {
				throw new Error('Failed to toggle automation');
			}
			
			const result = await response.json();
			
			// Update local state
			automations = automations.map(a => 
				a.id === automationId ? { ...a, isUserEnabled: !currentState } : a
			);
			
			// Show success message
			const message = result.message || `Automation ${!currentState ? 'enabled' : 'disabled'}`;
			showNotification(message, 'success');
			
		} catch (err) {
			showNotification(err instanceof Error ? err.message : 'Failed to toggle automation', 'error');
		}
	}
	
	function showNotification(message: string, type: 'success' | 'error') {
		// Simple notification (can be enhanced with a toast library)
		alert(message);
	}
	
	function getTriggerLabel(triggerType: string): string {
		const labels: Record<string, string> = {
			LEAD_OPTIN: 'Lead Opt-in',
			MT5_REGISTRATION: 'MT5 Registration',
			WINNING_TRADES: 'Winning Trades',
			LOSING_TRADES: 'Losing Trades',
			SUBSCRIPTION_UPGRADE: 'Subscription Upgrade',
			SUBSCRIPTION_EXPIRED: 'Subscription Expired',
			HIGH_PROFIT_ACHIEVED: 'High Profit Achieved',
			CONSECUTIVE_LOSSES: 'Consecutive Losses',
			ACCOUNT_INACTIVE: 'Account Inactive',
			TRIAL_ENDING: 'Trial Ending'
		};
		return labels[triggerType] || triggerType;
	}
	
	function getChannelIcon(channel: string): string {
		const icons: Record<string, string> = {
			EMAIL: '📧',
			SMS: '💬',
			WHATSAPP: '📱',
			PUSH_NOTIFICATION: '🔔',
			IN_APP_MESSAGE: '💌'
		};
		return icons[channel] || '📨';
	}
	
	onMount(() => {
		loadAutomations();
	});
</script>

<svelte:head>
	<title>My Automations - SCALPERIUM</title>
</svelte:head>

<div class="min-h-screen bg-black">
	<!-- Header -->
	<header class="bg-gradient-to-br from-gray-900 to-black border-b border-gray-800 shadow-2xl sticky top-0 z-40">
		<div class="max-w-7xl mx-auto px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<button on:click={() => goto('/dashboard')} class="text-gray-400 hover:text-white">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
					</button>
					<h1 class="text-2xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); font-family: 'Orbitron', sans-serif;">
						MY AUTOMATIONS
					</h1>
				</div>
			</div>
		</div>
	</header>

	<main class="max-w-7xl mx-auto px-6 py-8">
		{#if loading}
			<div class="flex items-center justify-center h-64">
				<div class="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
			</div>
		{:else if error}
			<div class="bg-red-900/20 border border-red-500 rounded-lg p-4 text-center">
				<p class="text-red-400">❌ {error}</p>
				<button 
					on:click={loadAutomations}
					class="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-white"
				>
					Retry
				</button>
			</div>
		{:else}
			<!-- Info Card -->
			<div class="mb-6 p-4 bg-gradient-to-r from-blue-900/30 to-blue-800/20 border border-blue-500/30 rounded-lg">
				<p class="text-sm text-gray-300">
					💡 These are automated notifications configured for your account. You can enable or disable them below.
				</p>
			</div>

			<!-- Automations List -->
			{#if automations.length === 0}
				<div class="text-center py-12">
					<svg class="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
					<p class="text-gray-400">No automations available for your account yet</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each automations as automation}
						<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-gray-800 p-6 hover:border-red-500/30 transition-all">
							<!-- Header -->
							<div class="flex items-start justify-between mb-4">
								<div class="flex-1">
									<h3 class="text-lg font-bold text-white mb-1">{automation.name}</h3>
									{#if automation.description}
										<p class="text-sm text-gray-400">{automation.description}</p>
									{/if}
								</div>
								
								<!-- Toggle Switch -->
								<button
									on:click={() => toggleAutomation(automation.id, automation.isUserEnabled)}
									class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
									class:bg-green-500={automation.isUserEnabled}
									class:bg-gray-700={!automation.isUserEnabled}
								>
									<span
										class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
										class:translate-x-6={automation.isUserEnabled}
										class:translate-x-1={!automation.isUserEnabled}
									></span>
								</button>
							</div>
							
							<!-- Trigger -->
							<div class="mb-4 p-3 bg-black/50 rounded-lg border border-gray-800">
								<div class="text-xs text-gray-500 mb-1 uppercase">Trigger</div>
								<div class="text-sm text-white font-medium">{getTriggerLabel(automation.triggerType)}</div>
							</div>
							
							<!-- Channels -->
							<div class="mb-4">
								<div class="text-xs text-gray-500 mb-2 uppercase">Notification Channels</div>
								<div class="flex flex-wrap gap-2">
									{#each automation.actionTypes as channel}
										<span class="px-3 py-1 bg-gradient-to-r from-red-900/30 to-red-800/20 border border-red-500/30 rounded-full text-sm text-gray-300">
											{getChannelIcon(channel)} {channel}
										</span>
									{/each}
								</div>
							</div>
							
							<!-- Stats -->
							<div class="flex items-center justify-between pt-4 border-t border-gray-800">
								<div class="text-center flex-1">
									<div class="text-xs text-gray-500">Triggered</div>
									<div class="text-lg font-bold text-gray-300">{automation.totalTriggered}</div>
								</div>
								<div class="text-center flex-1 border-l border-gray-800">
									<div class="text-xs text-gray-500">Sent</div>
									<div class="text-lg font-bold text-green-400">{automation.totalSent}</div>
								</div>
								<div class="text-center flex-1 border-l border-gray-800">
									<div class="text-xs text-gray-500">Status</div>
									<div class="text-lg font-bold" class:text-green-400={automation.status === 'ACTIVE'} class:text-gray-500={automation.status !== 'ACTIVE'}>
										{automation.status}
									</div>
								</div>
							</div>
							
							<!-- User-specific indicator -->
							{#if automation.userId}
								<div class="mt-4 pt-4 border-t border-gray-800">
									<span class="text-xs text-blue-400">👤 Personal Automation</span>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</main>
</div>
