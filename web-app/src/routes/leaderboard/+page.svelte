<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import LeaderboardTable from '$lib/components/LeaderboardTable.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let leaderboardPeriod: 'daily' | 'weekly' | 'monthly' = 'daily';
	let loading = true;
	let prizes: any = null;
	
	async function loadPrizes() {
		try {
			const response = await fetch('/api/admin/prizes');
			if (response.ok) {
				const data = await response.json();
				prizes = data.prizes;
			}
		} catch (error) {
			console.error('Error loading prizes:', error);
		}
	}
	
	onMount(() => {
		loading = false;
		loadPrizes();
	});
	
	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		goto('/login');
	}
	
	$: currentPrizes = prizes ? prizes[leaderboardPeriod] : null;
</script>

<svelte:head>
	<title>Leaderboard - SCALPERIUM</title>
</svelte:head>

<Navigation user={data.user} />

<div class="min-h-screen bg-black">
	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if loading}
			<div class="flex items-center justify-center h-64">
				<div class="text-xl" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">Loading...</div>
			</div>
		{:else}
			<!-- Page Header -->
			<div class="mb-8">
				<h1 class="text-4xl font-bold mb-2" style="color: #9ca3af; text-shadow: 0 0 15px rgba(239, 68, 68, 0.6); font-family: 'Orbitron', sans-serif;">
					🏆 TRADER LEADERBOARD
				</h1>
				<p class="text-gray-400">
					Compete with the best traders and climb the ranks
				</p>
			</div>

			<!-- Stats Cards -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 border border-yellow-600/30">
					<div class="text-yellow-400 text-3xl mb-2">🥇</div>
					<div class="text-gray-400 text-sm mb-1">Top Trader</div>
					<div class="text-2xl font-bold text-white">Mike Pro</div>
					<div class="text-green-400 text-sm">$18,500.00</div>
				</div>
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 border border-gray-700/30">
					<div class="text-gray-400 text-3xl mb-2">📊</div>
					<div class="text-gray-400 text-sm mb-1">Total Traders</div>
					<div class="text-2xl font-bold text-white">5</div>
					<div class="text-gray-500 text-sm">Active this month</div>
				</div>
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 border border-gray-700/30">
					<div class="text-green-400 text-3xl mb-2">💰</div>
					<div class="text-gray-400 text-sm mb-1">Total Volume</div>
					<div class="text-2xl font-bold text-white">$75K+</div>
					<div class="text-gray-500 text-sm">Combined profit</div>
				</div>
			</div>

			<!-- Period Tabs -->
			<div class="flex gap-2 mb-6">
			<button
				on:click={() => leaderboardPeriod = 'daily'}
				class="px-6 py-3 rounded-lg font-medium transition-all"
				class:bg-gradient-to-r={leaderboardPeriod === 'daily'}
				class:from-red-500={leaderboardPeriod === 'daily'}
				class:to-red-700={leaderboardPeriod === 'daily'}
				class:text-white={leaderboardPeriod === 'daily'}
				class:shadow-lg={leaderboardPeriod === 'daily'}
				class:bg-gray-800={leaderboardPeriod !== 'daily'}
				class:text-gray-400={leaderboardPeriod !== 'daily'}
				style="{leaderboardPeriod === 'daily' ? 'box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.5)' : ''}"
			>
				📅 Daily
			</button>
			<button
				on:click={() => leaderboardPeriod = 'weekly'}
				class="px-6 py-3 rounded-lg font-medium transition-all"
				class:bg-gradient-to-r={leaderboardPeriod === 'weekly'}
				class:from-red-500={leaderboardPeriod === 'weekly'}
				class:to-red-700={leaderboardPeriod === 'weekly'}
				class:text-white={leaderboardPeriod === 'weekly'}
				class:shadow-lg={leaderboardPeriod === 'weekly'}
				class:bg-gray-800={leaderboardPeriod !== 'weekly'}
				class:text-gray-400={leaderboardPeriod !== 'weekly'}
				style="{leaderboardPeriod === 'weekly' ? 'box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.5)' : ''}"
			>
				📊 Weekly
			</button>
			<button
				on:click={() => leaderboardPeriod = 'monthly'}
				class="px-6 py-3 rounded-lg font-medium transition-all"
				class:bg-gradient-to-r={leaderboardPeriod === 'monthly'}
				class:from-red-500={leaderboardPeriod === 'monthly'}
				class:to-red-700={leaderboardPeriod === 'monthly'}
				class:text-white={leaderboardPeriod === 'monthly'}
				class:shadow-lg={leaderboardPeriod === 'monthly'}
				class:bg-gray-800={leaderboardPeriod !== 'monthly'}
				class:text-gray-400={leaderboardPeriod !== 'monthly'}
				style="{leaderboardPeriod === 'monthly' ? 'box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.5)' : ''}"
			>
				📈 Monthly
			</button>
			</div>

			<!-- Prize Display -->
			{#if currentPrizes}
				<div class="bg-gradient-to-br from-yellow-900/20 to-black rounded-xl border border-yellow-500/30 p-6 mb-6">
					<h3 class="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
						💰 {leaderboardPeriod.charAt(0).toUpperCase() + leaderboardPeriod.slice(1)} Prizes
					</h3>
					<div class="grid grid-cols-3 gap-4">
						<div class="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
							<div class="text-3xl mb-2">🥇</div>
							<div class="text-sm text-gray-400 mb-1">1st Place</div>
							<div class="text-2xl font-bold text-yellow-400">${currentPrizes.first}</div>
						</div>
						<div class="text-center p-4 bg-gray-500/10 rounded-lg border border-gray-500/20">
							<div class="text-3xl mb-2">🥈</div>
							<div class="text-sm text-gray-400 mb-1">2nd Place</div>
							<div class="text-2xl font-bold text-gray-300">${currentPrizes.second}</div>
						</div>
						<div class="text-center p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
							<div class="text-3xl mb-2">🥉</div>
							<div class="text-sm text-gray-400 mb-1">3rd Place</div>
							<div class="text-2xl font-bold text-orange-400">${currentPrizes.third}</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Leaderboard Table -->
			<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-6">
				<LeaderboardTable 
					period={leaderboardPeriod} 
					showUserPosition={true} 
					limit={100}
					autoRefresh={true}
					refreshInterval={60000}
				/>
			</div>

			<!-- Info Section -->
			<div class="mt-8 bg-gradient-to-br from-gray-900 to-black rounded-xl border border-gray-800 p-6">
				<h3 class="text-lg font-bold text-white mb-3">How Rankings Work</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
					<div>
						<p class="mb-2">
							<span class="text-red-400 font-medium">📊 Ranking Criteria:</span>
							Traders are ranked by total profit for the selected period
						</p>
						<p class="mb-2">
							<span class="text-red-400 font-medium">⏰ Update Frequency:</span>
							Leaderboard refreshes automatically every 60 seconds
						</p>
					</div>
					<div>
						<p class="mb-2">
							<span class="text-red-400 font-medium">🏆 Rewards:</span>
							Top 3 traders receive special badges and recognition
						</p>
						<p class="mb-2">
							<span class="text-red-400 font-medium">📈 Periods:</span>
							Choose between daily, weekly, or monthly rankings
						</p>
					</div>
				</div>
			</div>
		{/if}
	</main>

	<!-- Footer -->
	<footer class="mt-16 border-t border-gray-800 py-8">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="text-center text-gray-500 text-sm">
				<div class="mb-2" style="color: #9ca3af; text-shadow: 0 0 8px rgba(239, 68, 68, 0.5); font-family: 'Orbitron', sans-serif;">
					SCALPERIUM
				</div>
				<div>© 2025 All rights reserved</div>
			</div>
		</div>
	</footer>
</div>
