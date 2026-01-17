<script lang="ts">
	import { onMount } from 'svelte';

	let agents: any[] = [];
	let loading = true;
	let error = '';

	// New agent form
	let vpsName = 'VPS-FOREX-01';
	let vpsRegion = 'London';
	let maxCapacity = 50;
	let registering = false;

	// Result display
	let newAgentResult: any = null;
	let showApiKey = false;

	onMount(async () => {
		await loadAgents();
	});

	async function loadAgents() {
		loading = true;
		try {
			const res = await fetch('/api/admin/agents/register');
			if (!res.ok) throw new Error('Failed to load agents');
			const data = await res.json();
			agents = data.agents || [];
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	async function registerAgent() {
		registering = true;
		error = '';
		newAgentResult = null;

		try {
			const res = await fetch('/api/admin/agents/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ vpsName, vpsRegion, maxCapacity })
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Registration failed');
			}

			newAgentResult = data;
			showApiKey = true;
			await loadAgents();
		} catch (e: any) {
			error = e.message;
		} finally {
			registering = false;
		}
	}

	function copyApiKey() {
		if (newAgentResult?.agent?.apiKey) {
			navigator.clipboard.writeText(newAgentResult.agent.apiKey);
			alert('API Key copied to clipboard!');
		}
	}
</script>

<svelte:head>
	<title>Agent Management - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-900 text-white p-8">
	<div class="max-w-4xl mx-auto">
		<h1 class="text-3xl font-bold mb-8">VPS Agent Management</h1>

		<!-- Register New Agent -->
		<div class="bg-gray-800 rounded-lg p-6 mb-8">
			<h2 class="text-xl font-semibold mb-4">Register New VPS Agent</h2>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
				<div>
					<label class="block text-sm text-gray-400 mb-1">VPS Name</label>
					<input
						type="text"
						bind:value={vpsName}
						class="w-full bg-gray-700 rounded px-3 py-2 text-white"
						placeholder="VPS-FOREX-01"
					/>
				</div>
				<div>
					<label class="block text-sm text-gray-400 mb-1">Region</label>
					<input
						type="text"
						bind:value={vpsRegion}
						class="w-full bg-gray-700 rounded px-3 py-2 text-white"
						placeholder="London"
					/>
				</div>
				<div>
					<label class="block text-sm text-gray-400 mb-1">Max Capacity</label>
					<input
						type="number"
						bind:value={maxCapacity}
						class="w-full bg-gray-700 rounded px-3 py-2 text-white"
						placeholder="50"
					/>
				</div>
			</div>

			<button
				on:click={registerAgent}
				disabled={registering || !vpsName}
				class="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-6 py-2 rounded font-medium"
			>
				{registering ? 'Registering...' : 'Register Agent'}
			</button>

			{#if error}
				<div class="mt-4 bg-red-900/50 border border-red-500 rounded p-3 text-red-300">
					{error}
				</div>
			{/if}
		</div>

		<!-- New Agent Result with API Key -->
		{#if newAgentResult && showApiKey}
			<div class="bg-green-900/30 border border-green-500 rounded-lg p-6 mb-8">
				<h3 class="text-lg font-semibold text-green-400 mb-2">Agent Registered Successfully!</h3>

				<div class="bg-gray-900 rounded p-4 mb-4">
					<p class="text-sm text-gray-400 mb-1">API Key (copy this - shown only once!):</p>
					<div class="flex items-center gap-2">
						<code class="flex-1 bg-gray-800 p-2 rounded text-green-400 text-sm break-all">
							{newAgentResult.agent.apiKey}
						</code>
						<button
							on:click={copyApiKey}
							class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm"
						>
							Copy
						</button>
					</div>
				</div>

				<div class="text-sm text-gray-300">
					<p class="font-medium mb-2">Next Steps:</p>
					<ol class="list-decimal list-inside space-y-1">
						<li>Copy the API key above</li>
						<li>Transfer <code class="bg-gray-800 px-1 rounded">scalperium-bundle.zip</code> to VPS</li>
						<li>Run the installer and paste the API key when prompted</li>
						<li>Agent will appear as "online" once connected</li>
					</ol>
				</div>

				<button
					on:click={() => showApiKey = false}
					class="mt-4 text-sm text-gray-400 hover:text-white"
				>
					Dismiss
				</button>
			</div>
		{/if}

		<!-- Registered Agents List -->
		<div class="bg-gray-800 rounded-lg p-6">
			<h2 class="text-xl font-semibold mb-4">Registered Agents</h2>

			{#if loading}
				<p class="text-gray-400">Loading...</p>
			{:else if agents.length === 0}
				<p class="text-gray-400">No agents registered yet.</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="text-left text-gray-400 border-b border-gray-700">
								<th class="pb-2">VPS Name</th>
								<th class="pb-2">Region</th>
								<th class="pb-2">Status</th>
								<th class="pb-2">Load</th>
								<th class="pb-2">Last Heartbeat</th>
							</tr>
						</thead>
						<tbody>
							{#each agents as agent}
								<tr class="border-b border-gray-700/50">
									<td class="py-3 font-medium">{agent.vpsName}</td>
									<td class="py-3 text-gray-400">{agent.vpsRegion || '-'}</td>
									<td class="py-3">
										<span class="px-2 py-1 rounded text-xs {agent.status === 'online' ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'}">
											{agent.status}
										</span>
									</td>
									<td class="py-3 text-gray-400">{agent.currentLoad} / {agent.maxCapacity}</td>
									<td class="py-3 text-gray-400">
										{agent.lastHeartbeat ? new Date(agent.lastHeartbeat).toLocaleString() : 'Never'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>
