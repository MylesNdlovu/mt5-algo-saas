<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Navigation from '$lib/components/Navigation.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	// Agent status types
	interface Agent {
		id: string;
		machineId: string;
		status: 'online' | 'offline' | 'error';
		lastHeartbeat: string;
		mt5Account: string;
		mt5Broker: string;
		mt5Version: string;
		userId: string | null;
		userName: string | null;
		userEmail: string | null;
		
		// EA Status
		eaLoaded: boolean;
		eaRunning: boolean;
		eaName: string | null;
		chartSymbol: string | null;
		chartTimeframe: string | null;
		
		// Trade Copier Status
		tradeCopierActive: boolean;
		isMasterAccount: boolean;
		masterAccountId: string | null;
		slavesCount: number;
		
		// Performance Metrics
		totalTrades: number;
		profitableTrades: number;
		losingTrades: number;
		totalProfit: number;
		winRate: number;
		
		// AI Learning Data
		indicatorSettings: {
			atrPeriod: number;
			atrMultiplier: number;
			greenThreshold: number;
			orangeThreshold: number;
			redThreshold: number;
		} | null;
		
		aiOptimizationScore: number;
		lastOptimized: string | null;
	}

	interface TradeHistory {
		id: string;
		agentId: string;
		ticket: number;
		symbol: string;
		type: 'BUY' | 'SELL';
		volume: number;
		openPrice: number;
		closePrice: number;
		openTime: string;
		closeTime: string;
		profit: number;
		indicatorSignal: 'GREEN' | 'ORANGE' | 'RED';
		atrValue: number;
		successful: boolean;
	}

	let agents: Agent[] = [];
	let selectedAgent: Agent | null = null;
	let showDetailsModal = false;
	let tradeHistory: TradeHistory[] = [];
	let loading = true;
	let filterStatus: 'all' | 'online' | 'offline' = 'all';
	let filterType: 'all' | 'master' | 'slave' = 'all';
	let searchQuery = '';

	// AI Optimization
	let showAIOptimization = false;
	let optimizationRunning = false;
	let optimizationResults: any = null;

	onMount(() => {
		loadAgents();
		// Refresh every 10 seconds
		const interval = setInterval(loadAgents, 10000);
		return () => clearInterval(interval);
	});

	async function loadAgents() {
		try {
			const res = await fetch('/api/agents');
			if (res.ok) {
				const data = await res.json();
				agents = data.agents;
			}
		} catch (error) {
			console.error('Failed to load agents:', error);
		} finally {
			loading = false;
		}
	}

	async function viewAgentDetails(agent: Agent) {
		selectedAgent = agent;
		showDetailsModal = true;
		
		// Load trade history for this agent
		try {
			const res = await fetch(`/api/agents/${agent.id}/trades`);
			if (res.ok) {
				const data = await res.json();
				tradeHistory = data.trades;
			}
		} catch (error) {
			console.error('Failed to load trade history:', error);
		}
	}

	async function sendCommand(agentId: string, command: string, params: any = {}) {
		try {
			const res = await fetch(`/api/agents/${agentId}/command`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ command, params })
			});
			
			if (res.ok) {
				alert('Command sent successfully!');
				loadAgents();
			} else {
				alert('Failed to send command');
			}
		} catch (error) {
			console.error('Command failed:', error);
			alert('Command failed');
		}
	}

	async function runAIOptimization(agentId: string) {
		optimizationRunning = true;
		showAIOptimization = true;
		
		try {
			const res = await fetch(`/api/agents/${agentId}/optimize`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});
			
			if (res.ok) {
				optimizationResults = await res.json();
			} else {
				alert('Optimization failed');
			}
		} catch (error) {
			console.error('Optimization failed:', error);
			alert('Optimization failed');
		} finally {
			optimizationRunning = false;
		}
	}

	async function applyOptimizedSettings(agentId: string, settings: any) {
		try {
			const res = await fetch(`/api/agents/${agentId}/apply-settings`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ settings })
			});
			
			if (res.ok) {
				alert('Settings applied successfully!');
				showAIOptimization = false;
				loadAgents();
			} else {
				alert('Failed to apply settings');
			}
		} catch (error) {
			console.error('Failed to apply settings:', error);
		}
	}

	function getStatusColor(status: string) {
		if (status === 'online') return 'bg-green-500';
		if (status === 'offline') return 'bg-gray-500';
		return 'bg-red-500';
	}

	$: filteredAgents = agents.filter(agent => {
		if (filterStatus !== 'all' && agent.status !== filterStatus) return false;
		if (filterType === 'master' && !agent.isMasterAccount) return false;
		if (filterType === 'slave' && agent.isMasterAccount) return false;
		if (searchQuery && !agent.userName?.toLowerCase().includes(searchQuery.toLowerCase()) &&
		    !agent.mt5Account.toLowerCase().includes(searchQuery.toLowerCase())) return false;
		return true;
	});
</script>

<Navigation user={data.user} />

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8">
	<!-- Header -->
	<div class="max-w-7xl mx-auto mb-8">
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-4xl font-bold mb-2 bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
					MT5 Agent Control Panel
				</h1>
				<p class="text-gray-400">Monitor and control all MT5 automation agents</p>
			</div>
			<button
				on:click={loadAgents}
				class="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg hover:from-blue-700 hover:to-blue-900 transition-all"
			>
				🔄 Refresh
			</button>
		</div>

		<!-- Download Agent Section -->
		<div class="mb-6 bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-6">
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<h2 class="text-2xl font-bold mb-3 flex items-center gap-2">
						<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
						</svg>
						Download MT5 Agent
					</h2>
					<p class="text-gray-400 mb-4">
						Install the SCALPERIUM automation agent on your Windows VPS to enable automated MT5 trading with AI-powered indicator optimization.
					</p>
					
					<!-- AI Learning Features -->
					<div class="bg-gray-900 border border-purple-500/30 rounded-lg p-4 mb-4">
						<h3 class="text-lg font-bold mb-2 text-purple-400 flex items-center gap-2">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
							</svg>
							AI Learning Capabilities
						</h3>
						<ul class="space-y-2 text-sm text-gray-300">
							<li class="flex items-start gap-2">
								<span class="text-green-500 font-bold mt-0.5">✓</span>
								<span><strong>Trade History Analysis:</strong> Agent continuously analyzes all executed trades, tracking which indicator signals (GREEN/ORANGE/RED) led to profitable vs losing trades.</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-green-500 font-bold mt-0.5">✓</span>
								<span><strong>ATR Correlation Learning:</strong> Identifies optimal ATR period and multiplier values that correlate with highest win rates across different market conditions.</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-green-500 font-bold mt-0.5">✓</span>
								<span><strong>Threshold Optimization:</strong> Automatically adjusts GREEN/ORANGE/RED thresholds based on profitable trade patterns to maximize signal accuracy.</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-green-500 font-bold mt-0.5">✓</span>
								<span><strong>Real-Time Adaptation:</strong> As more trades are executed, the AI refines indicator parameters every 24 hours to improve directional prediction for scalper EA entries.</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-green-500 font-bold mt-0.5">✓</span>
								<span><strong>Tick Data Predictability:</strong> Uses historical ATR and tick movement data to predict favorable entry conditions with 65-75% accuracy.</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-green-500 font-bold mt-0.5">✓</span>
								<span><strong>Dashboard Visualization:</strong> View AI optimization suggestions, expected win rate improvements, and apply optimized settings with one click from this panel.</span>
							</li>
						</ul>
					</div>

					<!-- System Requirements -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						<div>
							<h4 class="text-sm font-bold text-gray-400 mb-2">Requirements:</h4>
							<ul class="text-sm text-gray-500 space-y-1">
								<li>• Windows 10/11 or Windows Server</li>
								<li>• .NET 6.0 Runtime or later</li>
								<li>• MetaTrader 5 installed</li>
								<li>• Active SCALPERIUM account</li>
							</ul>
						</div>
						<div>
							<h4 class="text-sm font-bold text-gray-400 mb-2">Features:</h4>
							<ul class="text-sm text-gray-500 space-y-1">
								<li>• Real-time WebSocket connection</li>
								<li>• Automated chart & EA management</li>
								<li>• Trade copier (master/slave)</li>
								<li>• AI-powered optimization</li>
							</ul>
						</div>
					</div>
				</div>

				<!-- Download Buttons -->
				<div class="flex flex-col gap-3">
					<a
						href="/api/download/agent"
						class="px-6 py-3 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 rounded-lg font-bold text-center transition-all shadow-lg hover:shadow-red-500/50"
					>
						⬇️ Download Agent (.exe)
					</a>
					<a
						href="https://dotnet.microsoft.com/download/dotnet/6.0"
						target="_blank"
						class="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-center transition-all text-sm"
					>
						📦 Download .NET Runtime
					</a>
					<a
						href="/docs/agent-setup"
						target="_blank"
						class="px-6 py-3 bg-blue-900 hover:bg-blue-800 rounded-lg text-center transition-all text-sm"
					>
						📖 Setup Guide
					</a>
				</div>
			</div>
		</div>

		<!-- Filters -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
			<div>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search by user or MT5 account..."
					class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none"
				/>
			</div>
			
			<div>
				<select
					bind:value={filterStatus}
					class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none"
				>
					<option value="all">All Status</option>
					<option value="online">Online</option>
					<option value="offline">Offline</option>
				</select>
			</div>
			
			<div>
				<select
					bind:value={filterType}
					class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none"
				>
					<option value="all">All Types</option>
					<option value="master">Master Accounts</option>
					<option value="slave">Slave Accounts</option>
				</select>
			</div>
		</div>

		<!-- Stats Overview -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
			<div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
				<div class="text-gray-400 text-sm mb-1">Total Agents</div>
				<div class="text-3xl font-bold">{agents.length}</div>
			</div>
			<div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
				<div class="text-gray-400 text-sm mb-1">Online</div>
				<div class="text-3xl font-bold text-green-500">
					{agents.filter(a => a.status === 'online').length}
				</div>
			</div>
			<div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
				<div class="text-gray-400 text-sm mb-1">Master Accounts</div>
				<div class="text-3xl font-bold text-blue-500">
					{agents.filter(a => a.isMasterAccount).length}
				</div>
			</div>
			<div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
				<div class="text-gray-400 text-sm mb-1">Trade Copier Active</div>
				<div class="text-3xl font-bold text-purple-500">
					{agents.filter(a => a.tradeCopierActive).length}
				</div>
			</div>
		</div>
	</div>

	<!-- Agents List -->
	<div class="max-w-7xl mx-auto">
		{#if loading}
			<div class="text-center py-20">
				<div class="text-gray-400">Loading agents...</div>
			</div>
		{:else if filteredAgents.length === 0}
			<div class="text-center py-20">
				<div class="text-gray-400">No agents found</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4">
				{#each filteredAgents as agent}
					<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-red-500 transition-all">
						<div class="grid grid-cols-1 md:grid-cols-12 gap-4">
							<!-- Status Indicator -->
							<div class="md:col-span-1 flex items-center">
								<div class="relative">
									<div class="{getStatusColor(agent.status)} w-4 h-4 rounded-full"></div>
									{#if agent.status === 'online'}
										<div class="absolute top-0 left-0 w-4 h-4 bg-green-500 rounded-full animate-ping opacity-75"></div>
									{/if}
								</div>
							</div>

							<!-- Agent Info -->
							<div class="md:col-span-3">
								<div class="font-bold text-lg mb-1">
									{agent.userName || 'Unlinked Agent'}
								</div>
								<div class="text-sm text-gray-400">
									MT5: {agent.mt5Account} ({agent.mt5Broker})
								</div>
								<div class="text-xs text-gray-500">
									{agent.userEmail || 'No user linked'}
								</div>
							</div>

							<!-- EA Status -->
							<div class="md:col-span-2">
								<div class="text-xs text-gray-400 mb-1">EA Status</div>
								{#if agent.eaLoaded}
									<div class="flex items-center gap-2">
										<span class="text-green-500">✓</span>
										<span class="text-sm">{agent.eaName}</span>
									</div>
									<div class="text-xs text-gray-500">
										{agent.eaRunning ? '🟢 Running' : '⏸️ Stopped'}
									</div>
								{:else}
									<div class="text-sm text-gray-500">No EA loaded</div>
								{/if}
							</div>

							<!-- Chart Info -->
							<div class="md:col-span-2">
								<div class="text-xs text-gray-400 mb-1">Chart</div>
								{#if agent.chartSymbol}
									<div class="text-sm font-mono">{agent.chartSymbol}</div>
									<div class="text-xs text-gray-500">{agent.chartTimeframe}</div>
								{:else}
									<div class="text-sm text-gray-500">No chart open</div>
								{/if}
							</div>

							<!-- Trade Copier -->
							<div class="md:col-span-2">
								<div class="text-xs text-gray-400 mb-1">Trade Copier</div>
								{#if agent.isMasterAccount}
									<div class="text-sm text-blue-500">👑 Master</div>
									<div class="text-xs text-gray-500">{agent.slavesCount} slaves</div>
								{:else if agent.tradeCopierActive}
									<div class="text-sm text-purple-500">📋 Copying</div>
									<div class="text-xs text-gray-500">From master</div>
								{:else}
									<div class="text-sm text-gray-500">Inactive</div>
								{/if}
							</div>

							<!-- Performance -->
							<div class="md:col-span-2">
								<div class="text-xs text-gray-400 mb-1">Performance</div>
								<div class="text-sm font-bold {agent.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}">
									${agent.totalProfit.toFixed(2)}
								</div>
								<div class="text-xs text-gray-500">
									{agent.winRate.toFixed(1)}% win rate
								</div>
							</div>

							<!-- Actions -->
							<div class="md:col-span-12 flex gap-2 mt-2 flex-wrap">
								<button
									on:click={() => viewAgentDetails(agent)}
									class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-all"
								>
									📊 Details
								</button>
								
								{#if agent.status === 'online'}
									<button
										on:click={() => sendCommand(agent.id, 'GET_STATUS')}
										class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-all"
									>
										🔍 Status
									</button>
									
									{#if agent.eaLoaded}
										<button
											on:click={() => sendCommand(agent.id, agent.eaRunning ? 'STOP_EA' : 'START_EA')}
											class="px-3 py-1 {agent.eaRunning ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} rounded text-sm transition-all"
										>
											{agent.eaRunning ? '⏸️ Stop EA' : '▶️ Start EA'}
										</button>
									{/if}
									
									<button
										on:click={() => sendCommand(agent.id, 'TAKE_SCREENSHOT')}
										class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-all"
									>
										📸 Screenshot
									</button>
									
									{#if agent.totalTrades > 50}
										<button
											on:click={() => runAIOptimization(agent.id)}
											class="px-3 py-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 rounded text-sm transition-all"
											title="Analyze performance and view AI suggestions (indicators are synced from MT5)"
										>
											🤖 AI Analysis
										</button>
									{/if}
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Agent Details Modal -->
{#if showDetailsModal && selectedAgent}
	<div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
		<div class="bg-gray-900 border border-gray-700 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
			<div class="p-6 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-900 z-10">
				<h2 class="text-2xl font-bold">Agent Details - {selectedAgent.userName}</h2>
				<button
					on:click={() => showDetailsModal = false}
					class="text-gray-400 hover:text-white text-2xl"
				>×</button>
			</div>

			<div class="p-6">
				<!-- Agent Information -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
					<div>
						<h3 class="text-lg font-bold mb-4 text-red-500">Account Information</h3>
						<div class="space-y-2 text-sm">
							<div><span class="text-gray-400">MT5 Account:</span> {selectedAgent.mt5Account}</div>
							<div><span class="text-gray-400">Broker:</span> {selectedAgent.mt5Broker}</div>
							<div><span class="text-gray-400">MT5 Version:</span> {selectedAgent.mt5Version}</div>
							<div><span class="text-gray-400">User:</span> {selectedAgent.userName} ({selectedAgent.userEmail})</div>
							<div><span class="text-gray-400">Status:</span> 
								<span class="uppercase {selectedAgent.status === 'online' ? 'text-green-500' : 'text-gray-500'}">
									{selectedAgent.status}
								</span>
							</div>
							<div><span class="text-gray-400">Last Heartbeat:</span> {new Date(selectedAgent.lastHeartbeat).toLocaleString()}</div>
						</div>
					</div>

					<div>
						<h3 class="text-lg font-bold mb-4 text-blue-500">EA Configuration</h3>
						{#if selectedAgent.eaLoaded}
							<div class="space-y-2 text-sm">
								<div><span class="text-gray-400">EA Name:</span> {selectedAgent.eaName}</div>
								<div><span class="text-gray-400">Chart:</span> {selectedAgent.chartSymbol} {selectedAgent.chartTimeframe}</div>
								<div><span class="text-gray-400">Running:</span> {selectedAgent.eaRunning ? '✅ Yes' : '❌ No'}</div>
								
								{#if selectedAgent.indicatorSettings}
									<div class="mt-4">
										<div class="font-bold text-gray-300 mb-2">Indicator Settings:</div>
										<div class="bg-gray-800 p-3 rounded">
											<div>ATR Period: {selectedAgent.indicatorSettings.atrPeriod}</div>
											<div>ATR Multiplier: {selectedAgent.indicatorSettings.atrMultiplier}</div>
											<div>🟢 Green Threshold: {selectedAgent.indicatorSettings.greenThreshold}</div>
											<div>🟠 Orange Threshold: {selectedAgent.indicatorSettings.orangeThreshold}</div>
											<div>🔴 Red Threshold: {selectedAgent.indicatorSettings.redThreshold}</div>
										</div>
									</div>
								{/if}
							</div>
						{:else}
							<div class="text-gray-500">No EA currently loaded</div>
						{/if}
					</div>
				</div>

				<!-- Performance Stats -->
				<div class="mb-8">
					<h3 class="text-lg font-bold mb-4 text-green-500">Performance Statistics</h3>
					<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
						<div class="bg-gray-800 p-4 rounded-lg">
							<div class="text-gray-400 text-xs mb-1">Total Trades</div>
							<div class="text-2xl font-bold">{selectedAgent.totalTrades}</div>
						</div>
						<div class="bg-gray-800 p-4 rounded-lg">
							<div class="text-gray-400 text-xs mb-1">Profitable</div>
							<div class="text-2xl font-bold text-green-500">{selectedAgent.profitableTrades}</div>
						</div>
						<div class="bg-gray-800 p-4 rounded-lg">
							<div class="text-gray-400 text-xs mb-1">Losing</div>
							<div class="text-2xl font-bold text-red-500">{selectedAgent.losingTrades}</div>
						</div>
						<div class="bg-gray-800 p-4 rounded-lg">
							<div class="text-gray-400 text-xs mb-1">Win Rate</div>
							<div class="text-2xl font-bold">{selectedAgent.winRate.toFixed(1)}%</div>
						</div>
						<div class="bg-gray-800 p-4 rounded-lg">
							<div class="text-gray-400 text-xs mb-1">Total Profit</div>
							<div class="text-2xl font-bold {selectedAgent.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}">
								${selectedAgent.totalProfit.toFixed(2)}
							</div>
						</div>
					</div>
				</div>

				<!-- Trade History -->
				<div>
					<h3 class="text-lg font-bold mb-4 text-purple-500">Trade History</h3>
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead class="bg-gray-800">
								<tr>
									<th class="p-3 text-left">Ticket</th>
									<th class="p-3 text-left">Symbol</th>
									<th class="p-3 text-left">Type</th>
									<th class="p-3 text-left">Signal</th>
									<th class="p-3 text-right">Volume</th>
									<th class="p-3 text-right">Entry</th>
									<th class="p-3 text-right">Exit</th>
									<th class="p-3 text-right">Profit</th>
									<th class="p-3 text-left">Time</th>
								</tr>
							</thead>
							<tbody>
								{#each tradeHistory as trade}
									<tr class="border-b border-gray-800 hover:bg-gray-800">
										<td class="p-3">{trade.ticket}</td>
										<td class="p-3 font-mono">{trade.symbol}</td>
										<td class="p-3">
											<span class="{trade.type === 'BUY' ? 'text-green-500' : 'text-red-500'}">
												{trade.type}
											</span>
										</td>
										<td class="p-3">
											{#if trade.indicatorSignal === 'GREEN'}
												<span class="text-green-500">🟢 GREEN</span>
											{:else if trade.indicatorSignal === 'ORANGE'}
												<span class="text-orange-500">🟠 ORANGE</span>
											{:else}
												<span class="text-red-500">🔴 RED</span>
											{/if}
										</td>
										<td class="p-3 text-right">{trade.volume}</td>
										<td class="p-3 text-right font-mono">{trade.openPrice.toFixed(2)}</td>
										<td class="p-3 text-right font-mono">{trade.closePrice.toFixed(2)}</td>
										<td class="p-3 text-right font-bold {trade.profit >= 0 ? 'text-green-500' : 'text-red-500'}">
											${trade.profit.toFixed(2)}
										</td>
										<td class="p-3 text-xs">{new Date(trade.closeTime).toLocaleString()}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- AI Optimization Modal -->
{#if showAIOptimization}
	<div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
		<div class="bg-gray-900 border border-gray-700 rounded-lg max-w-4xl w-full">
			<div class="p-6 border-b border-gray-700 flex items-center justify-between">
				<div>
					<h2 class="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
						🤖 AI Performance Analysis
					</h2>
					<p class="text-sm text-gray-400 mt-1">View AI suggestions (Indicators auto-sync from MT5)</p>
				</div>
				<button
					on:click={() => showAIOptimization = false}
					class="text-gray-400 hover:text-white text-2xl"
				>×</button>
			</div>

			<div class="p-6">
				{#if optimizationRunning}
					<div class="text-center py-12">
						<div class="text-xl mb-4">Analyzing trade history...</div>
						<div class="text-gray-400">Evaluating performance patterns for reference</div>
						<div class="mt-6">
							<div class="w-full bg-gray-800 rounded-full h-2">
								<div class="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full animate-pulse" style="width: 60%"></div>
							</div>
						</div>
					</div>
				{:else if optimizationResults}
					<div>
						<div class="mb-6">
							<h3 class="text-lg font-bold mb-2">Performance Analysis Results</h3>
							<div class="text-sm text-gray-400">
								Analyzed {optimizationResults.tradesAnalyzed} trades
							</div>
						</div>

						<div class="grid grid-cols-2 gap-6 mb-6">
							<div>
								<h4 class="font-bold mb-3 text-gray-300">Current Settings</h4>
								<div class="bg-gray-800 p-4 rounded space-y-2 text-sm">
									<div>ATR Period: {optimizationResults.currentSettings.atrPeriod}</div>
									<div>ATR Multiplier: {optimizationResults.currentSettings.atrMultiplier}</div>
									<div>🟢 Green: {optimizationResults.currentSettings.greenThreshold}</div>
									<div>🟠 Orange: {optimizationResults.currentSettings.orangeThreshold}</div>
									<div>🔴 Red: {optimizationResults.currentSettings.redThreshold}</div>
									<div class="pt-2 border-t border-gray-700">
										Win Rate: {optimizationResults.currentWinRate}%
									</div>
								</div>
							</div>

							<div>
								<h4 class="font-bold mb-3 text-green-400">AI Suggested Settings (Reference Only)</h4>
								<div class="bg-gradient-to-br from-green-900 to-blue-900 p-4 rounded space-y-2 text-sm">
									<div>ATR Period: {optimizationResults.optimizedSettings.atrPeriod}</div>
									<div>ATR Multiplier: {optimizationResults.optimizedSettings.atrMultiplier}</div>
									<div>🟢 Green: {optimizationResults.optimizedSettings.greenThreshold}</div>
									<div>🟠 Orange: {optimizationResults.optimizedSettings.orangeThreshold}</div>
									<div>🔴 Red: {optimizationResults.optimizedSettings.redThreshold}</div>
									<div class="pt-2 border-t border-green-700">
										Expected Win Rate: {optimizationResults.optimizedWinRate}%
										<span class="text-green-400">
											(+{(optimizationResults.optimizedWinRate - optimizationResults.currentWinRate).toFixed(1)}%)
										</span>
									</div>
								</div>
							</div>
						</div>

						<div class="mb-6">
							<h4 class="font-bold mb-3 text-gray-300">AI Insights</h4>
							<div class="bg-gray-800 p-4 rounded space-y-2 text-sm">
								{#each optimizationResults.insights as insight}
									<div class="flex items-start gap-2">
										<span class="text-blue-500">•</span>
										<span>{insight}</span>
									</div>
								{/each}
							</div>
						</div>

						<div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
							<p class="text-sm text-blue-400">
								ℹ️ <strong>Note:</strong> Indicator settings are automatically synced from your MT5 custom indicator via the C# agent.
								These AI suggestions are for reference only and cannot be manually applied.
							</p>
						</div>

						<div class="flex justify-end">
							<button
								on:click={() => showAIOptimization = false}
								class="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all"
							>
								Close
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
