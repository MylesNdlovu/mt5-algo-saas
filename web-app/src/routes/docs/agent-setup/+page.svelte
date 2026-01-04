<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Navigation from '$lib/components/Navigation.svelte';

	let activeTab = 'download';
	let showApiKey = false;
	let apiKey = '';

	onMount(async () => {
		// Generate or fetch user's API key
		try {
			const res = await fetch('/api/agents/api-key');
			if (res.ok) {
				const data = await res.json();
				apiKey = data.apiKey;
			}
		} catch (error) {
			console.error('Failed to fetch API key:', error);
		}
	});

	function copyApiKey() {
		navigator.clipboard.writeText(apiKey);
		alert('API Key copied to clipboard!');
	}

	function regenerateApiKey() {
		if (confirm('Are you sure you want to regenerate your API key? This will invalidate the old key and disconnect all active agents.')) {
			// TODO: Implement API key regeneration
			alert('API key regeneration not yet implemented');
		}
	}
</script>

<svelte:head>
	<title>Agent Setup - SCALPERIUM</title>
</svelte:head>

<Navigation />

<div class="min-h-screen bg-black text-white p-8">
	<div class="max-w-5xl mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<button
				on:click={() => goto('/agents')}
				class="mb-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all"
			>
				← Back to Agents
			</button>
			<h1 class="text-4xl font-bold mb-2 bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
				Agent Setup Guide
			</h1>
			<p class="text-gray-400">Install and configure the SCALPERIUM MT5 automation agent</p>
		</div>

		<!-- Tabs -->
		<div class="flex gap-2 mb-6 border-b border-gray-800">
			<button
				on:click={() => activeTab = 'download'}
				class="px-6 py-3 {activeTab === 'download' ? 'border-b-2 border-red-500 text-white' : 'text-gray-500'} transition-all"
			>
				1. Download
			</button>
			<button
				on:click={() => activeTab = 'install'}
				class="px-6 py-3 {activeTab === 'install' ? 'border-b-2 border-red-500 text-white' : 'text-gray-500'} transition-all"
			>
				2. Install
			</button>
			<button
				on:click={() => activeTab = 'configure'}
				class="px-6 py-3 {activeTab === 'configure' ? 'border-b-2 border-red-500 text-white' : 'text-gray-500'} transition-all"
			>
				3. Configure
			</button>
			<button
				on:click={() => activeTab = 'service'}
				class="px-6 py-3 {activeTab === 'service' ? 'border-b-2 border-red-500 text-white' : 'text-gray-500'} transition-all"
			>
				4. Windows Service
			</button>
			<button
				on:click={() => activeTab = 'ai'}
				class="px-6 py-3 {activeTab === 'ai' ? 'border-b-2 border-red-500 text-white' : 'text-gray-500'} transition-all"
			>
				5. AI Learning
			</button>
		</div>

		<!-- Tab Content -->
		<div class="bg-gray-900 rounded-lg p-8 border border-gray-800">
			{#if activeTab === 'download'}
				<h2 class="text-2xl font-bold mb-6">Download Required Software</h2>
				
				<div class="space-y-6">
					<!-- Agent Download -->
					<div class="bg-gray-800 rounded-lg p-6">
						<h3 class="text-xl font-bold mb-3 flex items-center gap-2">
							<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
							</svg>
							SCALPERIUM MT5 Agent
						</h3>
						<p class="text-gray-400 mb-4">
							Automated trading agent with AI-powered indicator optimization.
						</p>
						<a
							href="/api/download/agent"
							class="inline-block px-6 py-3 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 rounded-lg font-bold transition-all shadow-lg"
						>
							⬇️ Download Agent (Windows .exe)
						</a>
					</div>

					<!-- .NET Runtime -->
					<div class="bg-gray-800 rounded-lg p-6">
						<h3 class="text-xl font-bold mb-3 flex items-center gap-2">
							<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
							</svg>
							.NET 6.0 Runtime
						</h3>
						<p class="text-gray-400 mb-4">
							Required to run the agent. Only needed if you don't have .NET installed.
						</p>
						<a
							href="https://dotnet.microsoft.com/download/dotnet/6.0"
							target="_blank"
							class="inline-block px-6 py-3 bg-blue-900 hover:bg-blue-800 rounded-lg font-bold transition-all"
						>
							📦 Download .NET Runtime
						</a>
					</div>

					<!-- MetaTrader 5 -->
					<div class="bg-gray-800 rounded-lg p-6">
						<h3 class="text-xl font-bold mb-3 flex items-center gap-2">
							<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
							</svg>
							MetaTrader 5
						</h3>
						<p class="text-gray-400 mb-4">
							Trading platform. Download from your broker or MetaQuotes official site.
						</p>
						<a
							href="https://www.metatrader5.com/en/download"
							target="_blank"
							class="inline-block px-6 py-3 bg-green-900 hover:bg-green-800 rounded-lg font-bold transition-all"
						>
							📈 Download MT5
						</a>
					</div>
				</div>

			{:else if activeTab === 'install'}
				<h2 class="text-2xl font-bold mb-6">Installation Steps</h2>
				
				<div class="space-y-6">
					<div class="flex gap-4">
						<div class="flex-shrink-0 w-12 h-12 bg-red-600 rounded-full flex items-center justify-center font-bold text-xl">
							1
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-bold mb-2">Create Installation Folder</h3>
							<div class="bg-black rounded p-4 font-mono text-sm mb-2">
								<code>mkdir C:\SCALPERIUM</code>
							</div>
							<p class="text-gray-400 text-sm">Create a dedicated folder for the agent files.</p>
						</div>
					</div>

					<div class="flex gap-4">
						<div class="flex-shrink-0 w-12 h-12 bg-red-600 rounded-full flex items-center justify-center font-bold text-xl">
							2
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-bold mb-2">Move Agent Executable</h3>
							<div class="bg-black rounded p-4 font-mono text-sm mb-2">
								<code>Move downloaded SCALPERIUM-MT5-Agent.exe to C:\SCALPERIUM\</code>
							</div>
							<p class="text-gray-400 text-sm">Place the downloaded agent in the installation folder.</p>
						</div>
					</div>

					<div class="flex gap-4">
						<div class="flex-shrink-0 w-12 h-12 bg-red-600 rounded-full flex items-center justify-center font-bold text-xl">
							3
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-bold mb-2">Verify MT5 Installation</h3>
							<p class="text-gray-400 mb-2">Ensure MetaTrader 5 is:</p>
							<ul class="list-disc list-inside text-gray-400 space-y-1">
								<li>Installed and logged in with your broker credentials</li>
								<li>Expert Advisors enabled (Tools → Options → Expert Advisors)</li>
								<li>"Allow automated trading" checkbox enabled</li>
								<li>"Allow DLL imports" checkbox enabled</li>
							</ul>
						</div>
					</div>

					<div class="flex gap-4">
						<div class="flex-shrink-0 w-12 h-12 bg-red-600 rounded-full flex items-center justify-center font-bold text-xl">
							4
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-bold mb-2">First Run Test</h3>
							<div class="bg-black rounded p-4 font-mono text-sm mb-2">
								<code>cd C:\SCALPERIUM<br>.\SCALPERIUM-MT5-Agent.exe</code>
							</div>
							<p class="text-gray-400 text-sm">Test run the agent. You should see connection messages in the console.</p>
						</div>
					</div>
				</div>

			{:else if activeTab === 'configure'}
				<h2 class="text-2xl font-bold mb-6">Configuration</h2>
				
				<!-- API Key Section -->
				<div class="bg-gradient-to-r from-purple-900/30 to-purple-800/30 border border-purple-500/50 rounded-lg p-6 mb-6">
					<h3 class="text-xl font-bold mb-3">Your API Key</h3>
					<p class="text-gray-400 mb-4">
						This key authenticates your agent with SCALPERIUM servers. Keep it secure and never share it.
					</p>
					
					<div class="flex gap-2 mb-4">
						<input
							type="{showApiKey ? 'text' : 'password'}"
							value={apiKey}
							readonly
							class="flex-1 px-4 py-2 bg-black border border-gray-700 rounded-lg font-mono"
						/>
						<button
							on:click={() => showApiKey = !showApiKey}
							class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all"
						>
							{showApiKey ? '🙈 Hide' : '👁️ Show'}
						</button>
						<button
							on:click={copyApiKey}
							class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
						>
							📋 Copy
						</button>
					</div>

					<button
						on:click={regenerateApiKey}
						class="px-4 py-2 bg-red-900 hover:bg-red-800 rounded-lg text-sm transition-all"
					>
						🔄 Regenerate API Key
					</button>
					<p class="text-xs text-gray-500 mt-2">
						⚠️ Warning: Regenerating will disconnect all active agents using the old key
					</p>
				</div>

				<!-- Environment Variable Setup -->
				<div class="space-y-6">
					<h3 class="text-xl font-bold">Setup Environment Variables</h3>
					
					<div class="bg-gray-800 rounded-lg p-6">
						<h4 class="font-bold mb-3">Option 1: PowerShell (Recommended)</h4>
						<p class="text-gray-400 text-sm mb-3">Open PowerShell as Administrator and run:</p>
						<div class="bg-black rounded p-4 font-mono text-sm overflow-x-auto">
							<code>
								[System.Environment]::SetEnvironmentVariable('SCALPERIUM_API_KEY', '{apiKey}', 'Machine')<br>
								[System.Environment]::SetEnvironmentVariable('SCALPERIUM_WS_URL', 'wss://app.scalperium.com/ws/agent', 'Machine')
							</code>
						</div>
					</div>

					<div class="bg-gray-800 rounded-lg p-6">
						<h4 class="font-bold mb-3">Option 2: System Properties GUI</h4>
						<ol class="list-decimal list-inside text-gray-400 space-y-2 text-sm">
							<li>Right-click "This PC" → Properties</li>
							<li>Click "Advanced system settings"</li>
							<li>Click "Environment Variables"</li>
							<li>Under "System variables", click "New"</li>
							<li>Variable name: <code class="bg-black px-2 py-1 rounded">SCALPERIUM_API_KEY</code></li>
							<li>Variable value: <code class="bg-black px-2 py-1 rounded">{apiKey}</code></li>
							<li>Repeat for <code class="bg-black px-2 py-1 rounded">SCALPERIUM_WS_URL</code> = <code class="bg-black px-2 py-1 rounded">wss://app.scalperium.com/ws/agent</code></li>
						</ol>
					</div>
				</div>

			{:else if activeTab === 'service'}
				<h2 class="text-2xl font-bold mb-6">Install as Windows Service (24/7 Operation)</h2>
				
				<p class="text-gray-400 mb-6">
					For VPS deployment, install the agent as a Windows service to run automatically 24/7, even after system restarts.
				</p>

				<div class="space-y-6">
					<div class="bg-gray-800 rounded-lg p-6">
						<h3 class="text-lg font-bold mb-3">1. Install NSSM (Service Manager)</h3>
						<div class="bg-black rounded p-4 font-mono text-sm mb-2">
							<code>choco install nssm</code>
						</div>
						<p class="text-gray-400 text-sm">
							Or download from: <a href="https://nssm.cc/download" target="_blank" class="text-blue-400 hover:underline">https://nssm.cc/download</a>
						</p>
					</div>

					<div class="bg-gray-800 rounded-lg p-6">
						<h3 class="text-lg font-bold mb-3">2. Create Service</h3>
						<div class="bg-black rounded p-4 font-mono text-sm overflow-x-auto mb-2">
							<code>
								nssm install SCALPERIUM-Agent "C:\SCALPERIUM\SCALPERIUM-MT5-Agent.exe"<br>
								nssm set SCALPERIUM-Agent AppDirectory "C:\SCALPERIUM"<br>
								nssm set SCALPERIUM-Agent AppExit Default Restart<br>
								nssm set SCALPERIUM-Agent AppRestartDelay 5000
							</code>
						</div>
					</div>

					<div class="bg-gray-800 rounded-lg p-6">
						<h3 class="text-lg font-bold mb-3">3. Start Service</h3>
						<div class="bg-black rounded p-4 font-mono text-sm mb-2">
							<code>nssm start SCALPERIUM-Agent</code>
						</div>
					</div>

					<div class="bg-gray-800 rounded-lg p-6">
						<h3 class="text-lg font-bold mb-3">Service Management Commands</h3>
						<div class="bg-black rounded p-4 font-mono text-sm space-y-2">
							<div><code># Check status</code></div>
							<div><code>nssm status SCALPERIUM-Agent</code></div>
							<div class="mt-2"><code># Stop service</code></div>
							<div><code>nssm stop SCALPERIUM-Agent</code></div>
							<div class="mt-2"><code># Restart service</code></div>
							<div><code>nssm restart SCALPERIUM-Agent</code></div>
							<div class="mt-2"><code># Remove service</code></div>
							<div><code>nssm remove SCALPERIUM-Agent confirm</code></div>
						</div>
					</div>
				</div>

			{:else if activeTab === 'ai'}
				<h2 class="text-2xl font-bold mb-6">AI Learning & Optimization</h2>
				
				<p class="text-gray-400 mb-6">
					The SCALPERIUM agent uses machine learning to continuously improve indicator settings based on your trading history.
				</p>

				<div class="space-y-6">
					<!-- How It Works -->
					<div class="bg-gradient-to-r from-purple-900/30 to-purple-800/30 border border-purple-500/50 rounded-lg p-6">
						<h3 class="text-xl font-bold mb-4 flex items-center gap-2">
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
							</svg>
							How AI Learning Works
						</h3>
						<div class="space-y-3 text-sm">
							<div class="flex gap-3">
								<span class="text-green-500 font-bold">1.</span>
								<p class="text-gray-300"><strong>Trade History Tracking:</strong> Every trade is logged with indicator signal (GREEN/ORANGE/RED), ATR value, and outcome (profit/loss).</p>
							</div>
							<div class="flex gap-3">
								<span class="text-green-500 font-bold">2.</span>
								<p class="text-gray-300"><strong>Pattern Analysis:</strong> AI identifies correlations between ATR values, indicator signals, and profitable trades.</p>
							</div>
							<div class="flex gap-3">
								<span class="text-green-500 font-bold">3.</span>
								<p class="text-gray-300"><strong>Automatic Optimization:</strong> Every 24 hours (after 50+ trades), AI analyzes patterns and suggests optimized settings.</p>
							</div>
							<div class="flex gap-3">
								<span class="text-green-500 font-bold">4.</span>
								<p class="text-gray-300"><strong>Dashboard Control:</strong> Review AI suggestions in Agent Control Panel and apply with one click.</p>
							</div>
						</div>
					</div>

					<!-- What Gets Optimized -->
					<div class="bg-gray-800 rounded-lg p-6">
						<h3 class="text-lg font-bold mb-4">What Gets Optimized</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<h4 class="font-bold text-sm text-blue-400 mb-2">ATR Settings</h4>
								<ul class="text-sm text-gray-400 space-y-1">
									<li>• ATR Period (default: 14)</li>
									<li>• ATR Multiplier (default: 1.5)</li>
									<li>• Volatility threshold calibration</li>
								</ul>
							</div>
							<div>
								<h4 class="font-bold text-sm text-purple-400 mb-2">Traffic Light Thresholds</h4>
								<ul class="text-sm text-gray-400 space-y-1">
									<li>• 🟢 GREEN signal threshold</li>
									<li>• 🟠 ORANGE signal threshold</li>
									<li>• 🔴 RED signal threshold</li>
								</ul>
							</div>
						</div>
					</div>

					<!-- Using AI Optimization -->
					<div class="bg-gray-800 rounded-lg p-6">
						<h3 class="text-lg font-bold mb-4">Using AI Optimization</h3>
						<ol class="space-y-3 text-sm text-gray-300">
							<li class="flex gap-3">
								<span class="font-bold text-red-500">1.</span>
								<span>Navigate to <strong>Agent Control Panel</strong> (/agents)</span>
							</li>
							<li class="flex gap-3">
								<span class="font-bold text-red-500">2.</span>
								<span>Find your agent (must have 50+ trades for AI optimization)</span>
							</li>
							<li class="flex gap-3">
								<span class="font-bold text-red-500">3.</span>
								<span>Click <strong>🤖 AI Optimize</strong> button</span>
							</li>
							<li class="flex gap-3">
								<span class="font-bold text-red-500">4.</span>
								<span>Review optimization results:
									<ul class="mt-2 ml-4 space-y-1 text-gray-400">
										<li>• Trades analyzed</li>
										<li>• Current vs optimized settings</li>
										<li>• Expected win rate improvement</li>
										<li>• AI insights and reasoning</li>
									</ul>
								</span>
							</li>
							<li class="flex gap-3">
								<span class="font-bold text-red-500">5.</span>
								<span>Click <strong>Apply Settings</strong> to update your EA automatically</span>
							</li>
						</ol>
					</div>

					<!-- Expected Results -->
					<div class="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
						<h3 class="text-lg font-bold mb-3 text-green-400">Expected Results</h3>
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
							<div class="text-center">
								<div class="text-3xl font-bold text-green-500 mb-1">+8-12%</div>
								<div class="text-gray-400">Win Rate Improvement</div>
							</div>
							<div class="text-center">
								<div class="text-3xl font-bold text-green-500 mb-1">65-75%</div>
								<div class="text-gray-400">Target Win Rate</div>
							</div>
							<div class="text-center">
								<div class="text-3xl font-bold text-green-500 mb-1">24hrs</div>
								<div class="text-gray-400">Optimization Cycle</div>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Quick Links -->
		<div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
			<a
				href="/agents"
				class="p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg transition-all text-center"
			>
				<div class="text-2xl mb-2">🤖</div>
				<div class="font-bold">Agent Control Panel</div>
				<div class="text-sm text-gray-500">Monitor your agents</div>
			</a>
			<a
				href="/dashboard"
				class="p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg transition-all text-center"
			>
				<div class="text-2xl mb-2">📊</div>
				<div class="font-bold">Trading Dashboard</div>
				<div class="text-sm text-gray-500">View your trades</div>
			</a>
			<a
				href="mailto:support@scalperium.com"
				class="p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg transition-all text-center"
			>
				<div class="text-2xl mb-2">💬</div>
				<div class="font-bold">Get Support</div>
				<div class="text-sm text-gray-500">Need help?</div>
			</a>
		</div>
	</div>
</div>
