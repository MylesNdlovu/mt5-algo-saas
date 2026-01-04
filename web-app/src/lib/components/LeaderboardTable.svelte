<script lang="ts">
	import { onMount } from 'svelte';
	
	export let period: 'daily' | 'weekly' | 'monthly' = 'daily';
	export let showUserPosition = true;
	export let limit = 10;
	export let autoRefresh = false;
	export let refreshInterval = 60000; // 1 minute
	
	interface LeaderboardEntry {
		id: string;
		userId: string;
		userName: string;
		trades: number;
		winningTrades: number;
		losingTrades: number;
		profit: number;
		volume: number;
		winRate: number;
		rank?: number;
		previousRank?: number;
	}
	
	interface UserPosition {
		rank?: number;
		profit: number;
		winRate: number;
		trades: number;
	}
	
	let entries: LeaderboardEntry[] = [];
	let userPosition: UserPosition | null = null;
	let loading = true;
	let error = '';
	let lastUpdated = '';
	let refreshTimer: number;
	
	async function fetchLeaderboard() {
		try {
			loading = true;
			error = '';
			
			const response = await fetch(`/api/leaderboard?period=${period}&limit=${limit}`);
			const result = await response.json();
			
			if (!response.ok) {
				throw new Error(result.error || 'Failed to fetch leaderboard');
			}
			
			entries = result.data.entries;
			userPosition = result.data.userPosition;
			lastUpdated = new Date(result.data.lastUpdated).toLocaleTimeString();
			
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load leaderboard';
			console.error('Leaderboard error:', err);
		} finally {
			loading = false;
		}
	}
	
	function getRankChange(entry: LeaderboardEntry): string {
		if (!entry.rank || !entry.previousRank) return '';
		
		const change = entry.previousRank - entry.rank;
		if (change > 0) return `↑${change}`;
		if (change < 0) return `↓${Math.abs(change)}`;
		return '—';
	}
	
	function formatProfit(profit: number): string {
		const formatted = Math.abs(profit).toFixed(2);
		return profit >= 0 ? `+$${formatted}` : `-$${formatted}`;
	}
	
	function formatWinRate(rate: number): string {
		return `${rate.toFixed(1)}%`;
	}
	
	function getMedalEmoji(rank: number): string {
		if (rank === 1) return '🥇';
		if (rank === 2) return '🥈';
		if (rank === 3) return '🥉';
		return '';
	}
	
	onMount(() => {
		fetchLeaderboard();
		
		if (autoRefresh) {
			refreshTimer = setInterval(fetchLeaderboard, refreshInterval) as unknown as number;
		}
		
		return () => {
			if (refreshTimer) clearInterval(refreshTimer);
		};
	});
	
	// Refresh when period changes
	$: if (period) {
		fetchLeaderboard();
	}
</script>

<div class="leaderboard-container">
	{#if loading && entries.length === 0}
		<div class="text-center py-8">
			<div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
			<p class="mt-2 text-gray-400">Loading leaderboard...</p>
		</div>
	{:else if error}
		<div class="bg-red-900/20 border border-red-500 rounded p-4 text-center">
			<p class="text-red-400">❌ {error}</p>
			<button 
				on:click={fetchLeaderboard}
				class="mt-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-white"
			>
				Retry
			</button>
		</div>
	{:else}
		<!-- User Position Card (if available) -->
		{#if showUserPosition && userPosition}
			<div class="user-position-card mb-4 p-4 bg-gradient-to-r from-red-900/30 to-red-800/20 border border-red-500/30 rounded-lg">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-gray-400">Your Rank</p>
						<p class="text-3xl font-bold text-red-400">
							{userPosition.rank ? `#${userPosition.rank}` : 'Unranked'}
						</p>
					</div>
					<div class="text-right">
						<p class="text-sm text-gray-400">Your Profit</p>
						<p class="text-2xl font-bold" class:text-green-400={userPosition.profit >= 0} class:text-red-400={userPosition.profit < 0}>
							{formatProfit(userPosition.profit)}
						</p>
					</div>
					<div class="text-right">
						<p class="text-sm text-gray-400">Win Rate</p>
						<p class="text-2xl font-bold text-gray-300">
							{formatWinRate(userPosition.winRate)}
						</p>
					</div>
				</div>
			</div>
		{/if}
		
		<!-- Leaderboard Table -->
		<div class="overflow-hidden rounded-lg border border-gray-700">
			<table class="w-full">
				<thead class="bg-gray-900">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
							Rank
						</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
							Trader
						</th>
						<th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
							Trades
						</th>
						<th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
							Win Rate
						</th>
						<th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
							Profit
						</th>
						<th class="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
							Change
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-700">
					{#each entries as entry, index}
						<tr class="hover:bg-gray-800/50 transition-colors">
							<td class="px-4 py-3 whitespace-nowrap">
								<div class="flex items-center gap-2">
									<span class="text-lg font-bold text-gray-300">
										{entry.rank || index + 1}
									</span>
									{#if entry.rank && entry.rank <= 3}
										<span class="text-xl">{getMedalEmoji(entry.rank)}</span>
									{/if}
								</div>
							</td>
							<td class="px-4 py-3 whitespace-nowrap">
								<p class="font-medium text-gray-200">{entry.userName}</p>
							</td>
							<td class="px-4 py-3 whitespace-nowrap text-right">
								<p class="text-gray-300">{entry.trades}</p>
								<p class="text-xs text-gray-500">
									{entry.winningTrades}W / {entry.losingTrades}L
								</p>
							</td>
							<td class="px-4 py-3 whitespace-nowrap text-right">
								<p class="font-medium" 
									class:text-green-400={entry.winRate >= 60}
									class:text-yellow-400={entry.winRate >= 40 && entry.winRate < 60}
									class:text-red-400={entry.winRate < 40}
								>
									{formatWinRate(entry.winRate)}
								</p>
							</td>
							<td class="px-4 py-3 whitespace-nowrap text-right">
								<p class="text-lg font-bold" 
									class:text-green-400={entry.profit >= 0}
									class:text-red-400={entry.profit < 0}
								>
									{formatProfit(entry.profit)}
								</p>
							</td>
							<td class="px-4 py-3 whitespace-nowrap text-center">
								<span class="text-sm font-medium"
									class:text-green-400={entry.previousRank && entry.rank && entry.previousRank > entry.rank}
									class:text-red-400={entry.previousRank && entry.rank && entry.previousRank < entry.rank}
									class:text-gray-500={!entry.previousRank || !entry.rank || entry.previousRank === entry.rank}
								>
									{getRankChange(entry)}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			
			{#if entries.length === 0}
				<div class="text-center py-8 text-gray-400">
					<p>No rankings available for this period</p>
				</div>
			{/if}
		</div>
		
		<!-- Footer -->
		<div class="mt-3 flex items-center justify-between text-xs text-gray-500">
			<p>Last updated: {lastUpdated}</p>
			{#if autoRefresh}
				<p class="flex items-center gap-1">
					<span class="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
					Auto-refreshing
				</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.leaderboard-container {
		width: 100%;
	}
	
	table {
		background-color: rgba(0, 0, 0, 0.3);
	}
	
	thead {
		position: sticky;
		top: 0;
		z-index: 10;
	}
</style>
