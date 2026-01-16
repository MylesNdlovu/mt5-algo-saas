<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let status: 'loading' | 'success' | 'error' | 'already-verified' = 'loading';
	let message = '';

	onMount(async () => {
		const email = $page.url.searchParams.get('email');
		const code = $page.url.searchParams.get('code');

		if (!email || !code) {
			status = 'error';
			message = 'Invalid verification link. Missing email or code.';
			return;
		}

		try {
			const response = await fetch(`/api/ib/verify-email?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`);
			const result = await response.json();

			if (response.ok && result.success) {
				if (result.alreadyVerified) {
					status = 'already-verified';
					message = 'Your email has already been verified.';
				} else {
					status = 'success';
					message = result.message || 'Email verified successfully!';
				}
			} else {
				status = 'error';
				message = result.error || 'Verification failed';
			}
		} catch (error) {
			status = 'error';
			message = 'Network error. Please try again.';
		}
	});
</script>

<svelte:head>
	<title>Email Verification - SCALPERIUM</title>
	<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen bg-black flex items-center justify-center px-6">
	<div class="w-full max-w-md text-center">
		{#if status === 'loading'}
			<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-gray-700 p-8">
				<div class="flex justify-center mb-4">
					<svg class="animate-spin h-12 w-12 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
				</div>
				<h2 class="text-xl text-white font-bold" style="font-family: 'Orbitron', sans-serif;">
					Verifying your email...
				</h2>
			</div>
		{:else if status === 'success'}
			<div class="bg-gradient-to-br from-green-900/30 to-black rounded-xl border border-green-500/50 p-8">
				<div class="flex justify-center mb-4">
					<div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
						<svg class="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
					</div>
				</div>
				<h2 class="text-2xl text-green-400 font-bold mb-3" style="font-family: 'Orbitron', sans-serif;">
					EMAIL VERIFIED
				</h2>
				<p class="text-gray-300 mb-6">{message}</p>
				<p class="text-sm text-gray-400 mb-6">
					Your IB partner application is now pending admin review. We will notify you via email once your account is approved.
				</p>
				<a
					href="/ib-login"
					class="inline-block px-8 py-3 bg-gradient-to-r from-red-500 to-red-700 rounded-lg font-bold hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all"
					style="font-family: 'Orbitron', sans-serif;"
				>
					GO TO LOGIN
				</a>
			</div>
		{:else if status === 'already-verified'}
			<div class="bg-gradient-to-br from-blue-900/30 to-black rounded-xl border border-blue-500/50 p-8">
				<div class="flex justify-center mb-4">
					<div class="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
						<svg class="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
					</div>
				</div>
				<h2 class="text-2xl text-blue-400 font-bold mb-3" style="font-family: 'Orbitron', sans-serif;">
					ALREADY VERIFIED
				</h2>
				<p class="text-gray-300 mb-6">{message}</p>
				<a
					href="/ib-login"
					class="inline-block px-8 py-3 bg-gradient-to-r from-red-500 to-red-700 rounded-lg font-bold hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all"
					style="font-family: 'Orbitron', sans-serif;"
				>
					GO TO LOGIN
				</a>
			</div>
		{:else}
			<div class="bg-gradient-to-br from-red-900/30 to-black rounded-xl border border-red-500/50 p-8">
				<div class="flex justify-center mb-4">
					<div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
						<svg class="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
					</div>
				</div>
				<h2 class="text-2xl text-red-400 font-bold mb-3" style="font-family: 'Orbitron', sans-serif;">
					VERIFICATION FAILED
				</h2>
				<p class="text-gray-300 mb-6">{message}</p>
				<div class="space-y-3">
					<a
						href="/ib-register"
						class="block px-8 py-3 bg-gradient-to-r from-red-500 to-red-700 rounded-lg font-bold hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all"
						style="font-family: 'Orbitron', sans-serif;"
					>
						REGISTER AGAIN
					</a>
					<a
						href="/ib-login"
						class="block px-8 py-3 border border-gray-700 rounded-lg font-bold hover:border-red-500/50 transition-all text-gray-300"
					>
						Go to Login
					</a>
				</div>
			</div>
		{/if}
	</div>
</div>
