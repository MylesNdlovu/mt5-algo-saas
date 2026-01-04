<script lang="ts">
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let broker = 'Exness';
	let loading = false;
	let errorMessage = '';
	let showDemo = false;

	const demoAccounts = [
		{ label: 'Trader Demo - Exness', email: 'trader@scalperium.com', password: 'Trader123!', broker: 'Exness' },
		{ label: 'VIP Trader - PrimeXBT', email: 'vip@scalperium.com', password: 'VIP123!', broker: 'PrimeXBT' },
		{ label: 'Demo Account - Exness', email: 'demo@scalperium.com', password: 'Demo123!', broker: 'Exness' },
		{ label: 'Pro Trader - Exness', email: 'pro@scalperium.com', password: 'Pro123!', broker: 'Exness' },
		{ label: '🔐 Admin Panel', email: 'admin@scalperium.com', password: 'Admin123!', broker: 'System' }
	];

	function useDemoAccount(account: any) {
		email = account.email;
		password = account.password;
		broker = account.broker;
		showDemo = false;
	}

	async function handleLogin() {
		if (!email || !password) {
			errorMessage = 'Please enter email and password';
			return;
		}

		loading = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password, broker })
			});

			const result = await response.json();

			if (response.ok && result.success) {
				// Redirect based on role
				if (result.user.role === 'admin') {
					goto('/admin');
				} else {
					goto('/dashboard');
				}
			} else {
				errorMessage = result.error || 'Invalid credentials';
			}
		} catch (err) {
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
			<h1 class="text-4xl sm:text-5xl font-bold mb-2" style="font-family: 'Orbitron', sans-serif; color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); letter-spacing: 0.05em;">
				SCALPERIUM
			</h1>
			<p class="text-gray-400">Access your trading dashboard</p>
		</div>

		<!-- Error Message -->
		{#if errorMessage}
			<div class="mb-6 bg-red-900/20 border border-red-500/50 rounded-xl p-4">
				<p class="text-red-400 text-sm">{errorMessage}</p>
			</div>
		{/if}

		<!-- Demo Credentials Button -->
		<div class="mb-4">
			<button
				on:click={() => showDemo = !showDemo}
				type="button"
				class="w-full px-4 py-2 bg-blue-600/20 border border-blue-500/50 rounded-lg text-blue-400 hover:bg-blue-600/30 transition text-sm font-medium"
			>
				{showDemo ? '✕ Hide' : '🔑 Show'} Demo Credentials
			</button>
		</div>

		{#if showDemo}
			<div class="mb-6 bg-blue-900/10 border border-blue-500/30 rounded-xl p-4">
				<h3 class="text-sm font-semibold text-blue-400 mb-3">Quick Login Options:</h3>
				<div class="space-y-2">
					{#each demoAccounts as account}
						<button
							type="button"
							on:click={() => useDemoAccount(account)}
							class="w-full text-left px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition text-xs"
						>
							<div class="text-gray-400 font-medium">{account.label}</div>
							<div class="text-gray-400">{account.email} • {account.broker}</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Login Form -->
		<div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 sm:p-8 border border-gray-700/50">
			<form on:submit|preventDefault={handleLogin} class="space-y-5">
				<!-- Email -->
				<div>
					<label for="email" class="block text-sm font-medium text-gray-300 mb-2">
						Email Address
					</label>
					<input
						id="email"
						type="email"
						bind:value={email}
					placeholder="your@email.com"
					disabled={loading}
					class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition disabled:opacity-50"
					/>
				</div>

				<!-- Password -->
				<div>
					<label for="password" class="block text-sm font-medium text-gray-300 mb-2">
						Password
					</label>
					<input
						id="password"
						type="password"
						bind:value={password}
					placeholder="••••••••"
					disabled={loading}
					class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition disabled:opacity-50"
					/>
				</div>

				<!-- Broker Server -->
				<div>
					<label for="broker" class="block text-sm font-medium text-gray-300 mb-2">
						Broker Server
					</label>
					<select
						id="broker"
						bind:value={broker}
						disabled={loading}
						class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition disabled:opacity-50"
					>
						<option value="Exness">Exness</option>
						<option value="PrimeXBT">PrimeXBT</option>
					</select>
				</div>

				<!-- Submit Button -->
				<button
					type="submit"
					disabled={loading}
					class="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-red-700 text-white font-bold rounded-lg hover:from-red-400 hover:to-red-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
				>
					{#if loading}
						<span class="flex items-center justify-center">
							<svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Logging in...
						</span>
					{:else}
						Sign In
					{/if}
				</button>
			</form>

			<!-- Register Link -->
			<div class="mt-6 text-center">
				<p class="text-sm text-gray-400">
					Don't have an account?
					<a href="/register" class="text-gray-400 hover:text-red-400 font-semibold transition">
						Create Account
					</a>
				</p>
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
