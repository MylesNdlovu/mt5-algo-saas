<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Navigation from '$lib/components/Navigation.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	interface IBPartnerStats {
		totalTraders: number;
		activeTraders: number;
		totalVolume: number;
		totalTrades: number;
		lifetimeCommission: number;
		monthlyRevenue: number;
		conversionRate: number;
	}

	interface IBPartner {
		id: string;
		companyName: string;
		contactName: string;
		email: string;
		phone: string;
		ibCode: string;
		isActive: boolean;
		isApproved: boolean;
		domain: string | null;
		logo: string | null;
		brandName: string | null;
		brandColor: string;
		createdAt: Date;
		approvedAt: Date | null;
		stats: IBPartnerStats;
	}

	interface OverallStats {
		totalIBPartners: number;
		activeIBPartners: number;
		pendingIBPartners: number;
		totalTradersReferred: number;
		totalActiveTradersReferred: number;
		totalCommissionsPaid: number;
		totalVolumeGenerated: number;
		totalMonthlyRevenue: number;
	}

	let partners: IBPartner[] = [];
	let overallStats: OverallStats | null = null;
	let loading = true;
	let error = '';
	let filterStatus: 'all' | 'pending' | 'active' | 'inactive' = 'all';

	onMount(() => {
		loadPartners();
	});

	async function loadPartners() {
		loading = true;
		error = '';
		try {
			const response = await fetch('/api/admin/ib-partners');
			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Failed to load IB partners');
			}

			partners = result.partners;
			overallStats = result.overallStats;
		} catch (err: any) {
			error = err.message;
			console.error('[Admin IB Partners] Error:', err);
		} finally {
			loading = false;
		}
	}

	async function toggleApproval(partnerId: string, currentStatus: boolean) {
		try {
			const response = await fetch(`/api/admin/ib-partners/${partnerId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isApproved: !currentStatus })
			});

			const result = await response.json();
			if (result.success) {
				await loadPartners();
			} else {
				alert(result.error || 'Failed to update partner');
			}
		} catch (err) {
			console.error('Error toggling approval:', err);
			alert('Failed to update partner');
		}
	}

	async function toggleActive(partnerId: string, currentStatus: boolean) {
		try {
			const response = await fetch(`/api/admin/ib-partners/${partnerId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: !currentStatus })
			});

			const result = await response.json();
			if (result.success) {
				await loadPartners();
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
			minimumFractionDigits: 0
		}).format(amount);
	}

	function formatDate(date: Date | null | undefined): string {
		if (!date) return 'N/A';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	$: filteredPartners = partners.filter((p) => {
		if (filterStatus === 'all') return true;
		if (filterStatus === 'pending') return !p.isApproved;
		if (filterStatus === 'active') return p.isActive && p.isApproved;
		if (filterStatus === 'inactive') return !p.isActive && p.isApproved;
		return true;
	});
</script>

<svelte:head>
	<title>IB Partner Management - Admin</title>
</svelte:head>

<Navigation user={data.user} />

<div class="min-h-screen bg-black text-white">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-4xl font-bold mb-2 bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
				IB Partner Management
			</h1>
			<p class="text-gray-400">Manage IB partners, approvals, and white-label settings</p>
		</div>

		{#if loading}
			<div class="flex justify-center items-center py-20">
				<div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
			</div>
		{:else if error}
			<div class="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
				<p class="text-red-400 font-bold">Error loading IB partners</p>
				<p class="text-gray-400 mt-2">{error}</p>
				<button
					on:click={loadPartners}
					class="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
				>
					Retry
				</button>
			</div>
		{:else if overallStats}
			<!-- Overall Statistics -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				<div class="bg-gradient-to-br from-blue-900/30 to-gray-900 border border-blue-500/30 rounded-lg p-6">
					<div class="text-gray-400 text-sm mb-2">Total IB Partners</div>
					<div class="text-3xl font-bold text-blue-400">{overallStats.totalIBPartners}</div>
					<div class="text-sm text-gray-500 mt-2">
						{overallStats.activeIBPartners} active, {overallStats.pendingIBPartners} pending
					</div>
				</div>

				<div class="bg-gradient-to-br from-green-900/30 to-gray-900 border border-green-500/30 rounded-lg p-6">
					<div class="text-gray-400 text-sm mb-2">Total Commissions Paid</div>
					<div class="text-3xl font-bold text-green-500">
						{formatCurrency(overallStats.totalCommissionsPaid)}
					</div>
					<div class="text-sm text-gray-500 mt-2">
						{formatCurrency(overallStats.totalMonthlyRevenue)}/mo
					</div>
				</div>

				<div class="bg-gradient-to-br from-purple-900/30 to-gray-900 border border-purple-500/30 rounded-lg p-6">
					<div class="text-gray-400 text-sm mb-2">Total Traders Referred</div>
					<div class="text-3xl font-bold text-purple-400">
						{overallStats.totalTradersReferred}
					</div>
					<div class="text-sm text-gray-500 mt-2">
						{overallStats.totalActiveTradersReferred} active
					</div>
				</div>

				<div class="bg-gradient-to-br from-yellow-900/30 to-gray-900 border border-yellow-500/30 rounded-lg p-6">
					<div class="text-gray-400 text-sm mb-2">Total Volume Generated</div>
					<div class="text-3xl font-bold text-yellow-400">
						{overallStats.totalVolumeGenerated.toFixed(2)} lots
					</div>
				</div>
			</div>

			<!-- Filter Buttons -->
			<div class="flex gap-2 mb-6">
				<button
					on:click={() => (filterStatus = 'all')}
					class="px-4 py-2 rounded-lg transition-colors"
					class:bg-red-600={filterStatus === 'all'}
					class:bg-gray-800={filterStatus !== 'all'}
				>
					All ({partners.length})
				</button>
				<button
					on:click={() => (filterStatus = 'pending')}
					class="px-4 py-2 rounded-lg transition-colors"
					class:bg-red-600={filterStatus === 'pending'}
					class:bg-gray-800={filterStatus !== 'pending'}
				>
					Pending Approval ({overallStats.pendingIBPartners})
				</button>
				<button
					on:click={() => (filterStatus = 'active')}
					class="px-4 py-2 rounded-lg transition-colors"
					class:bg-red-600={filterStatus === 'active'}
					class:bg-gray-800={filterStatus !== 'active'}
				>
					Active ({overallStats.activeIBPartners})
				</button>
				<button
					on:click={() => (filterStatus = 'inactive')}
					class="px-4 py-2 rounded-lg transition-colors"
					class:bg-red-600={filterStatus === 'inactive'}
					class:bg-gray-800={filterStatus !== 'inactive'}
				>
					Inactive ({partners.filter((p) => !p.isActive && p.isApproved).length})
				</button>
			</div>

			<!-- IB Partners Table -->
			<div class="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
				{#if filteredPartners.length === 0}
					<div class="text-center py-12 text-gray-500">
						<div class="text-4xl mb-4">📊</div>
						<p class="text-lg">No IB partners found</p>
						<p class="text-sm mt-2">
							{filterStatus === 'pending'
								? 'No pending approvals'
								: 'Try adjusting your filters'}
						</p>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead>
								<tr class="border-b border-gray-700 bg-gray-800">
									<th class="text-left py-4 px-4 text-gray-400 font-semibold">Company</th>
									<th class="text-left py-4 px-4 text-gray-400 font-semibold">Contact</th>
									<th class="text-left py-4 px-4 text-gray-400 font-semibold">IB Code</th>
									<th class="text-right py-4 px-4 text-gray-400 font-semibold">Traders</th>
									<th class="text-right py-4 px-4 text-gray-400 font-semibold">Monthly Rev</th>
									<th class="text-right py-4 px-4 text-gray-400 font-semibold">Lifetime</th>
									<th class="text-left py-4 px-4 text-gray-400 font-semibold">Status</th>
									<th class="text-left py-4 px-4 text-gray-400 font-semibold">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each filteredPartners as partner}
									<tr class="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
										<td class="py-4 px-4">
											<div class="flex items-center gap-3">
												{#if partner.logo}
													<img
														src={partner.logo}
														alt={partner.companyName}
														class="w-10 h-10 rounded object-cover"
													/>
												{:else}
													<div class="w-10 h-10 rounded bg-gray-700 flex items-center justify-center text-gray-400">
														{partner.companyName.charAt(0)}
													</div>
												{/if}
												<div>
													<div class="font-bold">{partner.companyName}</div>
													{#if partner.domain}
														<div class="text-xs text-gray-500">{partner.domain}</div>
													{/if}
												</div>
											</div>
										</td>
										<td class="py-4 px-4">
											<div class="text-sm">
												<div>{partner.contactName}</div>
												<div class="text-gray-500">{partner.email}</div>
											</div>
										</td>
										<td class="py-4 px-4">
											<span class="font-mono text-sm bg-gray-800 px-2 py-1 rounded">
												{partner.ibCode}
											</span>
										</td>
										<td class="py-4 px-4 text-right">
											<div class="font-bold">{partner.stats.totalTraders}</div>
											<div class="text-xs text-green-500">
												{partner.stats.activeTraders} active
											</div>
										</td>
										<td class="py-4 px-4 text-right font-bold text-green-500">
											{formatCurrency(partner.stats.monthlyRevenue)}
										</td>
										<td class="py-4 px-4 text-right font-bold">
											{formatCurrency(partner.stats.lifetimeCommission)}
										</td>
										<td class="py-4 px-4">
											<div class="flex flex-col gap-1">
												{#if !partner.isApproved}
													<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-500/30">
														Pending Approval
													</span>
												{:else if partner.isActive}
													<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30">
														Active
													</span>
												{:else}
													<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-500 border border-gray-700">
														Inactive
													</span>
												{/if}
											</div>
										</td>
										<td class="py-4 px-4">
											<div class="flex gap-2">
												<button
													on:click={() => goto(`/admin/ib-partners/${partner.id}`)}
													class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
												>
													View
												</button>
												{#if !partner.isApproved}
													<button
														on:click={() => toggleApproval(partner.id, partner.isApproved)}
														class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
													>
														Approve
													</button>
												{:else}
													<button
														on:click={() => toggleActive(partner.id, partner.isActive)}
														class="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm transition-colors"
													>
														{partner.isActive ? 'Deactivate' : 'Activate'}
													</button>
												{/if}
											</div>
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
