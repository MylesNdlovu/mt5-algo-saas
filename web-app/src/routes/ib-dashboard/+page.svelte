<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let ibData: any = null;
	let referredUsers: any[] = [];
	let stats = {
		totalUsers: 0,
		activeUsers: 0,
		monthlyRevenue: 0,
		totalRevenue: 0
	};
	let loading = true;

	onMount(async () => {
		try {
			const response = await fetch('/api/ib/dashboard');
			if (response.ok) {
				const data = await response.json();
				ibData = data.ibPartner;
				referredUsers = data.users;
				stats = data.stats;
			} else {
				goto('/ib-login');
			}
		} catch (error) {
			goto('/ib-login');
		} finally {
			loading = false;
		}
	});

	async function handleLogout() {
		await fetch('/api/ib/logout', { method: 'POST' });
		goto('/ib-login');
	}

	function copyIBCode() {
		if (ibData?.ibCode) {
			navigator.clipboard.writeText(ibData.ibCode);
			alert('IB Code copied to clipboard!');
		}
	}
</script>

<svelte:head>
	<title>IB Dashboard - SCALPERIUM</title>
	<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
</svelte:head>

{#if loading}
	<div class="min-h-screen bg-black flex items-center justify-center">
		<div class="text-white text-xl">Loading...</div>
	</div>
{:else if ibData}
	<div class="min-h-screen bg-black text-white">
		<!-- Header -->
		<div class="bg-gradient-to-r from-gray-900 to-black border-b border-red-500/30 py-6">
			<div class="max-w-7xl mx-auto px-6 flex justify-between items-center">
				<div>
					<h1 class="text-3xl font-bold" style="font-family: 'Orbitron', sans-serif; text-shadow: 0 0 20px rgba(239, 68, 68, 0.5);">
						<span class="bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
							IB DASHBOARD
						</span>
					</h1>
					<p class="text-gray-400 mt-1">{ibData.companyName}</p>
				</div>
				<button
					on:click={handleLogout}
					class="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
				>
					Logout
				</button>
			</div>
		</div>

		<div class="max-w-7xl mx-auto px-6 py-8">
			<!-- IB Code Card -->
			<div class="bg-gradient-to-br from-red-900/30 to-black rounded-xl border border-red-500/50 p-8 mb-8">
				<h2 class="text-2xl font-bold mb-4" style="font-family: 'Orbitron', sans-serif;">
					Your Referral Code
				</h2>
				<div class="flex items-center gap-4">
					<div class="flex-1 bg-black rounded-lg p-4 border border-gray-700">
						<div class="text-sm text-gray-400 mb-1">IB Code</div>
						<div class="text-3xl font-bold tracking-wider text-red-400">{ibData.ibCode}</div>
					</div>
					<button
						on:click={copyIBCode}
						class="px-6 py-3 bg-gradient-to-r from-red-500 to-red-700 rounded-lg font-semibold hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] transition"
					>
						📋 Copy Code
					</button>
				</div>
				<p class="text-gray-400 text-sm mt-4">
					Share this code with your traders. They'll enter it during registration to be linked to your account.
				</p>
			</div>

			<!-- Stats Cards -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-6">
					<div class="text-sm text-gray-400 mb-2">Total Traders</div>
					<div class="text-3xl font-bold text-white">{stats.totalUsers}</div>
				</div>
				
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-green-500/30 p-6">
					<div class="text-sm text-gray-400 mb-2">Active Traders</div>
					<div class="text-3xl font-bold text-green-400">{stats.activeUsers}</div>
				</div>
				
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-blue-500/30 p-6">
					<div class="text-sm text-gray-400 mb-2">Monthly Revenue</div>
					<div class="text-3xl font-bold text-blue-400">${stats.monthlyRevenue.toFixed(2)}</div>
				</div>
				
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-yellow-500/30 p-6">
					<div class="text-sm text-gray-400 mb-2">Total Revenue</div>
					<div class="text-3xl font-bold text-yellow-400">${stats.totalRevenue.toFixed(2)}</div>
				</div>
			</div>

			<!-- White Label Settings -->
			<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-8 mb-8">
				<h2 class="text-2xl font-bold mb-6" style="font-family: 'Orbitron', sans-serif;">
					White Label Settings
				</h2>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<div class="text-sm text-gray-400 mb-2">Custom Domain</div>
						<div class="text-lg text-white">{ibData.domain || 'Not configured'}</div>
					</div>
					
					<div>
						<div class="text-sm text-gray-400 mb-2">Brand Name</div>
						<div class="text-lg text-white">{ibData.brandName || ibData.companyName}</div>
					</div>
					
					<div>
						<div class="text-sm text-gray-400 mb-2">Brand Color</div>
						<div class="flex items-center gap-3">
							<div class="w-12 h-12 rounded-lg border border-gray-700" style="background-color: {ibData.brandColor}"></div>
							<span class="text-white">{ibData.brandColor}</span>
						</div>
					</div>
					
					<div>
						<div class="text-sm text-gray-400 mb-2">Logo</div>
						<div class="text-white">{ibData.logo ? '✅ Uploaded' : '❌ Not uploaded'}</div>
					</div>
				</div>
				
				<p class="text-yellow-400 text-sm mt-6">
					💡 Contact support to update your white-label settings: partners@scalperium.com
				</p>
			</div>

			<!-- Referred Traders Table -->
			<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-8">
				<h2 class="text-2xl font-bold mb-6" style="font-family: 'Orbitron', sans-serif;">
					Your Traders
				</h2>
				
				{#if referredUsers.length > 0}
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="border-b border-gray-700">
								<tr class="text-left text-gray-400 text-sm">
									<th class="pb-3">Name</th>
									<th class="pb-3">Email</th>
									<th class="pb-3">Joined</th>
									<th class="pb-3">Status</th>
									<th class="pb-3">Profit</th>
								</tr>
							</thead>
							<tbody>
								{#each referredUsers as user}
									<tr class="border-b border-gray-800">
										<td class="py-4 text-white">{user.firstName} {user.lastName}</td>
										<td class="py-4 text-gray-300">{user.email}</td>
										<td class="py-4 text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
										<td class="py-4">
											{#if user.subscriptionTier !== 'FREE'}
												<span class="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Active</span>
											{:else}
												<span class="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-sm">Free</span>
											{/if}
										</td>
										<td class="py-4 {user.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold">
											${user.totalProfit.toFixed(2)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="text-center py-12 text-gray-500">
						<div class="text-5xl mb-4">📊</div>
						<p class="text-lg">No traders yet</p>
						<p class="text-sm mt-2">Share your IB code to start building your network</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
