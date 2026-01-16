<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Navigation from '$lib/components/Navigation.svelte';
	import type { PageData } from './$types';
	import type { AdminIBPartnerView, AdminAccountView } from '$lib/types/ib-types';

	export let data: PageData;

	let partner: AdminIBPartnerView | null = null;
	let accounts: AdminAccountView[] = [];
	let commissionHistory: any[] = [];
	let summary: any = null;
	let loading = true;
	let error = '';
	let activeTab: 'overview' | 'traders' | 'commissions' | 'whitelabel' = 'overview';

	// White-label edit state
	let editingWhiteLabel = false;
	let whitelabelForm = {
		logo: '',
		favicon: '',
		brandName: '',
		brandColor: '',
		domain: ''
	};

	onMount(() => {
		loadPartnerDetails();
	});

	async function loadPartnerDetails() {
		loading = true;
		error = '';
		try {
			const response = await fetch(`/api/admin/ib-partners/${data.partnerId}`);
			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Failed to load partner details');
			}

			partner = result.partner;
			accounts = result.accounts;
			commissionHistory = result.commissionHistory;
			summary = result.summary;

			// Initialize white-label form
			whitelabelForm = {
				logo: partner.logo || '',
				favicon: partner.favicon || '',
				brandName: partner.brandName || '',
				brandColor: partner.brandColor || '#EF4444',
				domain: partner.domain || ''
			};
		} catch (err: any) {
			error = err.message;
			console.error('[Admin IB Detail] Error:', err);
		} finally {
			loading = false;
		}
	}

	async function toggleApproval() {
		if (!partner) return;
		try {
			const response = await fetch(`/api/admin/ib-partners/${data.partnerId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isApproved: !partner.isApproved })
			});

			const result = await response.json();
			if (result.success) {
				await loadPartnerDetails();
			} else {
				alert(result.error || 'Failed to update partner');
			}
		} catch (err) {
			console.error('Error toggling approval:', err);
			alert('Failed to update partner');
		}
	}

	async function toggleActive() {
		if (!partner) return;
		try {
			const response = await fetch(`/api/admin/ib-partners/${data.partnerId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: !partner.isActive })
			});

			const result = await response.json();
			if (result.success) {
				await loadPartnerDetails();
			} else {
				alert(result.error || 'Failed to update partner');
			}
		} catch (err) {
			console.error('Error toggling active status:', err);
			alert('Failed to update partner');
		}
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2
		}).format(amount);
	}

	function formatDate(date: Date | undefined | null): string {
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
</script>

<svelte:head>
	<title>IB Partner Details - Admin</title>
	{#if partner?.favicon}
		<link rel="icon" type="image/x-icon" href={partner.favicon} />
	{/if}
</svelte:head>

<Navigation user={data.user} />

<div class="min-h-screen bg-black text-white">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Back Button -->
		<button
			on:click={() => goto('/admin/ib-partners')}
			class="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
		>
			<span>←</span>
			<span>Back to IB Partners</span>
		</button>

		{#if loading}
			<div class="flex justify-center items-center py-20">
				<div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
			</div>
		{:else if error}
			<div class="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
				<p class="text-red-400 font-bold">Error loading partner details</p>
				<p class="text-gray-400 mt-2">{error}</p>
				<button
					on:click={loadPartnerDetails}
					class="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
				>
					Retry
				</button>
			</div>
		{:else if partner}
			<!-- Partner Header -->
			<div class="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-8">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-4">
						{#if partner.logo}
							<img
								src={partner.logo}
								alt={partner.companyName}
								class="w-20 h-20 rounded-lg object-cover border-2 border-gray-700"
							/>
						{:else}
							<div class="w-20 h-20 rounded-lg bg-gray-700 flex items-center justify-center text-3xl text-gray-400 border-2 border-gray-700">
								{partner.companyName.charAt(0)}
							</div>
						{/if}
						<div>
							<h1 class="text-3xl font-bold mb-1">{partner.companyName}</h1>
							<p class="text-gray-400">{partner.contactName}</p>
							<p class="text-gray-500 text-sm">{partner.email} • {partner.phone}</p>
							<div class="flex items-center gap-2 mt-2">
								<span class="font-mono text-sm bg-gray-800 px-2 py-1 rounded">
									IB Code: {partner.ibCode}
								</span>
								{#if partner.domain}
									<span class="text-sm bg-blue-900/30 text-blue-400 px-2 py-1 rounded border border-blue-500/30">
										🌐 {partner.domain}
									</span>
								{/if}
							</div>
						</div>
					</div>
					<div class="flex flex-col gap-2">
						{#if !partner.isApproved}
							<button
								on:click={toggleApproval}
								class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
							>
								Approve Partner
							</button>
						{:else}
							<button
								on:click={toggleActive}
								class="px-4 py-2 {partner.isActive
									? 'bg-red-600 hover:bg-red-700'
									: 'bg-green-600 hover:bg-green-700'} rounded-lg transition-colors"
							>
								{partner.isActive ? 'Deactivate' : 'Activate'}
							</button>
						{/if}
						<div class="text-sm text-right">
							{#if !partner.isApproved}
								<span class="text-yellow-400">⏳ Pending Approval</span>
							{:else if partner.isActive}
								<span class="text-green-400">✓ Active</span>
							{:else}
								<span class="text-gray-500">○ Inactive</span>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Key Metrics -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
				<div class="bg-gradient-to-br from-blue-900/30 to-gray-900 border border-blue-500/30 rounded-lg p-6">
					<div class="text-gray-400 text-sm mb-2">Total Traders</div>
					<div class="text-3xl font-bold text-blue-400">{partner.totalTraders}</div>
					<div class="text-sm text-gray-500 mt-1">{partner.activeTraders} active</div>
				</div>

				<div class="bg-gradient-to-br from-green-900/30 to-gray-900 border border-green-500/30 rounded-lg p-6">
					<div class="text-gray-400 text-sm mb-2">Monthly Revenue</div>
					<div class="text-3xl font-bold text-green-500">
						{formatCurrency(partner.monthlyRevenue)}
					</div>
				</div>

				<div class="bg-gradient-to-br from-purple-900/30 to-gray-900 border border-purple-500/30 rounded-lg p-6">
					<div class="text-gray-400 text-sm mb-2">Lifetime Revenue</div>
					<div class="text-3xl font-bold text-purple-400">
						{formatCurrency(partner.lifetimeRevenue)}
					</div>
				</div>

				<div class="bg-gradient-to-br from-yellow-900/30 to-gray-900 border border-yellow-500/30 rounded-lg p-6">
					<div class="text-gray-400 text-sm mb-2">Pending Payment</div>
					<div class="text-3xl font-bold text-yellow-400">
						{formatCurrency(summary.pendingPayment)}
					</div>
				</div>
			</div>

			<!-- Tabs -->
			<div class="flex gap-2 mb-6 border-b border-gray-700">
				<button
					on:click={() => (activeTab = 'overview')}
					class="px-4 py-2 transition-colors"
					class:border-b-2={activeTab === 'overview'}
					class:border-red-500={activeTab === 'overview'}
					class:text-white={activeTab === 'overview'}
					class:text-gray-400={activeTab !== 'overview'}
				>
					Overview
				</button>
				<button
					on:click={() => (activeTab = 'traders')}
					class="px-4 py-2 transition-colors"
					class:border-b-2={activeTab === 'traders'}
					class:border-red-500={activeTab === 'traders'}
					class:text-white={activeTab === 'traders'}
					class:text-gray-400={activeTab !== 'traders'}
				>
					Traders ({accounts.length})
				</button>
				<button
					on:click={() => (activeTab = 'commissions')}
					class="px-4 py-2 transition-colors"
					class:border-b-2={activeTab === 'commissions'}
					class:border-red-500={activeTab === 'commissions'}
					class:text-white={activeTab === 'commissions'}
					class:text-gray-400={activeTab !== 'commissions'}
				>
					Commission History
				</button>
				<button
					on:click={() => (activeTab = 'whitelabel')}
					class="px-4 py-2 transition-colors"
					class:border-b-2={activeTab === 'whitelabel'}
					class:border-red-500={activeTab === 'whitelabel'}
					class:text-white={activeTab === 'whitelabel'}
					class:text-gray-400={activeTab !== 'whitelabel'}
				>
					White Label Settings
				</button>
			</div>

			<!-- Tab Content -->
			{#if activeTab === 'overview'}
				<div class="space-y-6">
					<!-- Partner Information -->
					<div class="bg-gray-900 border border-gray-700 rounded-lg p-6">
						<h2 class="text-2xl font-bold mb-4">Partner Information</h2>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<div class="text-gray-400 text-sm mb-1">Company Name</div>
								<div class="font-bold">{partner.companyName}</div>
							</div>
							<div>
								<div class="text-gray-400 text-sm mb-1">Contact Name</div>
								<div class="font-bold">{partner.contactName}</div>
							</div>
							<div>
								<div class="text-gray-400 text-sm mb-1">Email</div>
								<div class="font-bold">{partner.email}</div>
							</div>
							<div>
								<div class="text-gray-400 text-sm mb-1">Phone</div>
								<div class="font-bold">{partner.phone}</div>
							</div>
							<div>
								<div class="text-gray-400 text-sm mb-1">IB Code</div>
								<div class="font-mono bg-gray-800 px-2 py-1 rounded inline-block">
									{partner.ibCode}
								</div>
							</div>
							<div>
								<div class="text-gray-400 text-sm mb-1">Registered</div>
								<div class="font-bold">{formatDate(partner.createdAt)}</div>
							</div>
							{#if partner.approvedAt}
								<div>
									<div class="text-gray-400 text-sm mb-1">Approved</div>
									<div class="font-bold">{formatDate(partner.approvedAt)}</div>
								</div>
							{/if}
						</div>
					</div>

					<!-- Commission Settings -->
					<div class="bg-gray-900 border border-gray-700 rounded-lg p-6">
						<h2 class="text-2xl font-bold mb-4">Commission Settings</h2>
						<div class="space-y-4">
							<div>
								<div class="text-gray-400 text-sm mb-1">Spread Revenue Share</div>
								<div class="font-bold text-lg">{partner.spreadRevShare}%</div>
							</div>
							{#if partner.commissionRates.length > 0}
								<div>
									<div class="text-gray-400 text-sm mb-2">Volume-Based Commission Rates</div>
									<div class="space-y-2">
										{#each partner.commissionRates as rate}
											<div class="flex items-center justify-between bg-gray-800 px-4 py-2 rounded">
												<div>
													<span class="font-bold">{rate.commissionRate}%</span>
													<span class="text-gray-400 text-sm ml-2">
														{rate.minVolume} - {rate.maxVolume || '∞'} lots
													</span>
												</div>
												<span class="text-xs {rate.isActive ? 'text-green-400' : 'text-gray-500'}">
													{rate.isActive ? 'Active' : 'Inactive'}
												</span>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{:else if activeTab === 'traders'}
				<!-- Admin Privilege Notice -->
				<div class="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
					<div class="flex items-start gap-2">
						<span class="text-red-400 text-xl">🔐</span>
						<div>
							<div class="font-bold text-red-400 mb-1">Admin Privilege</div>
							<div class="text-sm text-gray-400">
								You are viewing real trader information including names, emails, and MT5 account numbers.
								This information is NOT visible to the IB partner - they only see anonymous account IDs.
							</div>
						</div>
					</div>
				</div>

				<!-- Traders Table -->
				<div class="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
					{#if accounts.length === 0}
						<div class="text-center py-12 text-gray-500">
							<div class="text-4xl mb-4">👥</div>
							<p class="text-lg">No traders yet</p>
							<p class="text-sm mt-2">Traders will appear here once they register with this IB code</p>
						</div>
					{:else}
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead>
									<tr class="border-b border-gray-700 bg-gray-800">
										<th class="text-left py-4 px-4 text-gray-400 font-semibold">Anonymous ID</th>
										<th class="text-left py-4 px-4 text-gray-400 font-semibold">Real Name</th>
										<th class="text-left py-4 px-4 text-gray-400 font-semibold">Email</th>
										<th class="text-left py-4 px-4 text-gray-400 font-semibold">MT5 Account</th>
										<th class="text-right py-4 px-4 text-gray-400 font-semibold">Balance</th>
										<th class="text-left py-4 px-4 text-gray-400 font-semibold">Status</th>
										<th class="text-right py-4 px-4 text-gray-400 font-semibold">Registered</th>
									</tr>
								</thead>
								<tbody>
									{#each accounts as account}
										<tr class="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
											<td class="py-4 px-4">
												<span class="font-mono text-sm bg-gray-800 px-2 py-1 rounded">
													{account.anonymousId}
												</span>
											</td>
											<td class="py-4 px-4 font-bold">{account.userName}</td>
											<td class="py-4 px-4 text-gray-400">{account.userEmail}</td>
											<td class="py-4 px-4">
												<span class="font-mono text-sm">{account.mt5AccountNumber}</span>
											</td>
											<td class="py-4 px-4 text-right">
												<div class="font-bold">{formatCurrency(account.balance)}</div>
												<div class="text-xs text-gray-500">Equity: {formatCurrency(account.equity)}</div>
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
			{:else if activeTab === 'commissions'}
				<!-- Commission History -->
				<div class="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
					{#if commissionHistory.length === 0}
						<div class="text-center py-12 text-gray-500">
							<div class="text-4xl mb-4">💰</div>
							<p class="text-lg">No commission history yet</p>
							<p class="text-sm mt-2">Commission data will appear after the first trading period</p>
						</div>
					{:else}
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead>
									<tr class="border-b border-gray-700 bg-gray-800">
										<th class="text-left py-4 px-4 text-gray-400 font-semibold">Period</th>
										<th class="text-right py-4 px-4 text-gray-400 font-semibold">Volume</th>
										<th class="text-right py-4 px-4 text-gray-400 font-semibold">Trades</th>
										<th class="text-right py-4 px-4 text-gray-400 font-semibold">Avg Spread</th>
										<th class="text-right py-4 px-4 text-gray-400 font-semibold">Gross</th>
										<th class="text-right py-4 px-4 text-gray-400 font-semibold">Platform Fee</th>
										<th class="text-right py-4 px-4 text-gray-400 font-semibold">Net</th>
										<th class="text-left py-4 px-4 text-gray-400 font-semibold">Status</th>
									</tr>
								</thead>
								<tbody>
									{#each commissionHistory as commission}
										<tr class="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
											<td class="py-4 px-4">
												{formatDate(commission.period)}
											</td>
											<td class="py-4 px-4 text-right">
												{formatVolume(commission.tradingVolume)} lots
											</td>
											<td class="py-4 px-4 text-right">
												{commission.numberOfTrades.toLocaleString()}
											</td>
											<td class="py-4 px-4 text-right">
												{commission.averageSpread.toFixed(2)}
											</td>
											<td class="py-4 px-4 text-right font-bold">
												{formatCurrency(commission.grossCommission)}
											</td>
											<td class="py-4 px-4 text-right text-red-400">
												-{formatCurrency(commission.platformFee)}
											</td>
											<td class="py-4 px-4 text-right font-bold text-green-500">
												{formatCurrency(commission.netCommission)}
											</td>
											<td class="py-4 px-4">
												{#if commission.isPaid}
													<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30">
														Paid {formatDate(commission.paidAt)}
													</span>
												{:else}
													<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-500/30">
														Pending
													</span>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			{:else if activeTab === 'whitelabel'}
				<!-- White Label Settings -->
				<div class="space-y-6">
					<!-- Upload Instructions Banner -->
					<div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
						<h3 class="text-xl font-bold mb-3 text-blue-400">📤 Asset Upload Requirements</h3>
						<div class="grid md:grid-cols-2 gap-4 text-sm">
							<div class="bg-gray-900/50 rounded p-4">
								<div class="font-bold text-white mb-2">🖼️ Logo</div>
								<div class="text-gray-300 space-y-1">
									<p><strong>Format:</strong> PNG with transparent background</p>
									<p><strong>Size:</strong> 200x200px minimum (square)</p>
									<p><strong>Max file size:</strong> 2MB</p>
									<p><strong>Usage:</strong> Dashboard, navigation, emails</p>
								</div>
							</div>
							<div class="bg-gray-900/50 rounded p-4">
								<div class="font-bold text-white mb-2">⭐ Favicon</div>
								<div class="text-gray-300 space-y-1">
									<p><strong>Format:</strong> ICO or PNG</p>
									<p><strong>Size:</strong> 32x32px or 16x16px</p>
									<p><strong>Max file size:</strong> 100KB</p>
									<p><strong>Usage:</strong> Browser tab icon</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Branding Assets -->
					<div class="bg-gray-900 border border-gray-700 rounded-lg p-6">
						<h2 class="text-2xl font-bold mb-4">Branding Assets</h2>

						<div class="space-y-6">
							<!-- Logo -->
							<div>
								<label class="block text-lg font-bold text-white mb-3">
									Company Logo
								</label>
								{#if partner.logo}
									<div class="flex items-start gap-4">
										<img
											src={partner.logo}
											alt="Logo"
											class="w-32 h-32 object-contain bg-gray-800 rounded border border-gray-700 p-2"
										/>
										<div>
											<div class="text-sm text-green-400 font-medium mb-1">✓ Logo uploaded</div>
											<div class="text-xs text-gray-500">This logo will appear on the dashboard and navigation</div>
										</div>
									</div>
								{:else}
									<div class="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
										<div class="text-yellow-400 font-medium mb-1">⚠️ No logo uploaded</div>
										<div class="text-sm text-gray-400">Upload a 200x200px PNG logo for full branding</div>
									</div>
								{/if}
								<div class="mt-3 p-3 bg-gray-800 rounded text-xs text-gray-400">
									<strong>Upload Instructions:</strong> Logo files should be placed in <code class="text-blue-400">/static/ib-logos/</code> and referenced in the database. Contact admin to upload assets.
								</div>
							</div>

							<!-- Favicon -->
							<div>
								<label class="block text-lg font-bold text-white mb-3">
									Favicon (Browser Tab Icon)
								</label>
								{#if partner.favicon}
									<div class="flex items-start gap-4">
										<img
											src={partner.favicon}
											alt="Favicon"
											class="w-8 h-8 object-contain bg-gray-800 rounded border border-gray-700 p-1"
										/>
										<div>
											<div class="text-sm text-green-400 font-medium mb-1">✓ Favicon uploaded</div>
											<div class="text-xs text-gray-500">This icon appears in browser tabs</div>
										</div>
									</div>
								{:else}
									<div class="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
										<div class="text-yellow-400 font-medium mb-1">⚠️ No favicon uploaded</div>
										<div class="text-sm text-gray-400">Upload a 32x32px ICO or PNG favicon</div>
									</div>
								{/if}
								<div class="mt-3 p-3 bg-gray-800 rounded text-xs text-gray-400">
									<strong>Upload Instructions:</strong> Favicon files should be placed in <code class="text-blue-400">/static/ib-logos/</code> and referenced in the database.
								</div>
							</div>

							<!-- Brand Name -->
							<div>
								<label class="block text-sm font-medium text-gray-400 mb-2">
									Brand Name
								</label>
								<div class="text-white font-bold">
									{partner.brandName || partner.companyName}
								</div>
							</div>

							<!-- Brand Color -->
							<div>
								<label class="block text-sm font-medium text-gray-400 mb-2">
									Primary Brand Color
								</label>
								<div class="flex items-center gap-3">
									<div
										class="w-16 h-16 rounded-lg border-2 border-gray-700"
										style="background-color: {partner.brandColor}"
									></div>
									<div class="text-white font-mono">{partner.brandColor}</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Custom Domain -->
					<div class="bg-gray-900 border border-gray-700 rounded-lg p-6">
						<h2 class="text-2xl font-bold mb-4">Custom Domain</h2>

						{#if partner.domain}
							<div class="space-y-4">
								<div>
									<label class="block text-sm font-medium text-gray-400 mb-2">
										Current Domain
									</label>
									<div class="flex items-center gap-2">
										<span class="text-white font-bold text-lg">{partner.domain}</span>
										<span class="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-500/30">
											Active
										</span>
									</div>
								</div>

								<div class="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
									<div class="font-bold text-blue-400 mb-2">DNS Configuration</div>
									<div class="text-sm text-gray-400 space-y-1">
										<p>To complete custom domain setup, configure these DNS records:</p>
										<div class="mt-2 bg-gray-800 p-3 rounded font-mono text-xs">
											<div>Type: CNAME</div>
											<div>Name: {partner.domain}</div>
											<div>Value: app.scalperium.com</div>
										</div>
									</div>
								</div>
							</div>
						{:else}
							<div class="text-gray-500">
								No custom domain configured
							</div>
							<div class="mt-4 p-4 bg-gray-800 rounded-lg">
								<p class="text-sm text-gray-400">
									Custom domains allow IB partners to serve the platform from their own branded domain
									(e.g., trading.theircompany.com) providing a fully white-labeled experience.
								</p>
							</div>
						{/if}
					</div>

					<!-- White Label Best Practices -->
					<div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
						<h3 class="text-xl font-bold mb-3 text-blue-400">White Label Best Practices</h3>
						<div class="space-y-2 text-sm text-gray-300">
							<p>✓ <strong>Logo:</strong> Use PNG with transparency, 200x200px minimum for crisp display</p>
							<p>✓ <strong>Favicon:</strong> Use ICO or PNG format, 32x32px or 16x16px for browser tabs</p>
							<p>✓ <strong>Brand Color:</strong> Choose high-contrast colors for readability</p>
							<p>✓ <strong>Domain:</strong> Use subdomain (e.g., trading.domain.com) for easier SSL setup</p>
							<p>✓ <strong>SSL Certificate:</strong> Required for custom domains - automatically provisioned</p>
							<p>✓ <strong>Email Templates:</strong> Customize sender name and email footers</p>
							<p>✓ <strong>Terms & Privacy:</strong> IB partners should provide their own legal documents</p>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>
