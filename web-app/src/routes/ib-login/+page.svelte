<script lang="ts">
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let error = '';
	let isSubmitting = false;

	async function handleLogin() {
		error = '';
		
		if (!email || !password) {
			error = 'Please enter both email and password';
			return;
		}
		
		isSubmitting = true;
		
		try {
			const response = await fetch('/api/ib/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});
			
			const result = await response.json();
			
			if (response.ok) {
				// Redirect to IB dashboard
				goto('/ib-dashboard');
			} else {
				error = result.error || 'Login failed';
			}
		} catch (err) {
			error = 'Network error. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>IB Partner Login - SCALPERIUM</title>
	<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen bg-black flex items-center justify-center px-6">
	<div class="w-full max-w-md">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold mb-2" style="font-family: 'Orbitron', sans-serif; text-shadow: 0 0 20px rgba(239, 68, 68, 0.5);">
				<span class="bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
					IB PARTNER LOGIN
				</span>
			</h1>
			<p class="text-gray-400">Access your white-label dashboard</p>
		</div>
		
		<!-- Login Form -->
		<form on:submit|preventDefault={handleLogin} class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-8 space-y-6">
			<div>
				<label class="block text-sm text-gray-400 mb-2">Email Address</label>
				<input
					type="email"
					bind:value={email}
					class="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none text-white"
					placeholder="your@email.com"
				>
			</div>
			
			<div>
				<label class="block text-sm text-gray-400 mb-2">Password</label>
				<input
					type="password"
					bind:value={password}
					class="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none text-white"
					placeholder="Enter your password"
				>
			</div>
			
			{#if error}
				<div class="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
					<p class="text-red-400">{error}</p>
				</div>
			{/if}
			
			<button
				type="submit"
				disabled={isSubmitting}
				class="w-full px-8 py-4 bg-gradient-to-r from-red-500 to-red-700 rounded-xl font-bold text-lg hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all duration-300 disabled:opacity-50"
				style="font-family: 'Orbitron', sans-serif;"
			>
				{isSubmitting ? 'LOGGING IN...' : 'LOGIN →'}
			</button>
		</form>
		
		<!-- Register Link -->
		<div class="text-center mt-6">
			<p class="text-gray-400">
				Don't have an IB account? 
				<a href="/ib-register" class="text-red-400 hover:text-red-300 font-semibold">Apply here</a>
			</p>
			<p class="text-gray-500 text-sm mt-2">
				<a href="/login" class="hover:text-gray-400">← Back to trader login</a>
			</p>
		</div>
	</div>
</div>
