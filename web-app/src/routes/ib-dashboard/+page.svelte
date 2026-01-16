<script lang="ts">
	import { onMount } from 'svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import type { PageData } from './$types';
	import type { IBDashboardStats, AnonymousAccountView } from '$lib/types/ib-types';

	export let data: PageData;

	let dashboardStats: IBDashboardStats | null = null;
	let anonymousAccounts: AnonymousAccountView[] = [];
	let loading = true;
	let error = '';
	let selectedPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM format
	let accountStatusFilter: 'all' | 'active' | 'inactive' = 'all';

	onMount(() => {
		loadDashboardData();
	});

	async function loadDashboardData() {
		loading = true;
		error = '';
		try {
			// Fetch dashboard stats
			const dashboardRes = await fetch(`/api/ib/dashboard?period=${selectedPeriod}`);
			const dashboardData = await dashboardRes.json();

			if (!dashboardData.success) {
				throw new Error(dashboardData.error || 'Failed to load dashboard');
			}

			dashboardStats = dashboardData.data;

			// Fetch anonymous accounts
			const accountsRes = await fetch(`/api/ib/accounts?status=${accountStatusFilter}`);
			const accountsData = await accountsRes.json();

			if (!accountsData.success) {
				throw new Error(accountsData.error || 'Failed to load accounts');
			}

			anonymousAccounts = accountsData.accounts;
		} catch (err: any) {
			error = err.message;
			console.error('[IB Dashboard] Error loading data:', err);
		} finally {
			loading = false;
		}
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2
		}).format(amount);
	}

	function formatDate(date: Date | undefined): string {
		if (!date) return 'N/A';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatVolume(volume: number): string {
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(volume);
	}

	$: if (selectedPeriod || accountStatusFilter) {
		loadDashboardData();
	}
</script>

<svelte:head>
	<title>IB Partner Dashboard - SCALPERIUM</title>
</svelte:head>

<Navigation user={data.user} />

<div class="min-h-screen bg-black text-white">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-4xl font-bold mb-2 bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
				IB Partner Dashboard
			</h1>
			<p class="text-gray-400">Track your commissions and referred traders</p>
		</div>

		{#if loading}
			<div class="flex justify-center items-center py-20">
				<div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
			</div>
		{:else if error}
			<div class="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
				<p class="text-red-400 font-bold">Error loading dashboard</p>
				<p class="text-gray-400 mt-2">{error}</p>
				<button
					on:click={loadDashboardData}
					class="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
				>
					Retry
				</button>
			</div>
		{:else if dashboardStats}
			<!-- Period Selector -->
			<div class="mb-6">
				<label for="period" class="block text-sm font-medium text-gray-400 mb-2">
					Select Period
				</label>
				<input
					id="period"
					type="month"
					bind:value={selectedPeriod}
					class="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500"
				/>
			</div>

			<!-- Key Metrics Grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				<!-- Total Earned -->
				<div class="bg-gradient-to-br from-green-900/30 to-gray-900 border border-green-500/30 rounded-lg p-6">
					<div class="text-gray-400 text-sm mb-2">Total Earned (All Time)</div>
					<div class="text-3xl font-bold text-green-500">
						{formatCurrency(dashboardStats.totalEarned)}
					</div>
				</div>

				<!-- Current Period Earnings -->
				<div class="bg-gradient-to-br from-blue-900/30 to-gray-900 border border-blue-500/30 rounded-lg p-6">
					<div class="text-gray-400 text-sm mb-2">Current Period</div>
					<div class="text-3xl font-bold text-blue-400">
						{formatCurrency(dashboardStats.currentPeriod.netCommission)}
					</div>
					{#if dashboardStats.growthPercentage !== undefined && dashboardStats.previousPeriod}
						<div class="text-sm mt-2" class:text-green-400={dashboardStats.growthPercentage >= 0} class:text-red-400={dashboardStats.growthPercentage < 0}>
							{dashboardStats.growthPercentage >= 0 ? '↑' : '↓'}
							{Math.abs(dashboardStats.growthPercentage).toFixed(1)}% vs last period
						</div>
					{/if}
				</div>

				<!-- Pending Payment -->
				<div class="bg-gradient-to-br from-yellow-900/30 to-gray-900 border border-yellow-500/30 rounded-lg p-6">
					<div class="text-gray-400 text-sm mb-2">Pending Payment</div>
					<div class="text-3xl font-bold text-yellow-400">
						{formatCurrency(dashboardStats.pendingPayment)}
					</div>
					{#if !dashboardStats.currentPeriod.isPaid}
						<div class="text-sm text-yellow-500 mt-2">Unpaid</div>
					{/if}
				</div>

				<!-- Active Accounts -->
				<div class="bg-gradient-to-br from-purple-900/30 to-gray-900 border border-purple-500/30 rounded-lg p-6">
					<div class="text-gray-400 text-sm mb-2">Active Accounts</div>
					<div class="text-3xl font-bold text-purple-400">
						{dashboardStats.activeAccounts}
					</div>
					<div class="text-sm text-gray-500 mt-2">
						Total: {dashboardStats.totalAccounts}
					</div>
				</div>
			</div>

			<!-- Current Period Details -->
			<div class="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-8">
				<h2 class="text-2xl font-bold mb-6">Current Period Details</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<!-- Trading Volume -->
					<div>
						<div class="text-gray-400 text-sm mb-1">Trading Volume</div>
						<div class="text-2xl font-bold text-white">
							{formatVolume(dashboardStats.currentPeriod.totalVolume)} lots
						</div>
					</div>

					<!-- Total Trades -->
					<div>
						<div class="text-gray-400 text-sm mb-1">Total Trades</div>
						<div class="text-2xl font-bold text-white">
							{dashboardStats.currentPeriod.totalTrades.toLocaleString()}
						</div>
					</div>

					<!-- Average Spread -->
					<div>
						<div class="text-gray-400 text-sm mb-1">Average Spread</div>
						<div class="text-2xl font-bold text-white">
							{dashboardStats.currentPeriod.averageSpread.toFixed(2)} points
						</div>
					</div>
				</div>

				<!-- Commission Breakdown -->
				<div class="mt-6 pt-6 border-t border-gray-700">
					<h3 class="text-lg font-bold mb-4">Commission Breakdown</h3>
					<div class="space-y-3">
						<div class="flex justify-between items-center">
							<span class="text-gray-400">Gross Commission</span>
							<span class="font-bold">{formatCurrency(dashboardStats.currentPeriod.grossCommission)}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-gray-400">Platform Fee</span>
							<span class="font-bold text-red-400">-{formatCurrency(dashboardStats.currentPeriod.platformFee)}</span>
						</div>
						<div class="flex justify-between items-center pt-3 border-t border-gray-700">
							<span class="text-lg font-bold">Net Commission</span>
							<span class="text-lg font-bold text-green-500">{formatCurrency(dashboardStats.currentPeriod.netCommission)}</span>
						</div>
					</div>
				</div>

				<!-- Payment Status -->
				{#if dashboardStats.currentPeriod.isPaid && dashboardStats.currentPeriod.paidAt}
					<div class="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
						<div class="flex items-center gap-2">
							<span class="text-green-500">✓</span>
							<span class="text-green-400 font-bold">Paid on {formatDate(dashboardStats.currentPeriod.paidAt)}</span>
						</div>
						{#if dashboardStats.currentPeriod.paymentReference}
							<div class="text-sm text-gray-400 mt-1">
								Reference: {dashboardStats.currentPeriod.paymentReference}
							</div>
						{/if}
					</div>
				{:else}
					<div class="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
						<div class="flex items-center gap-2">
							<span class="text-yellow-500">⏳</span>
							<span class="text-yellow-400 font-bold">Payment Pending</span>
						</div>
					</div>
				{/if}
			</div>

			<!-- Last Payment Info -->
			{#if dashboardStats.lastPaymentDate && dashboardStats.lastPaymentAmount}
				<div class="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-8">
					<h2 class="text-xl font-bold mb-4">Last Payment</h2>
					<div class="flex justify-between items-center">
						<div>
							<div class="text-gray-400 text-sm">Date</div>
							<div class="text-lg font-bold">{formatDate(dashboardStats.lastPaymentDate)}</div>
						</div>
						<div class="text-right">
							<div class="text-gray-400 text-sm">Amount</div>
							<div class="text-2xl font-bold text-green-500">{formatCurrency(dashboardStats.lastPaymentAmount)}</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Anonymous Accounts List -->
			<div class="bg-gray-900 border border-gray-700 rounded-lg p-6">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-2xl font-bold">Your Referred Traders</h2>
					<div class="flex gap-2">
						<button
							on:click={() => accountStatusFilter = 'all'}
							class="px-4 py-2 rounded-lg transition-colors"
							class:bg-red-600={accountStatusFilter === 'all'}
							class:bg-gray-800={accountStatusFilter !== 'all'}
						>
							All ({dashboardStats.totalAccounts})
						</button>
						<button
							on:click={() => accountStatusFilter = 'active'}
							class="px-4 py-2 rounded-lg transition-colors"
							class:bg-red-600={accountStatusFilter === 'active'}
							class:bg-gray-800={accountStatusFilter !== 'active'}
						>
							Active ({dashboardStats.activeAccounts})
						</button>
						<button
							on:click={() => accountStatusFilter = 'inactive'}
							class="px-4 py-2 rounded-lg transition-colors"
							class:bg-red-600={accountStatusFilter === 'inactive'}
							class:bg-gray-800={accountStatusFilter !== 'inactive'}
						>
							Inactive ({dashboardStats.inactiveAccounts})
						</button>
					</div>
				</div>

				<!-- Privacy Notice -->
				<div class="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
					<div class="flex items-start gap-2">
						<span class="text-blue-400 text-xl">🔒</span>
						<div>
							<div class="font-bold text-blue-400 mb-1">Privacy Protected</div>
							<div class="text-sm text-gray-400">
								All trader information is anonymized. You can only see anonymous account IDs and trading statistics.
								Real MT5 account numbers and personal information are never visible to IB partners.
							</div>
						</div>
					</div>
				</div>

				{#if anonymousAccounts.length === 0}
					<div class="text-center py-12 text-gray-500">
						<div class="text-4xl mb-4">📊</div>
						<p class="text-lg">No accounts found</p>
						<p class="text-sm mt-2">Start referring traders to see them appear here</p>
					</div>
				{:else}
					<!-- Accounts Table -->
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead>
								<tr class="border-b border-gray-700">
									<th class="text-left py-3 px-4 text-gray-400 font-semibold">Account ID</th>
									<th class="text-left py-3 px-4 text-gray-400 font-semibold">Status</th>
									<th class="text-right py-3 px-4 text-gray-400 font-semibold">Total Volume</th>
									<th class="text-right py-3 px-4 text-gray-400 font-semibold">Total Trades</th>
									<th class="text-right py-3 px-4 text-gray-400 font-semibold">Avg Spread</th>
									<th class="text-right py-3 px-4 text-gray-400 font-semibold">Last Trade</th>
									<th class="text-right py-3 px-4 text-gray-400 font-semibold">Registered</th>
								</tr>
							</thead>
							<tbody>
								{#each anonymousAccounts as account}
									<tr class="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
										<td class="py-4 px-4">
											<span class="font-mono text-sm bg-gray-800 px-2 py-1 rounded">
												{account.anonymousId}
											</span>
										</td>
										<td class="py-4 px-4">
											{#if account.isActive}
												<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30">
													Active
												</span>
											{:else}
												<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-500 border border-gray-700">
													Inactive
												</span>
											{/if}
										</td>
										<td class="py-4 px-4 text-right font-medium">
											{formatVolume(account.totalVolume)} lots
										</td>
										<td class="py-4 px-4 text-right font-medium">
											{account.totalTrades.toLocaleString()}
										</td>
										<td class="py-4 px-4 text-right font-medium">
											{account.averageSpread.toFixed(2)}
										</td>
										<td class="py-4 px-4 text-right text-gray-400 text-sm">
											{formatDate(account.lastTradeDate)}
										</td>
										<td class="py-4 px-4 text-right text-gray-400 text-sm">
											{formatDate(account.registeredAt)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
