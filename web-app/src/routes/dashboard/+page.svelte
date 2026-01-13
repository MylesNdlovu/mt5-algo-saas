<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import LeaderboardTable from '$lib/components/LeaderboardTable.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	// Role checks
	$: isAdmin = data.user?.role === 'SUPER_ADMIN' || data.user?.role === 'ADMIN';
	$: isIB = data.user?.role === 'IB';

	let accountData: any = null;
	let loading = true;
	let error = '';
	let pollInterval: any;

	// Multi-Account Trading Management
	let mt5Accounts: any[] = [];
	let loadingAccounts = false;
	
	// Filter states
	let tradeFilter: 'all' | 'open' | 'closed' = 'all';
	let dateFilter: 'today' | 'week' | 'month' | 'all' = 'all';
	let selectedTrade: any = null;
	let showMenu = false;
	let showSettings = false;
	let showNotifications = false;
	let showLeaderboard = false;
	let leaderboardPeriod: 'daily' | 'weekly' | 'monthly' = 'daily';
	let botStatus: 'active' | 'paused' | 'stopped' = 'active';
	let safetyMode: 'green' | 'orange' | 'red' = 'green';
	let maxLotSize = 0.01; // Adjustable max lot size (0.01-0.05 range)
	let maxLoss = 5; // Max loss in $ - user adjustable ($5-$10 range)
	let winningStreak = 0; // Track consecutive winning trades
	let sessionStartTime = Date.now();
	let sessionDuration = '00:00:00';
	
	// Lot size color indicator based on value
	function getLotSizeColor(lotSize: number): string {
		if (lotSize >= 0.50) return 'green'; // High volume
		if (lotSize >= 0.10) return 'orange'; // Medium risk
		return 'default'; // Low risk (gray)
	}
	
	// Auto-increase lot size based on winning streak
	$: if (accountData?.closedTrades) {
		const recentTrades = accountData.closedTrades.slice(-5); // Last 5 trades
		const allWinning = recentTrades.length >= 3 && recentTrades.every((t: any) => t.profit > 0);
		winningStreak = allWinning ? recentTrades.length : 0;

		// Increase lot size by 0.01 for each 3 consecutive wins (capped at 0.05 max)
		if (winningStreak >= 3 && maxLotSize < 0.05) {
			const increase = Math.floor(winningStreak / 3) * 0.01;
			maxLotSize = Math.min(0.05, maxLotSize + increase);
		}
	}
	
	// Update session timer every second
	let sessionTimer: any;
	$: if (botStatus === 'active') {
		if (!sessionTimer) {
			sessionTimer = setInterval(() => {
				const elapsed = Date.now() - sessionStartTime;
				const hours = Math.floor(elapsed / 3600000);
				const minutes = Math.floor((elapsed % 3600000) / 60000);
				const seconds = Math.floor((elapsed % 60000) / 1000);
				sessionDuration = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
			}, 1000);
		}
	} else {
		if (sessionTimer) {
			clearInterval(sessionTimer);
			sessionTimer = null;
		}
	}
	
	function exportTrades() {
		if (!accountData) return;
		const allTrades = [...(accountData.openTrades || []), ...(accountData.closedTrades || [])];
		const csv = [
			['Symbol', 'Type', 'Volume', 'Open Price', 'Close Price', 'Open Time', 'Close Time', 'Profit'].join(','),
			...allTrades.map(t => [
				t.symbol,
				t.type,
				t.volume,
				t.openPrice,
				t.closePrice || 'Open',
				t.openTime,
				t.closeTime || 'Open',
				t.profit
			].join(','))
		].join('\n');
		
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `scalperium-trades-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
	}
	
	// Note: Lot size is now manually controlled by user (0.01-0.05 range)
	// Removed auto-calculation based on equity for better user control

	// Save bot settings and sync with C# agent
	async function saveBotSettings() {
		try {
			const response = await fetch('/api/user/bot-settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					maxLotSize,
					maxLoss,
					safetyMode
				})
			});

			if (response.ok) {
				alert('✅ Settings saved and synced with agent!');
				showSettings = false;
			} else {
				alert('❌ Failed to save settings');
			}
		} catch (error) {
			console.error('Error saving settings:', error);
			alert('❌ Error saving settings');
		}
	}

	// Load MT5 accounts for multi-account trading
	async function loadMT5Accounts() {
		loadingAccounts = true;
		try {
			const response = await fetch('/api/user/mt5-accounts');
			if (response.ok) {
				const data = await response.json();
				mt5Accounts = data.accounts || [];
			} else {
				console.error('Failed to load MT5 accounts');
			}
		} catch (error) {
			console.error('Error loading MT5 accounts:', error);
		} finally {
			loadingAccounts = false;
		}
	}

	// Toggle account selection for trading
	async function toggleAccount(accountId: string) {
		try {
			const response = await fetch(`/api/user/mt5-accounts/${accountId}/toggle`, {
				method: 'PATCH'
			});

			if (response.ok) {
				const data = await response.json();
				// Update local state
				mt5Accounts = mt5Accounts.map(acc =>
					acc.id === accountId
						? { ...acc, isEnabledForTrading: !acc.isEnabledForTrading }
						: acc
				);
			} else {
				const error = await response.json();
				alert(error.error || 'Failed to toggle account');
			}
		} catch (error) {
			console.error('Error toggling account:', error);
			alert('Failed to toggle account selection');
		}
	}

	// Load MT5 accounts when settings modal opens
	$: if (showSettings && mt5Accounts.length === 0) {
		loadMT5Accounts();
	}

	// Multi-Account EA Control
	async function startAlgo() {
		try {
			const response = await fetch('/api/user/ea/command', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ command: 'start_ea' })
			});

			const data = await response.json();

			if (data.success) {
				botStatus = 'active';
				sessionStartTime = Date.now();
				alert(`✅ Algo started on ${data.successfulAccounts} account(s)`);
			} else {
				alert(`⚠️ ${data.message}\n\nPlease check that:\n- At least one account is enabled in Settings\n- Your agent is online and connected`);
			}
		} catch (error) {
			console.error('Error starting algo:', error);
			alert('❌ Failed to start algo. Please check your connection.');
		}
	}

	async function stopAlgo() {
		try {
			const response = await fetch('/api/user/ea/command', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ command: 'stop_ea' })
			});

			const data = await response.json();

			if (data.success) {
				botStatus = 'stopped';
				alert(`✅ Algo stopped on ${data.successfulAccounts} account(s)`);
			} else {
				alert(`⚠️ ${data.message}`);
			}
		} catch (error) {
			console.error('Error stopping algo:', error);
			alert('❌ Failed to stop algo');
		}
	}

	async function pauseAlgo() {
		try {
			const response = await fetch('/api/user/ea/command', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ command: 'pause_ea' })
			});

			const data = await response.json();

			if (data.success) {
				botStatus = 'paused';
				alert(`⏸️ Algo paused on ${data.successfulAccounts} account(s)`);
			} else {
				alert(`⚠️ ${data.message}`);
			}
		} catch (error) {
			console.error('Error pausing algo:', error);
			alert('❌ Failed to pause algo');
		}
	}

	async function loadAccountData() {
		try {
			const accountsRes = await fetch('/api/user/accounts');
			if (!accountsRes.ok) {
				if (accountsRes.status === 401) {
					goto('/login');
					return;
				}
				throw new Error('Failed to load accounts');
			}

			const accounts = await accountsRes.json();
			if (!accounts || accounts.length === 0) {
				goto('/connect');
				return;
			}

			const accountId = accounts[0].id;
			const res = await fetch(`/api/account/${accountId}`);
			if (!res.ok) throw new Error('Failed to load account data');

			accountData = await res.json();
			loading = false;
		} catch (err: any) {
			error = err.message;
			loading = false;
		}
	}

	onMount(() => {
		loadAccountData();
		pollInterval = setInterval(loadAccountData, 5000);
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});

	function handleLogout() {
		document.cookie = 'user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
		goto('/login');
	}

	function formatDateTime(dateStr: string) {
		const date = new Date(dateStr);
		return date.toLocaleString('en-US', { 
			month: 'short', 
			day: 'numeric', 
			hour: '2-digit', 
			minute: '2-digit' 
		});
	}

	function formatProfit(profit: number) {
		const sign = profit >= 0 ? '+' : '';
		return `${sign}$${profit.toFixed(2)}`;
	}

	$: filteredTrades = accountData ? (() => {
		let trades = [...(accountData.openTrades || []), ...(accountData.closedTrades || [])];
		
		// Filter by trade status
		if (tradeFilter === 'open') {
			trades = accountData.openTrades || [];
		} else if (tradeFilter === 'closed') {
			trades = accountData.closedTrades || [];
		}

		// Filter by date
		if (dateFilter !== 'all') {
			const now = new Date();
			const filterDate = new Date();
			
			if (dateFilter === 'today') {
				filterDate.setHours(0, 0, 0, 0);
			} else if (dateFilter === 'week') {
				filterDate.setDate(now.getDate() - 7);
			} else if (dateFilter === 'month') {
				filterDate.setMonth(now.getMonth() - 1);
			}

			trades = trades.filter((t: any) => {
				const tradeDate = new Date(t.openTime || t.closeTime);
				return tradeDate >= filterDate;
			});
		}

		return trades;
	})() : [];

	$: totalProfit = filteredTrades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
	$: openTradesCount = accountData?.openTrades?.length || 0;
	$: closedTradesCount = accountData?.closedTrades?.length || 0;
	$: filteredClosedTrades = filteredTrades.filter((t: any) => t.closeTime);
	$: winningTrades = filteredTrades.filter((t: any) => t.profit > 0).length;
	$: losingTrades = filteredTrades.filter((t: any) => t.profit < 0).length;
	$: averageProfit = filteredTrades.length > 0 ? totalProfit / filteredTrades.length : 0;
	$: biggestWin = filteredTrades.length > 0 ? Math.max(...filteredTrades.map((t: any) => t.profit)) : 0;
	$: biggestLoss = filteredTrades.length > 0 ? Math.min(...filteredTrades.map((t: any) => t.profit)) : 0;
</script>

<div class="min-h-screen bg-black">
	<!-- Header with Navigation -->
	<header class="border-b border-gray-800 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
		<div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
			<div class="flex items-center justify-between gap-4">
				<!-- Logo & Title -->
				<div class="flex items-center gap-2 sm:gap-3">
					<img src="/logo.png" alt="SCALPERIUM" class="w-12 h-12 sm:w-16 sm:h-16" />
					<div>
						<h1
							class="text-base sm:text-xl font-bold uppercase"
							style="font-family: 'Orbitron', sans-serif; color: #9ca3af; text-shadow: 0 0 8px rgba(239, 68, 68, 0.5); letter-spacing: 0.1em;"
						>
							SCALPERIUM
						</h1>
						{#if accountData}
							<div class="flex items-center gap-2">
								<div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
								<span class="text-xs text-gray-400">MT5 Live</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Bot Controls & Safety System -->
				{#if accountData}
					<div class="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-4">
						<!-- Traffic Light Safety Indicator (Read-Only) -->
						<div class="flex items-center gap-2 px-3 py-2 bg-gray-900 rounded-xl border-2 border-gray-700 shadow-lg">
							<div class="flex gap-2">
								<!-- Red Light -->
								<div
									class="w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all border-2 cursor-not-allowed"
									class:bg-red-600={safetyMode === 'red'}
									class:border-red-400={safetyMode === 'red'}
									class:shadow-lg={safetyMode === 'red'}
									class:shadow-red-500={safetyMode === 'red'}
									class:bg-red-950={safetyMode !== 'red'}
									class:border-red-900={safetyMode !== 'red'}
									class:opacity-40={safetyMode !== 'red'}
									title="Unsafe - Auto-synced from MT5"
								></div>
								<!-- Amber Light -->
								<div
									class="w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all border-2 cursor-not-allowed"
									class:bg-amber-500={safetyMode === 'orange'}
									class:border-amber-400={safetyMode === 'orange'}
									class:shadow-lg={safetyMode === 'orange'}
									class:shadow-amber-500={safetyMode === 'orange'}
									class:bg-amber-950={safetyMode !== 'orange'}
									class:border-amber-900={safetyMode !== 'orange'}
									class:opacity-30={safetyMode !== 'orange'}
									title="Caution - Auto-synced from MT5"
								></div>
								<!-- Green Light -->
								<div
									class="w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all border-2 cursor-not-allowed"
									class:bg-green-500={safetyMode === 'green'}
									class:border-green-300={safetyMode === 'green'}
									class:shadow-lg={safetyMode === 'green'}
									class:shadow-green-400={safetyMode === 'green'}
									class:bg-green-950={safetyMode !== 'green'}
									class:border-green-900={safetyMode !== 'green'}
									class:opacity-30={safetyMode !== 'green'}
									title="Safe - Auto-synced from MT5"
								></div>
							</div>
							<span class="text-xs text-gray-500 hidden sm:inline">MT5 Sync</span>
						</div>
						
						<!-- Play/Pause Controls (PROMINENT) -->
						{#if safetyMode === 'green'}
							{#if botStatus === 'active'}
								<button
									on:click={pauseAlgo}
									class="relative px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 rounded-xl shadow-lg shadow-red-500/50 transition-all transform hover:scale-105 border-2 border-red-400"
									title="Pause Bot"
								>
									<div class="flex items-center gap-2">
										<!-- Pause Icon -->
										<svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
											<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
										</svg>
										<span class="hidden sm:block text-sm font-bold text-white uppercase tracking-wider">Pause</span>
									</div>
									<!-- Pulsing indicator -->
									<div class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
								</button>
							{:else}
								<button
									on:click={startAlgo}
									class="relative px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-xl shadow-lg shadow-green-500/50 transition-all transform hover:scale-105 border-2 border-green-400 animate-pulse"
									title="Start Bot"
								>
									<div class="flex items-center gap-2">
										<!-- Play Icon -->
										<svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
											<path d="M8 5v14l11-7z"/>
										</svg>
										<span class="hidden sm:block text-sm font-bold text-white uppercase tracking-wider">Start</span>
									</div>
								</button>
							{/if}
						{:else if safetyMode === 'orange'}
							<div class="px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-red-500 rounded-xl shadow-lg shadow-red-500/50">
								<span class="text-xs sm:text-sm text-gray-200 font-bold uppercase tracking-wider" style="text-shadow: 0 0 5px rgba(239, 68, 68, 0.5);">⚠️ CAUTION MODE</span>
							</div>
						{:else}
							<div class="px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-500 rounded-xl shadow-lg">
								<span class="text-xs sm:text-sm text-red-200 font-bold uppercase tracking-wider">🛑 STOPPED</span>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Right Side Actions -->
				<div class="flex items-center gap-2">
					<!-- Session Timer (Desktop) -->
					{#if accountData && botStatus === 'active'}
						<div class="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-900 rounded-lg border border-gray-800">
							<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span class="text-xs text-gray-400 font-mono">{sessionDuration}</span>
						</div>
					{/if}
					
					<!-- Notifications -->
					<div class="relative">
						<button
							on:click={() => showNotifications = !showNotifications}
							class="p-2 hover:bg-gray-900 rounded-lg transition-colors relative"
							title="Notifications"
						>
							<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
							</svg>
							<!-- Notification Badge -->
							{#if accountData?.openTrades?.length > 0}
								<span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
							{/if}
						</button>
						
						<!-- Notifications Dropdown -->
						{#if showNotifications}
							<div class="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-800 rounded-lg shadow-2xl z-50">
								<div class="p-4 border-b border-gray-800">
									<h3 class="text-sm font-semibold text-white">Notifications</h3>
								</div>
								<div class="max-h-96 overflow-y-auto">
									{#if accountData?.openTrades?.length > 0}
										{#each accountData.openTrades.slice(0, 5) as trade}
											<div class="p-3 border-b border-gray-800 hover:bg-gray-800 transition-colors">
												<div class="flex items-start justify-between">
													<div class="flex-1">
														<div class="text-xs text-gray-400 mb-1">{formatDateTime(trade.openTime)}</div>
														<div class="text-sm text-white font-medium">{trade.symbol} {trade.type}</div>
														<div class="text-xs text-gray-500">Volume: {trade.volume}</div>
													</div>
													<div class="text-sm font-medium" class:text-green-400={trade.profit >= 0} class:text-red-400={trade.profit < 0}>
														{formatProfit(trade.profit)}
													</div>
												</div>
											</div>
										{/each}
									{:else}
										<div class="p-4 text-center text-gray-500 text-sm">No active notifications</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>
					
					<!-- Menu Toggle -->
					<button
						on:click={() => showMenu = !showMenu}
						class="p-2 hover:bg-gray-900 rounded-lg transition-colors"
						title="Menu"
					>
						<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	</header>

	<!-- Slide-out Menu -->
	{#if showMenu}
		<div class="fixed inset-0 z-50" on:click={() => showMenu = false}>
			<div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
			<div 
				class="absolute right-0 top-0 h-full w-80 bg-gradient-to-br from-gray-900 to-black border-l border-gray-800 shadow-2xl"
				on:click|stopPropagation
			>
				<!-- Menu Header -->
				<div class="p-6 border-b border-gray-800">
					<div class="flex items-center justify-between">
						<h2 class="text-xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); font-family: 'Orbitron', sans-serif;">MENU</h2>
						<button on:click={() => showMenu = false} class="p-2 hover:bg-gray-800 rounded-lg">
							<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
					{#if accountData}
						<div class="mt-4 p-3 bg-black rounded-lg border border-gray-800">
							<div class="text-xs text-gray-500 mb-1">Account</div>
							<div class="text-sm text-white font-medium">#{accountData.account.accountNumber}</div>
							<div class="text-xs" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">{accountData.account.broker}</div>
						</div>
					{/if}
				</div>
				
				<!-- Menu Items -->
				<nav class="p-4">
					<a href="/dashboard" class="flex items-center gap-3 p-3 mb-2 bg-gray-800 rounded-lg border border-[#D4AF37]">
						<svg class="w-5 h-5" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
						</svg>
						<span class="text-white font-medium">Dashboard</span>
					</a>
					
					<a href="/leaderboard" class="flex items-center gap-3 p-3 mb-2 hover:bg-gray-800 rounded-lg transition-colors">
						<svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
						</svg>
						<span class="text-gray-300">🏆 Leaderboard</span>
					</a>
					
					<button on:click={exportTrades} class="w-full flex items-center gap-3 p-3 mb-2 hover:bg-gray-800 rounded-lg transition-colors text-left">
						<svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						<span class="text-gray-300">Export Trades</span>
					</button>
					
					<button on:click={() => { showSettings = true; showMenu = false; }} class="w-full flex items-center gap-3 p-3 mb-2 hover:bg-gray-800 rounded-lg transition-colors text-left">
						<svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						<span class="text-gray-300">Bot Settings</span>
					</button>
					
					<a href="/connect" class="flex items-center gap-3 p-3 mb-2 hover:bg-gray-800 rounded-lg transition-colors">
						<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
						</svg>
						<span class="text-gray-300">Change Account</span>
					</a>
			<button on:click={loadAccountData} class="w-full flex items-center gap-3 p-3 mb-2 hover:bg-gray-800 rounded-lg transition-colors text-left">
				<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.5));">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
				<span class="text-gray-300">Refresh Data</span>
			</button>

			<!-- Admin & Super Admin Only -->
			{#if isAdmin}
			<a href="/admin" class="flex items-center gap-3 p-3 mb-2 hover:bg-gray-800 rounded-lg transition-colors">
				<svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
				</svg>
				<span class="text-gray-300">⚙️ Admin Panel</span>
			</a>

			<a href="/agents" class="flex items-center gap-3 p-3 mb-2 hover:bg-gray-800 rounded-lg transition-colors">
				<svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
				</svg>
				<span class="text-gray-300">🤖 Agent Control</span>
			</a>

			<a href="/docs/agent-setup" class="flex items-center gap-3 p-3 mb-2 hover:bg-gray-800 rounded-lg transition-colors">
				<svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
				</svg>
				<span class="text-gray-300">📚 Setup Guide</span>
			</a>

			<a href="/ib-partners" class="flex items-center gap-3 p-3 mb-2 hover:bg-gray-800 rounded-lg transition-colors">
				<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
				<span class="text-gray-300">🤝 IB Partners</span>
			</a>
			{/if}

			<!-- Leaderboard - Admin and IB only -->
			{#if isAdmin || isIB}
			<a href="/leaderboard" class="flex items-center gap-3 p-3 mb-2 hover:bg-gray-800 rounded-lg transition-colors">
				<svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
				</svg>
				<span class="text-gray-300">🏆 Leaderboard</span>
			</a>
			{/if}
				
				
				<div class="border-t border-gray-800 my-4"></div>					<button on:click={handleLogout} class="w-full flex items-center gap-3 p-3 hover:bg-red-900/20 border border-red-500/30 rounded-lg transition-colors text-left">
						<svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
						</svg>
						<span class="text-red-400 font-medium">Logout</span>
					</button>
				</nav>
				
				<!-- Menu Footer -->
				<div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-black">
					<div class="text-xs text-gray-500 text-center">
						<div class="mb-1" style="color: #9ca3af; text-shadow: 0 0 8px rgba(239, 68, 68, 0.5); font-family: 'Orbitron', sans-serif;">SCALPERIUM</div>
						<div class="text-gray-600">v1.0.0 • © 2025</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<main class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
		{#if loading}
			<div class="flex items-center justify-center h-64">
				<div class="text-xl" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">Loading...</div>
			</div>
		{:else if error}
			<div class="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg">
				{error}
			</div>
		{:else if accountData}
			<!-- Account Overview -->
			<div class="mb-6">
				<!-- Balance & Equity Banner -->
				<div class="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl p-6 border border-gray-800 shadow-2xl mb-4">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<!-- Balance -->
					<div>
						<div class="text-xs text-gray-500 mb-2 uppercase tracking-wider">Account Balance</div>
						<div class="text-3xl sm:text-4xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); font-family: 'Orbitron', sans-serif;">
							${accountData.account.balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
						</div>
						<div class="text-xs text-gray-600 mt-1">#{accountData.account.accountNumber}</div>
					</div>						<!-- Equity -->
						<div>
							<div class="text-xs text-gray-500 mb-2 uppercase tracking-wider">Current Equity</div>
							<div class="text-3xl sm:text-4xl font-bold text-blue-400">
								${accountData.account.equity.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
							</div>
							<div class="text-xs mt-1" class:text-green-400={(accountData.account.equity - accountData.account.balance) >= 0} class:text-red-400={(accountData.account.equity - accountData.account.balance) < 0}>
								{formatProfit(accountData.account.equity - accountData.account.balance)} floating P/L
							</div>
						</div>

						<!-- Margin Level -->
						<div>
							<div class="text-xs text-gray-500 mb-2 uppercase tracking-wider">Margin Level</div>
							<div class="text-3xl sm:text-4xl font-bold text-green-400">
								{accountData.account.marginLevel.toFixed(2)}%
							</div>
							<div class="text-xs text-gray-600 mt-1">
								Free: ${((accountData.account.equity - accountData.account.margin) || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
							</div>
						</div>
					</div>
				</div>

				<!-- Quick Stats -->
				<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
					<!-- Total P/L -->
					<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-4 border border-gray-800">
						<div class="text-xs text-gray-500 mb-1 uppercase tracking-wider">Total P/L</div>
						<div class="text-xl sm:text-2xl font-bold" class:text-green-400={totalProfit >= 0} class:text-red-400={totalProfit < 0}>
							{formatProfit(totalProfit)}
						</div>
					</div>

					<!-- Win Rate -->
					<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-4 border border-gray-800">
						<div class="text-xs text-gray-500 mb-1 uppercase tracking-wider">Win Rate</div>
						<div class="text-xl sm:text-2xl font-bold text-purple-400">
							{accountData.stats?.winRate || 0}%
						</div>
					</div>

					<!-- Open Positions -->
					<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-4 border border-green-800">
						<div class="text-xs text-gray-500 mb-1 uppercase tracking-wider">Open Trades</div>
						<div class="text-xl sm:text-2xl font-bold text-green-400">
							{openTradesCount}
						</div>
					</div>

					<!-- Profit Factor -->
					<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-4 border border-gray-800">
						<div class="text-xs text-gray-500 mb-1 uppercase tracking-wider">Profit Factor</div>
						<div class="text-xl sm:text-2xl font-bold text-blue-400">
							{accountData.stats?.profitFactor || 0}
						</div>
					</div>
				</div>
			</div>

			<!-- Filters -->
			<div class="bg-gradient-to-r from-gray-900 to-black rounded-xl p-4 mb-6 border border-gray-800 shadow-lg">
				<div class="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
					<!-- Trade Type Filter -->
					<div class="flex gap-2">
						<button
							on:click={() => tradeFilter = 'all'}
							class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
							class:bg-gradient-to-r={tradeFilter === 'all'}
							class:from-red-500={tradeFilter === 'all'}
					class:to-red-700={tradeFilter === 'all'}
					class:text-white={tradeFilter === 'all'}
							class:bg-gray-800={tradeFilter !== 'all'}
							class:text-gray-400={tradeFilter !== 'all'}
							class:hover:bg-gray-700={tradeFilter !== 'all'}
						>
							All ({openTradesCount + closedTradesCount})
						</button>
						<button
							on:click={() => tradeFilter = 'open'}
							class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
							class:bg-green-600={tradeFilter === 'open'}
							class:text-white={tradeFilter === 'open'}
							class:bg-gray-800={tradeFilter !== 'open'}
							class:text-gray-400={tradeFilter !== 'open'}
							class:hover:bg-gray-700={tradeFilter !== 'open'}
						>
							Open ({openTradesCount})
						</button>
						<button
							on:click={() => tradeFilter = 'closed'}
							class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
							class:bg-blue-600={tradeFilter === 'closed'}
							class:text-white={tradeFilter === 'closed'}
							class:bg-gray-800={tradeFilter !== 'closed'}
							class:text-gray-400={tradeFilter !== 'closed'}
							class:hover:bg-gray-700={tradeFilter !== 'closed'}
						>
							Closed ({closedTradesCount})
						</button>
					</div>

					<!-- Date Filter -->
					<div class="flex gap-2 flex-wrap">
						<button
							on:click={() => dateFilter = 'today'}
							class="px-3 py-2 rounded-lg text-sm transition-all"
							class:bg-gray-700={dateFilter === 'today'}
							class:text-white={dateFilter === 'today'}
							class:bg-gray-800={dateFilter !== 'today'}
							class:text-gray-400={dateFilter !== 'today'}
						>
							Today
						</button>
						<button
							on:click={() => dateFilter = 'week'}
							class="px-3 py-2 rounded-lg text-sm transition-all"
							class:bg-gray-700={dateFilter === 'week'}
							class:text-white={dateFilter === 'week'}
							class:bg-gray-800={dateFilter !== 'week'}
							class:text-gray-400={dateFilter !== 'week'}
						>
							Week
						</button>
						<button
							on:click={() => dateFilter = 'month'}
							class="px-3 py-2 rounded-lg text-sm transition-all"
							class:bg-gray-700={dateFilter === 'month'}
							class:text-white={dateFilter === 'month'}
							class:bg-gray-800={dateFilter !== 'month'}
							class:text-gray-400={dateFilter !== 'month'}
						>
							Month
						</button>
						<button
							on:click={() => dateFilter = 'all'}
							class="px-3 py-2 rounded-lg text-sm transition-all"
							class:bg-gray-700={dateFilter === 'all'}
							class:text-white={dateFilter === 'all'}
							class:bg-gray-800={dateFilter !== 'all'}
							class:text-gray-400={dateFilter !== 'all'}
						>
							All Time
						</button>
					</div>
				</div>
			</div>

			<!-- Trade Summary Stats -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-4 border border-gray-800">
					<div class="text-xs text-gray-500 mb-1 uppercase tracking-wider">Total Trades</div>
					<div class="text-2xl font-bold text-white">{filteredTrades.length}</div>
				</div>
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-4 border border-green-800">
					<div class="text-xs text-gray-500 mb-1 uppercase tracking-wider">Winners</div>
					<div class="text-2xl font-bold text-green-400">{winningTrades}</div>
				</div>
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-4 border border-red-800">
					<div class="text-xs text-gray-500 mb-1 uppercase tracking-wider">Losers</div>
					<div class="text-2xl font-bold text-red-400">{losingTrades}</div>
				</div>
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-4 border border-gray-800">
					<div class="text-xs text-gray-500 mb-1 uppercase tracking-wider">Avg P/L</div>
					<div class="text-2xl font-bold" class:text-green-400={averageProfit >= 0} class:text-red-400={averageProfit < 0}>
						{formatProfit(averageProfit)}
					</div>
				</div>
			</div>

			<!-- Open Trades Section -->
			{#if tradeFilter === 'all' || tradeFilter === 'open'}
				{#if accountData.openTrades && accountData.openTrades.length > 0}
					<div class="mb-6">
						<h2 class="text-xl font-bold mb-4" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); font-family: 'Orbitron', sans-serif;">
							Open Positions ({accountData.openTrades.length})
						</h2>
						<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-green-800 overflow-hidden">
							<div class="overflow-x-auto">
								<table class="w-full">
									<thead class="bg-gray-900 border-b border-green-800">
										<tr>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Symbol</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Volume</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Open Price</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Current</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">P/L</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-800">
										{#each accountData.openTrades as trade}
											<tr class="hover:bg-gray-900/50 transition-colors cursor-pointer" on:click={() => selectedTrade = trade}>
												<td class="px-4 py-3 text-sm font-medium text-white">{trade.symbol}</td>
												<td class="px-4 py-3 text-sm">
													<span 
														class="px-2 py-1 text-xs rounded font-medium"
														class:bg-green-900={trade.type === 'BUY' || trade.type === 'buy'}
														class:border={trade.type === 'BUY' || trade.type === 'buy'}
														class:border-green-500={trade.type === 'BUY' || trade.type === 'buy'}
														class:text-green-400={trade.type === 'BUY' || trade.type === 'buy'}
														class:bg-red-900={trade.type === 'SELL' || trade.type === 'sell'}
														class:border-red-500={trade.type === 'SELL' || trade.type === 'sell'}
														class:text-red-400={trade.type === 'SELL' || trade.type === 'sell'}
													>
														{trade.type?.toUpperCase()}
													</span>
												</td>
												<td class="px-4 py-3 text-sm text-white">{trade.volume}</td>
												<td class="px-4 py-3 text-sm text-white">{trade.openPrice}</td>
												<td class="px-4 py-3 text-sm text-white">{trade.currentPrice}</td>
												<td class="px-4 py-3 text-sm font-bold" class:text-green-400={trade.profit >= 0} class:text-red-400={trade.profit < 0}>
													{formatProfit(trade.profit)}
												</td>
												<td class="px-4 py-3 text-sm text-gray-400">{formatDateTime(trade.openTime)}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				{/if}
			{/if}

			<!-- Leaderboard Section -->
			{#if showLeaderboard}
				<div class="mb-6 bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-6">
					<div class="flex items-center justify-between mb-6">
						<h2 class="text-2xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); font-family: 'Orbitron', sans-serif;">
							🏆 TRADER LEADERBOARD
						</h2>
						<button 
							on:click={() => showLeaderboard = false}
							class="text-gray-400 hover:text-white transition-colors"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
					
					<!-- Period Tabs -->
					<div class="flex gap-2 mb-6">
						<button
							on:click={() => leaderboardPeriod = 'daily'}
							class="px-4 py-2 rounded-lg font-medium transition-all"
							class:bg-gradient-to-r={leaderboardPeriod === 'daily'}
							class:from-red-500={leaderboardPeriod === 'daily'}
							class:to-red-700={leaderboardPeriod === 'daily'}
							class:text-white={leaderboardPeriod === 'daily'}
							class:bg-gray-800={leaderboardPeriod !== 'daily'}
							class:text-gray-400={leaderboardPeriod !== 'daily'}
						>
							📅 Daily
						</button>
						<button
							on:click={() => leaderboardPeriod = 'weekly'}
							class="px-4 py-2 rounded-lg font-medium transition-all"
							class:bg-gradient-to-r={leaderboardPeriod === 'weekly'}
							class:from-red-500={leaderboardPeriod === 'weekly'}
							class:to-red-700={leaderboardPeriod === 'weekly'}
							class:text-white={leaderboardPeriod === 'weekly'}
							class:bg-gray-800={leaderboardPeriod !== 'weekly'}
							class:text-gray-400={leaderboardPeriod !== 'weekly'}
						>
							📊 Weekly
						</button>
						<button
							on:click={() => leaderboardPeriod = 'monthly'}
							class="px-4 py-2 rounded-lg font-medium transition-all"
							class:bg-gradient-to-r={leaderboardPeriod === 'monthly'}
							class:from-red-500={leaderboardPeriod === 'monthly'}
							class:to-red-700={leaderboardPeriod === 'monthly'}
							class:text-white={leaderboardPeriod === 'monthly'}
							class:bg-gray-800={leaderboardPeriod !== 'monthly'}
							class:text-gray-400={leaderboardPeriod !== 'monthly'}
						>
							📈 Monthly
						</button>
					</div>
					
					<!-- Leaderboard Table Component -->
					<LeaderboardTable 
						period={leaderboardPeriod} 
						showUserPosition={true} 
						limit={10}
						autoRefresh={true}
						refreshInterval={60000}
					/>
				</div>
			{/if}

			<!-- Closed Trades Section -->
			{#if tradeFilter === 'all' || tradeFilter === 'closed'}
				{#if accountData.closedTrades && accountData.closedTrades.length > 0}
					<div class="mb-6">
						<h2 class="text-xl font-bold mb-4" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); font-family: 'Orbitron', sans-serif;">
							Closed Trades ({filteredClosedTrades.length})
						</h2>
						<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-gray-800 overflow-hidden">
							<div class="overflow-x-auto">
								<table class="w-full">
									<thead class="bg-gray-900 border-b border-gray-800">
										<tr>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Symbol</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Volume</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Open</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Close</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">P/L</th>
											<th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-800">
										{#each filteredClosedTrades as trade}
											<tr class="hover:bg-gray-900/50 transition-colors cursor-pointer" on:click={() => selectedTrade = trade}>
												<td class="px-4 py-3 text-sm font-medium text-white">{trade.symbol}</td>
												<td class="px-4 py-3 text-sm">
													<span 
														class="px-2 py-1 text-xs rounded font-medium"
														class:bg-green-900={trade.type === 'BUY' || trade.type === 'buy'}
														class:border={trade.type === 'BUY' || trade.type === 'buy'}
														class:border-green-500={trade.type === 'BUY' || trade.type === 'buy'}
														class:text-green-400={trade.type === 'BUY' || trade.type === 'buy'}
														class:bg-red-900={trade.type === 'SELL' || trade.type === 'sell'}
														class:border-red-500={trade.type === 'SELL' || trade.type === 'sell'}
														class:text-red-400={trade.type === 'SELL' || trade.type === 'sell'}
													>
														{trade.type?.toUpperCase()}
													</span>
												</td>
												<td class="px-4 py-3 text-sm text-white">{trade.volume}</td>
												<td class="px-4 py-3 text-sm text-white">{trade.openPrice}</td>
												<td class="px-4 py-3 text-sm text-white">{trade.closePrice}</td>
												<td class="px-4 py-3 text-sm font-bold" class:text-green-400={trade.profit >= 0} class:text-red-400={trade.profit < 0}>
													{formatProfit(trade.profit)}
												</td>
												<td class="px-4 py-3 text-sm text-gray-400">{formatDateTime(trade.closeTime)}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				{/if}
			{/if}

			{#if filteredTrades.length === 0}
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-12 border border-gray-800 text-center">
					<div class="text-gray-500 text-lg mb-2">No trades found</div>
					<div class="text-gray-600 text-sm">Try adjusting your filters</div>
				</div>
			{/if}

			<!-- Bot Performance Stats -->
			{#if accountData.stats}
				<div class="mt-6 bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 border border-gray-800 shadow-lg">
					<h2 class="text-xl font-bold mb-4" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); font-family: 'Orbitron', sans-serif;">
						Performance Stats
					</h2>
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div>
							<div class="text-xs text-gray-500 mb-1 uppercase tracking-wider">Total Trades</div>
							<div class="text-2xl font-bold text-white">{accountData.stats.totalTrades}</div>
						</div>
						<div>
							<div class="text-xs text-gray-500 mb-1 uppercase tracking-wider">Winning Trades</div>
							<div class="text-2xl font-bold text-green-400">{accountData.stats.winningTrades}</div>
						</div>
						<div>
							<div class="text-xs text-gray-500 mb-1 uppercase tracking-wider">Profit Factor</div>
							<div class="text-2xl font-bold text-blue-400">{accountData.stats.profitFactor}</div>
						</div>
						<div>
							<div class="text-xs text-gray-500 mb-1 uppercase tracking-wider">Net Profit</div>
							<div class="text-2xl font-bold text-green-400">${accountData.stats.netProfit.toLocaleString()}</div>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</main>
</div>

<!-- Settings Modal -->
{#if showSettings}
	<div
		class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
		on:click={() => showSettings = false}
		on:keydown={(e) => e.key === 'Escape' && (showSettings = false)}
		role="button"
		tabindex="0"
	>
		<div
			class="bg-gradient-to-br from-gray-900 to-black rounded-2xl border-2 border-gray-800 max-w-md w-full shadow-2xl my-8 max-h-[90vh] flex flex-col"
			on:click|stopPropagation
			role="dialog"
			tabindex="-1"
		>
			<!-- Header (Fixed) -->
			<div class="flex items-start justify-between p-6 pb-4 border-b border-gray-800 flex-shrink-0">
				<h3 class="text-2xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); font-family: 'Orbitron', sans-serif;">Settings</h3>
				<button
					on:click={() => showSettings = false}
					class="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
				>
					×
				</button>
			</div>

			<!-- Scrollable Content -->
			<div class="space-y-6 p-6 overflow-y-auto flex-1">
				<!-- Traffic Light Safety System (Read-Only) -->
				<div class="bg-gray-900 rounded-lg p-4 border border-gray-800">
					<div class="flex items-center justify-between mb-3">
						<div class="text-sm font-medium text-gray-300">Safety Mode</div>
						<div class="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">Auto MT5</div>
					</div>
					<div class="flex items-center justify-around">
						<div
							class="flex flex-col items-center gap-2 p-2 rounded-lg transition-all cursor-not-allowed"
							class:bg-red-900={safetyMode === 'red'}
							class:bg-opacity-50={safetyMode === 'red'}
						>
							<div
								class="w-10 h-10 rounded-full transition-all"
								class:bg-red-600={safetyMode === 'red'}
								class:shadow-lg={safetyMode === 'red'}
								class:shadow-red-500={safetyMode === 'red'}
								class:bg-red-900={safetyMode !== 'red'}
								class:opacity-30={safetyMode !== 'red'}
							></div>
							<span class="text-xs text-gray-400">STOP</span>
						</div>

					<div
						class="flex flex-col items-center gap-2 p-2 rounded-lg transition-all cursor-not-allowed"
						class:bg-amber-900={safetyMode === 'orange'}
						class:bg-opacity-50={safetyMode === 'orange'}
					>
						<div
							class="w-10 h-10 rounded-full transition-all"
							class:bg-amber-500={safetyMode === 'orange'}
							class:shadow-lg={safetyMode === 'orange'}
							class:shadow-amber-500={safetyMode === 'orange'}
							class:bg-amber-950={safetyMode !== 'orange'}
							class:opacity-30={safetyMode !== 'orange'}
						></div>
						<span class="text-xs text-gray-400">CAUTION</span>
					</div>

					<div
						class="flex flex-col items-center gap-2 p-2 rounded-lg transition-all cursor-not-allowed"
						class:bg-green-900={safetyMode === 'green'}
						class:bg-opacity-50={safetyMode === 'green'}
					>
						<div
							class="w-10 h-10 rounded-full transition-all"
							class:bg-green-500={safetyMode === 'green'}
							class:shadow-lg={safetyMode === 'green'}
							class:shadow-green-500={safetyMode === 'green'}
							class:bg-green-900={safetyMode !== 'green'}
							class:opacity-30={safetyMode !== 'green'}
						></div>
						<span class="text-xs text-gray-400">SAFE</span>
					</div>
					</div>
				</div>

				<!-- Lot Size Calculator -->
				<div class="bg-gray-900 rounded-lg p-4 border border-gray-800">
					<div class="text-sm font-medium text-gray-300 mb-3">Position Sizing</div>
					<div class="space-y-3">
						<div class="flex justify-between items-center">
							<span class="text-sm text-gray-400">Current Equity</span>
							<span class="text-sm text-white font-medium">${accountData?.account?.equity.toLocaleString() || '0'}</span>
						</div>
						
						<!-- Max Lot Size (Adjustable) -->
						<div>
							<div class="flex justify-between items-center mb-2">
								<span class="text-sm text-gray-400">Max Lot Size</span>
								<div class="flex items-center gap-2">
									{#if winningStreak >= 3}
										<span class="text-xs px-2 py-0.5 bg-green-900/50 text-green-400 rounded border border-green-700 flex items-center gap-1">
											<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
												<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
											</svg>
											{winningStreak} Win Streak
										</span>
									{/if}
								</div>
							</div>
							<input 
								type="number" 
								bind:value={maxLotSize}
								min="0.01" 
								max="0.05" 
								step="0.01"
								class="w-full px-3 py-2 bg-gray-900 border rounded-lg text-white font-bold text-lg text-center transition-colors"
								class:border-green-500={getLotSizeColor(maxLotSize) === 'green'}
								class:border-amber-500={getLotSizeColor(maxLotSize) === 'orange'}
								class:border-gray-700={getLotSizeColor(maxLotSize) === 'default'}
								style="{getLotSizeColor(maxLotSize) === 'green' ? 'color: #10b981; text-shadow: 0 0 10px rgba(16, 185, 129, 0.5);' : getLotSizeColor(maxLotSize) === 'orange' ? 'color: #f97316; text-shadow: 0 0 10px rgba(249, 115, 22, 0.5);' : 'color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);'}"
							>
							<!-- Color Legend -->
							<div class="flex items-center justify-between text-xs mt-2 px-1">
								<div class="flex items-center gap-1">
									<div class="w-2 h-2 rounded-full bg-gray-600"></div>
									<span class="text-gray-500">0.01-0.09</span>
								</div>
								<div class="flex items-center gap-1">
									<div class="w-2 h-2 rounded-full bg-amber-500"></div>
									<span class="text-amber-400">0.10-0.49</span>
								</div>
								<div class="flex items-center gap-1">
									<div class="w-2 h-2 rounded-full bg-green-500"></div>
									<span class="text-green-400">0.50+</span>
								</div>
							</div>
						</div>
						
						<div class="text-xs text-gray-500 mt-2 p-2 bg-gray-800 rounded">
							<div class="flex items-center gap-1 mb-1">
								<svg class="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
								</svg>
								<span class="text-blue-400 font-medium">Auto-increases on winning streaks</span>
							</div>
							<div>Every 3 consecutive wins adds +0.01 lots (max 0.05)</div>
						</div>
					</div>
				</div>

				<!-- Manual Lot Size Override -->
				<div>
					<label class="block text-sm text-gray-400 mb-2">Override Lot Size (Optional)</label>
					<input 
						type="number" 
						min="0.01" 
						max={maxLotSize}
						step="0.01"
						placeholder="Auto (recommended)"
						class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
					>
					<p class="text-xs text-gray-500 mt-1">Leave empty for auto-calculation. Max: {maxLotSize.toFixed(2)} lots</p>
				</div>

			<!-- Max Loss (Auto-calculated) -->
			<div>
				<label class="block text-sm text-gray-400 mb-2 flex items-center justify-between">
					<span>Max Loss ($)</span>
					<span class="text-xs text-blue-400">Auto: ${maxLoss}</span>
				</label>
				<input 
					type="number" 
					bind:value={maxLoss}
					min="5" max="10" step="1"
					class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white font-semibold focus:border-red-500 focus:ring-2 focus:ring-red-500/50 border-red-700"
				>
				<p class="text-xs text-gray-500 mt-1">
					📊 Scales with lot size: 0.01 lot = $5 | 0.02 lot = $10 | 0.05 lot = $25
				</p>
				<p class="text-xs text-red-400 mt-1">⚠️ Bot auto-closes all trades when total loss reaches this amount</p>
			</div>

			<!-- Multi-Account Trading Selector -->
			<div class="bg-gray-900 rounded-lg p-4 border border-gray-800">
				<div class="flex items-center justify-between mb-3">
					<div>
						<div class="text-sm font-medium text-gray-300">Trading Accounts</div>
						<div class="text-xs text-gray-500 mt-1">Select which MT5 accounts to trade on (max 5)</div>
					</div>
					<button
						on:click={loadMT5Accounts}
						class="p-1 hover:bg-gray-800 rounded transition-colors"
						title="Refresh accounts"
					>
						<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
					</button>
				</div>

				{#if loadingAccounts}
					<div class="flex items-center justify-center py-8">
						<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
					</div>
				{:else if mt5Accounts.length === 0}
					<div class="text-center py-6 text-gray-500 text-sm">
						<svg class="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
						<p>No MT5 accounts found</p>
						<a href="/connect" class="text-red-400 hover:text-red-300 text-xs mt-2 inline-block">+ Add MT5 Account</a>
					</div>
				{:else}
					<div class="space-y-2">
						{#each mt5Accounts as account (account.id)}
							<div
								class="flex items-center justify-between p-3 rounded-lg transition-all"
								class:bg-green-900={account.isEnabledForTrading}
								class:bg-opacity-20={account.isEnabledForTrading}
								class:border-green-700={account.isEnabledForTrading}
								class:border={account.isEnabledForTrading}
								class:bg-gray-800={!account.isEnabledForTrading}
								class:bg-opacity-50={!account.isEnabledForTrading}
							>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<span class="text-sm font-medium text-white truncate">
											{account.broker} - {account.accountNumber}
										</span>
										{#if account.isEnabledForTrading}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-green-900/50 text-green-400 rounded text-xs border border-green-700">
												<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
												</svg>
												Active
											</span>
										{/if}
									</div>
									<div class="flex items-center gap-3 mt-1 text-xs text-gray-400">
										<span>{account.serverName}</span>
										<span>•</span>
										<span class:text-green-400={account.status === 'ACTIVE'} class:text-gray-500={account.status !== 'ACTIVE'}>
											{account.status}
										</span>
										{#if account.balance > 0}
											<span>•</span>
											<span>${account.balance.toLocaleString()}</span>
										{/if}
									</div>
								</div>
								<label class="relative inline-flex items-center cursor-pointer ml-3">
									<input
										type="checkbox"
										class="sr-only peer"
										checked={account.isEnabledForTrading}
										on:change={() => toggleAccount(account.id)}
									>
									<div class="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
								</label>
							</div>
						{/each}
					</div>

					<!-- Account Summary -->
					<div class="mt-3 p-2 bg-gray-800 rounded text-xs">
						<div class="flex items-center justify-between">
							<span class="text-gray-400">Active Trading Accounts:</span>
							<span class="text-white font-medium">{mt5Accounts.filter(a => a.isEnabledForTrading).length} / {mt5Accounts.length}</span>
						</div>
						{#if mt5Accounts.filter(a => a.isEnabledForTrading).length === 0}
							<p class="text-amber-400 mt-2 flex items-center gap-1">
								<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
								</svg>
								No accounts selected - algo will not start
							</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Refresh Rate -->
				<div>
					<label class="block text-sm text-gray-400 mb-2">Data Refresh Rate</label>
					<select class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white">
						<option value="1000">1 second (High CPU)</option>
						<option value="5000" selected>5 seconds (Default)</option>
						<option value="10000">10 seconds</option>
						<option value="30000">30 seconds</option>
					</select>
				</div>

				<!-- Notifications -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-400">Sound Alerts</span>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" class="sr-only peer" checked>
							<div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
						</label>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-400">Push Notifications</span>
						<label class="relative inline-flex items-center cursor-pointer">
							<input type="checkbox" class="sr-only peer">
							<div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
						</label>
					</div>
				</div>
			</div>

			<!-- Footer (Fixed) -->
			<div class="p-6 pt-4 border-t border-gray-800 flex-shrink-0">
				<div class="flex gap-3">
					<button
						on:click={() => showSettings = false}
						class="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all"
					>
						Cancel
					</button>
					<button
						on:click={saveBotSettings}
						class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
					>
						Save Changes
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Trade Detail Modal -->
{#if selectedTrade}
	<div 
		class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		on:click={() => selectedTrade = null}
		on:keydown={(e) => e.key === 'Escape' && (selectedTrade = null)}
		role="button"
		tabindex="0"
	>
		<div 
			class="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 border-2 max-w-md w-full shadow-2xl"
			class:border-green-500={selectedTrade.type === 'BUY' || selectedTrade.type === 'buy'}
			class:shadow-green-500={selectedTrade.type === 'BUY' || selectedTrade.type === 'buy'}
			class:border-red-500={selectedTrade.type === 'SELL' || selectedTrade.type === 'sell'}
			class:shadow-red-500={selectedTrade.type === 'SELL' || selectedTrade.type === 'sell'}
			on:click|stopPropagation
			role="dialog"
			tabindex="-1"
		>
			<div class="flex items-start justify-between mb-6">
				<div>
					<h3 class="text-2xl font-bold text-white mb-1">{selectedTrade.symbol}</h3>
					<p class="text-sm text-gray-400">{selectedTrade.ticket ? `#${selectedTrade.ticket}` : ''}</p>
				</div>
				<button 
					on:click={() => selectedTrade = null}
					class="text-gray-400 hover:text-white transition-colors text-2xl"
				>
					×
				</button>
			</div>

			<div class="space-y-4">
				<div class="flex justify-between py-3 border-b border-gray-800">
				<span class="text-gray-400">Type</span>
				<span 
					class="font-bold px-3 py-1 rounded"
					class:bg-green-900={selectedTrade.type === 'BUY' || selectedTrade.type === 'buy'}
					class:text-green-400={selectedTrade.type === 'BUY' || selectedTrade.type === 'buy'}
					class:bg-red-900={selectedTrade.type === 'SELL' || selectedTrade.type === 'sell'}
					class:text-red-400={selectedTrade.type === 'SELL' || selectedTrade.type === 'sell'}
					>
						{selectedTrade.type?.toUpperCase()}
					</span>
				</div>

				<div class="flex justify-between py-3 border-b border-gray-800">
					<span class="text-gray-400">Volume</span>
					<span class="text-white font-medium">{selectedTrade.volume}</span>
				</div>

				<div class="flex justify-between py-3 border-b border-gray-800">
					<span class="text-gray-400">Open Price</span>
					<span class="text-white font-medium">{selectedTrade.openPrice}</span>
				</div>

				{#if selectedTrade.currentPrice}
					<div class="flex justify-between py-3 border-b border-gray-800">
						<span class="text-gray-400">Current Price</span>
						<span class="text-white font-medium">{selectedTrade.currentPrice}</span>
					</div>
				{/if}

				{#if selectedTrade.closePrice}
					<div class="flex justify-between py-3 border-b border-gray-800">
						<span class="text-gray-400">Close Price</span>
						<span class="text-white font-medium">{selectedTrade.closePrice}</span>
					</div>
				{/if}

				<div class="flex justify-between py-3 border-b border-gray-800">
					<span class="text-gray-400">Open Time</span>
					<span class="text-white font-medium">{formatDateTime(selectedTrade.openTime)}</span>
				</div>

				{#if selectedTrade.closeTime}
					<div class="flex justify-between py-3 border-b border-gray-800">
						<span class="text-gray-400">Close Time</span>
						<span class="text-white font-medium">{formatDateTime(selectedTrade.closeTime)}</span>
					</div>
				{/if}

				<div class="flex justify-between items-center py-4 mt-4 bg-gray-900/50 rounded-lg px-4">
					<span class="text-lg text-gray-400">Profit/Loss</span>
					<span 
						class="text-3xl font-bold"
						class:text-green-400={selectedTrade.profit >= 0}
						class:text-red-400={selectedTrade.profit < 0}
					>
						{formatProfit(selectedTrade.profit)}
					</span>
				</div>
			</div>
		</div>
	</div>
{/if}
