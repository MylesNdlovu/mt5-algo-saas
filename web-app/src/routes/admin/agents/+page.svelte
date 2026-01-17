<script lang="ts">
	import { onMount } from 'svelte';
	import Navigation from '$lib/components/Navigation.svelte';

	interface Agent {
		id: string;
		vpsName: string;
		vpsRegion: string | null;
		status: string;
		currentLoad: number;
		maxCapacity: number;
		lastHeartbeat: string | null;
		cpuUsage: number | null;
		memoryUsage: number | null;
		diskUsage: number | null;
		createdAt: string;
	}

	let agents: Agent[] = [];
	let loading = true;
	let error = '';

	// New agent form
	let showRegisterForm = false;
	let vpsName = '';
	let vpsRegion = 'London';
	let maxCapacity = 50;
	let registering = false;

	// Result display
	let newAgentResult: any = null;
	let showApiKey = false;

	// Delete confirmation
	let deleteConfirm: string | null = null;
	let deleting = false;

	// Stats
	let stats = {
		total: 0,
		online: 0,
		offline: 0,
		totalCapacity: 0,
		totalLoad: 0
	};

	onMount(async () => {
		await loadAgents();
		// Auto-refresh every 30 seconds
		const interval = setInterval(loadAgents, 30000);
		return () => clearInterval(interval);
	});

	async function loadAgents() {
		try {
			const res = await fetch('/api/admin/agents/register');
			if (!res.ok) throw new Error('Failed to load agents');
			const data = await res.json();
			agents = data.agents || [];

			// Calculate stats
			stats.total = agents.length;
			stats.online = agents.filter(a => a.status === 'online').length;
			stats.offline = agents.filter(a => a.status !== 'online').length;
			stats.totalCapacity = agents.reduce((sum, a) => sum + (a.maxCapacity || 0), 0);
			stats.totalLoad = agents.reduce((sum, a) => sum + (a.currentLoad || 0), 0);
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	async function registerAgent() {
		if (!vpsName.trim()) {
			error = 'VPS Name is required';
			return;
		}

		registering = true;
		error = '';
		newAgentResult = null;

		try {
			const res = await fetch('/api/admin/agents/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ vpsName: vpsName.trim(), vpsRegion, maxCapacity })
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Registration failed');
			}

			newAgentResult = data;
			showApiKey = true;
			showRegisterForm = false;
			vpsName = '';
			await loadAgents();
		} catch (e: any) {
			error = e.message;
		} finally {
			registering = false;
		}
	}

	async function deleteAgent(agentId: string) {
		deleting = true;
		try {
			const res = await fetch(`/api/admin/agents/${agentId}`, {
				method: 'DELETE'
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to delete agent');
			}
			deleteConfirm = null;
			await loadAgents();
		} catch (e: any) {
			error = e.message;
		} finally {
			deleting = false;
		}
	}

	function copyApiKey() {
		if (newAgentResult?.agent?.apiKey) {
			navigator.clipboard.writeText(newAgentResult.agent.apiKey);
		}
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'online': return 'bg-green-500';
			case 'offline': return 'bg-gray-500';
			case 'error': return 'bg-red-500';
			default: return 'bg-yellow-500';
		}
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();

		if (diff < 60000) return 'Just now';
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
		return date.toLocaleDateString();
	}
</script>

<svelte:head>
	<title>VPS Agents - Admin</title>
</svelte:head>

<Navigation />

<div class="min-h-screen bg-gray-900 text-white pt-16">
	<div class="max-w-7xl mx-auto px-4 py-8">
		<!-- Header -->
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-3xl font-bold">VPS Agent Management</h1>
				<p class="text-gray-400 mt-1">Manage your trading server fleet</p>
			</div>
			<button
				on:click={() => showRegisterForm = !showRegisterForm}
				class="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-medium flex items-center gap-2"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Register New Agent
			</button>
		</div>

		<!-- Stats Cards -->
		<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
			<div class="bg-gray-800 rounded-lg p-4">
				<p class="text-gray-400 text-sm">Total Agents</p>
				<p class="text-2xl font-bold">{stats.total}</p>
			</div>
			<div class="bg-gray-800 rounded-lg p-4">
				<p class="text-gray-400 text-sm">Online</p>
				<p class="text-2xl font-bold text-green-400">{stats.online}</p>
			</div>
			<div class="bg-gray-800 rounded-lg p-4">
				<p class="text-gray-400 text-sm">Offline</p>
				<p class="text-2xl font-bold text-gray-400">{stats.offline}</p>
			</div>
			<div class="bg-gray-800 rounded-lg p-4">
				<p class="text-gray-400 text-sm">Total Capacity</p>
				<p class="text-2xl font-bold">{stats.totalCapacity}</p>
			</div>
			<div class="bg-gray-800 rounded-lg p-4">
				<p class="text-gray-400 text-sm">Current Load</p>
				<p class="text-2xl font-bold text-blue-400">{stats.totalLoad}</p>
			</div>
		</div>

		<!-- Error Display -->
		{#if error}
			<div class="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6 flex justify-between items-center">
				<span class="text-red-300">{error}</span>
				<button on:click={() => error = ''} class="text-red-400 hover:text-white">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		{/if}

		<!-- Register Form -->
		{#if showRegisterForm}
			<div class="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
				<h2 class="text-xl font-semibold mb-4">Register New VPS Agent</h2>
				<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div>
						<label class="block text-sm text-gray-400 mb-1">VPS Name *</label>
						<input
							type="text"
							bind:value={vpsName}
							class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none"
							placeholder="VPS-FOREX-01"
						/>
					</div>
					<div>
						<label class="block text-sm text-gray-400 mb-1">Region</label>
						<select
							bind:value={vpsRegion}
							class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none"
						>
							<option value="London">London</option>
							<option value="New York">New York</option>
							<option value="Tokyo">Tokyo</option>
							<option value="Singapore">Singapore</option>
							<option value="Frankfurt">Frankfurt</option>
							<option value="Amsterdam">Amsterdam</option>
						</select>
					</div>
					<div>
						<label class="block text-sm text-gray-400 mb-1">Max Capacity</label>
						<input
							type="number"
							bind:value={maxCapacity}
							min="1"
							max="100"
							class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none"
						/>
					</div>
					<div class="flex items-end gap-2">
						<button
							on:click={registerAgent}
							disabled={registering || !vpsName.trim()}
							class="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-medium"
						>
							{registering ? 'Registering...' : 'Register'}
						</button>
						<button
							on:click={() => showRegisterForm = false}
							class="px-4 py-2 rounded-lg border border-gray-600 hover:border-gray-500"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- API Key Display -->
		{#if newAgentResult && showApiKey}
			<div class="bg-green-900/30 border border-green-500 rounded-lg p-6 mb-8">
				<div class="flex justify-between items-start">
					<h3 class="text-lg font-semibold text-green-400">Agent Registered Successfully!</h3>
					<button on:click={() => showApiKey = false} class="text-gray-400 hover:text-white">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<div class="bg-gray-900 rounded-lg p-4 mt-4">
					<p class="text-sm text-gray-400 mb-2">API Key (copy this - shown only once!):</p>
					<div class="flex items-center gap-2">
						<code class="flex-1 bg-gray-800 p-3 rounded-lg text-green-400 font-mono text-sm break-all select-all">
							{newAgentResult.agent.apiKey}
						</code>
						<button
							on:click={copyApiKey}
							class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium"
						>
							Copy
						</button>
					</div>
				</div>

				<div class="mt-4 text-sm text-gray-300">
					<p class="font-medium mb-2">Next Steps:</p>
					<ol class="list-decimal list-inside space-y-1 text-gray-400">
						<li>Copy the API key above</li>
						<li>Transfer <code class="bg-gray-800 px-1.5 py-0.5 rounded">scalperium-bundle.zip</code> to your VPS</li>
						<li>Run the installer and paste the API key when prompted</li>
						<li>Agent will appear as "online" once connected</li>
					</ol>
				</div>
			</div>
		{/if}

		<!-- Agents Table -->
		<div class="bg-gray-800 rounded-lg overflow-hidden">
			<div class="p-4 border-b border-gray-700 flex justify-between items-center">
				<h2 class="text-xl font-semibold">Registered Agents</h2>
				<button
					on:click={loadAgents}
					class="text-gray-400 hover:text-white flex items-center gap-1 text-sm"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
					Refresh
				</button>
			</div>

			{#if loading}
				<div class="p-8 text-center text-gray-400">
					<div class="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full mx-auto mb-2"></div>
					Loading agents...
				</div>
			{:else if agents.length === 0}
				<div class="p-8 text-center text-gray-400">
					<svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
					</svg>
					<p>No agents registered yet.</p>
					<p class="text-sm mt-1">Click "Register New Agent" to get started.</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="bg-gray-900/50">
							<tr class="text-left text-gray-400">
								<th class="px-4 py-3">Status</th>
								<th class="px-4 py-3">VPS Name</th>
								<th class="px-4 py-3">Region</th>
								<th class="px-4 py-3">Load</th>
								<th class="px-4 py-3">System</th>
								<th class="px-4 py-3">Last Heartbeat</th>
								<th class="px-4 py-3">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each agents as agent}
								<tr class="border-t border-gray-700/50 hover:bg-gray-700/30">
									<td class="px-4 py-3">
										<div class="flex items-center gap-2">
											<div class="w-2 h-2 rounded-full {getStatusColor(agent.status)}"></div>
											<span class="capitalize {agent.status === 'online' ? 'text-green-400' : 'text-gray-400'}">
												{agent.status}
											</span>
										</div>
									</td>
									<td class="px-4 py-3 font-medium">{agent.vpsName}</td>
									<td class="px-4 py-3 text-gray-400">{agent.vpsRegion || '-'}</td>
									<td class="px-4 py-3">
										<div class="flex items-center gap-2">
											<div class="w-20 bg-gray-700 rounded-full h-2">
												<div
													class="h-2 rounded-full {(agent.currentLoad / agent.maxCapacity) > 0.8 ? 'bg-red-500' : (agent.currentLoad / agent.maxCapacity) > 0.5 ? 'bg-yellow-500' : 'bg-green-500'}"
													style="width: {Math.min((agent.currentLoad / agent.maxCapacity) * 100, 100)}%"
												></div>
											</div>
											<span class="text-gray-400 text-xs">{agent.currentLoad}/{agent.maxCapacity}</span>
										</div>
									</td>
									<td class="px-4 py-3 text-gray-400 text-xs">
										{#if agent.cpuUsage !== null}
											<div>CPU: {agent.cpuUsage}%</div>
											<div>MEM: {agent.memoryUsage}%</div>
										{:else}
											<span class="text-gray-500">-</span>
										{/if}
									</td>
									<td class="px-4 py-3 text-gray-400">{formatDate(agent.lastHeartbeat)}</td>
									<td class="px-4 py-3">
										{#if deleteConfirm === agent.id}
											<div class="flex items-center gap-2">
												<button
													on:click={() => deleteAgent(agent.id)}
													disabled={deleting}
													class="text-red-400 hover:text-red-300 text-xs"
												>
													{deleting ? 'Deleting...' : 'Confirm'}
												</button>
												<button
													on:click={() => deleteConfirm = null}
													class="text-gray-400 hover:text-white text-xs"
												>
													Cancel
												</button>
											</div>
										{:else}
											<button
												on:click={() => deleteConfirm = agent.id}
												class="text-gray-400 hover:text-red-400"
												title="Delete agent"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
											</button>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>

		<!-- Info Section -->
		<div class="mt-8 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
			<h3 class="font-semibold mb-3">About VPS Agents</h3>
			<ul class="text-sm text-gray-400 space-y-2">
				<li>Each VPS agent can manage multiple MT5 terminal instances</li>
				<li>Agents automatically provision new user accounts when they register</li>
				<li>The traffic light indicator (RED/ORANGE/GREEN) is synced to user dashboards</li>
				<li>Agents send heartbeats every 5 seconds to report status</li>
			</ul>
		</div>
	</div>
</div>
