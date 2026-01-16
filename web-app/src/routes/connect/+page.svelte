<script lang="ts">
	import { goto } from '$app/navigation';

	let loading = false;
	let connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
	let errorMessage = '';
	let accountsUsed = 0;
	let accountsLimit = 5;

	// Form fields
	let broker = '';
	let server = '';
	let accountNumber = '';

	async function handleConnect() {
		if (!broker || !server || !accountNumber) {
			errorMessage = 'Please fill in broker, server, and account number';
			return;
		}

		loading = true;
		connectionStatus = 'connecting';
		errorMessage = '';

		try {
			const response = await fetch('/api/account/connect', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					broker,
					server,
					accountNumber
				})
			});

			const result = await response.json();

			if (response.ok && result.success) {
				connectionStatus = 'connected';
				accountsUsed = result.accountsUsed || 0;
				accountsLimit = result.accountsLimit || 5;
				// Show success for 2 seconds then redirect
				setTimeout(() => {
					goto('/dashboard');
				}, 2000);
			} else {
				connectionStatus = 'error';
				errorMessage = result.error || 'Failed to connect to MT5';
				// Update account limits if provided (e.g., when limit is reached)
				if (result.current !== undefined && result.limit !== undefined) {
					accountsUsed = result.current;
					accountsLimit = result.limit;
				}
			}
		} catch (err) {
			connectionStatus = 'error';
			errorMessage = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-black flex items-center justify-center py-8 px-4">
	<div class="w-full max-w-md relative z-10">
		<!-- Header -->
		<div class="text-center mb-8">
			<img src="/logo.png" alt="SCALPERIUM" class="w-44 h-44 sm:w-48 sm:h-48 mx-auto mb-2" />
			<h1 class="text-3xl sm:text-4xl font-bold mb-2" style="font-family: 'Orbitron', sans-serif; color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); letter-spacing: 0.05em;">
				Connect to MT5
			</h1>
			<p class="text-gray-400 text-sm">Link your mobile trading account to SCALPERIUM</p>
		</div>

		<!-- Connection Status Card -->
		{#if connectionStatus !== 'disconnected'}
			<div class="mb-6 bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
				<div class="flex items-center justify-between">
					<span class="text-white font-semibold">Connection Status</span>
					<div class="flex items-center space-x-2">
						{#if connectionStatus === 'connecting'}
						<div class="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
						<span class="text-red-400 text-sm">Connecting...</span>
						{:else if connectionStatus === 'connected'}
							<div class="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50"></div>
							<span class="text-green-400 text-sm font-semibold">✓ Connected</span>
						{:else if connectionStatus === 'error'}
							<div class="w-3 h-3 rounded-full bg-red-500"></div>
							<span class="text-red-400 text-sm">Failed</span>
						{/if}
					</div>
				</div>
				{#if connectionStatus === 'connected'}
					<p class="text-gray-400 text-xs mt-2">Redirecting to dashboard...</p>
				{/if}
			</div>
		{/if}

		<!-- Error Message -->
		{#if errorMessage}
			<div class="mb-6 bg-red-900/20 border border-red-500/50 rounded-xl p-4">
				<p class="text-red-400 text-sm">{errorMessage}</p>
			</div>
		{/if}

		<!-- Connection Form -->
		<div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 sm:p-8 border border-gray-700/50">
			<!-- Account Limit Display -->
			{#if accountsUsed > 0}
				<div class="mb-4 p-3 bg-gray-900/50 border border-gray-600 rounded-lg">
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-400">Accounts Connected</span>
						<span class="text-sm font-bold" class:text-yellow-400={accountsUsed >= accountsLimit} class:text-blue-400={accountsUsed < accountsLimit}>
							{accountsUsed}/{accountsLimit}
						</span>
					</div>
				</div>
			{/if}

			<form on:submit|preventDefault={handleConnect} class="space-y-5">
				<!-- Broker Name -->
				<div>
					<label for="broker" class="block text-sm font-medium text-gray-300 mb-2">
						Broker Name
					</label>
					<input
						id="broker"
						type="text"
						bind:value={broker}
					placeholder="e.g., XM, FXTM, IC Markets"
					disabled={loading || connectionStatus === 'connected'}
					class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
					/>
				</div>

				<!-- Server -->
				<div>
					<label for="server" class="block text-sm font-medium text-gray-300 mb-2">
						Server Address
					</label>
					<input
						id="server"
						type="text"
						bind:value={server}
					placeholder="e.g., XM-Real 23"
					disabled={loading || connectionStatus === 'connected'}
					class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
					/>
					<p class="text-xs text-gray-500 mt-1">Find this in your MT5 mobile app settings</p>
				</div>

				<!-- Account Number -->
				<div>
					<label for="accountNumber" class="block text-sm font-medium text-gray-300 mb-2">
						MT5 Account Number
					</label>
					<input
						id="accountNumber"
						type="text"
						bind:value={accountNumber}
					placeholder="12345678"
					disabled={loading || connectionStatus === 'connected'}
					class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
					/>
					<p class="text-xs text-gray-500 mt-1">Your account will be linked to your Windows agent</p>
				</div>

				<!-- Buttons -->
				<div class="flex flex-col sm:flex-row gap-3 pt-4">
					<button
						type="submit"
						disabled={loading || connectionStatus === 'connected'}
						class="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-700 text-white font-bold rounded-lg hover:from-red-400 hover:to-red-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
					>
						{#if loading}
							<span class="flex items-center justify-center">
								<svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Connecting...
							</span>
						{:else if connectionStatus === 'connected'}
							✓ Connected
						{:else}
							Connect to MT5
						{/if}
					</button>

					<button
						type="button"
						on:click={() => goto('/dashboard')}
						class="flex-1 px-6 py-3 bg-gray-700/50 text-white font-semibold rounded-lg hover:bg-gray-600/50 transition border border-gray-600/50"
					>
						Cancel
					</button>
				</div>
			</form>

			<!-- Help Text -->
			<div class="mt-6 pt-6 border-t border-gray-700">
				<p class="text-xs text-gray-400 text-center">Your credentials are securely encrypted and protected.
			</div>
		</div>

		<!-- Back to Home Link -->
		<div class="text-center mt-6">
			<a href="/" class="text-sm text-gray-400 hover:text-red-400 transition">
				← Back to Home
			</a>
		</div>
	</div>
</div>
