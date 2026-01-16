<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let firstName = '';
	let lastName = '';
	let email = '';
	let phone = '';
	let password = '';
	let confirmPassword = '';
	let ibCode = ''; // IB referral code
	let agreeTerms = false;
	let loading = false;
	let errorMessage = '';

	// Get white-label branding from layout data (set when accessed via IB custom domain)
	$: whiteLabel = $page.data.whiteLabel;
	$: isWhiteLabelDomain = !!whiteLabel;
	$: brandName = whiteLabel?.brandName || 'SCALPERIUM';
	$: brandColor = whiteLabel?.brandColor || '#3B82F6'; // Trading blue (profitable trades in MT5)
	$: logoUrl = whiteLabel?.logo || '/logo.png';

	// Auto-fill IB code from white-label domain
	onMount(() => {
		if (whiteLabel?.ibCode) {
			ibCode = whiteLabel.ibCode;
		}
	});

	async function handleRegister() {
		// Validation
		if (!firstName || !lastName || !email || !password || !confirmPassword) {
			errorMessage = 'Please fill in all required fields';
			return;
		}

		if (!agreeTerms) {
			errorMessage = 'Please agree to the Terms of Service';
			return;
		}

		if (password !== confirmPassword) {
			errorMessage = 'Passwords do not match';
			return;
		}

		if (password.length < 8) {
			errorMessage = 'Password must be at least 8 characters';
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			errorMessage = 'Please enter a valid email address';
			return;
		}

		loading = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ firstName, lastName, email, phone, password, ibCode })
			});

			const result = await response.json();

			if (response.ok && result.success) {
				// Auto-login and redirect to connect MT5
				goto('/connect');
			} else {
				errorMessage = result.error || 'Registration failed';
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
			{#if whiteLabel?.logo}
				<img src={logoUrl} alt={brandName} class="max-h-32 sm:max-h-40 mx-auto mb-2" />
			{:else}
				<img src="/logo.png" alt="SCALPERIUM" class="w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-2" />
			{/if}
			<h1 class="text-2xl sm:text-4xl font-bold mb-2" style="font-family: 'Orbitron', sans-serif; color: #9ca3af; text-shadow: 0 0 10px {brandColor}80; letter-spacing: 0.05em;">
				Join {brandName}
			</h1>
			<p class="text-sm sm:text-base text-gray-400">Start trading gold with precision</p>
		</div>

		<!-- Error Message -->
		{#if errorMessage}
			<div class="mb-6 bg-red-900/20 border border-red-500/50 rounded-xl p-4">
				<p class="text-red-400 text-sm">{errorMessage}</p>
			</div>
		{/if}

		<!-- Registration Form -->
		<div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-6 sm:p-8 border border-gray-700/50">
			<form on:submit|preventDefault={handleRegister} class="space-y-5">
				<!-- First Name -->
				<div>
					<label for="firstName" class="block text-sm font-medium text-gray-300 mb-2">
						First Name <span class="text-red-400">*</span>
					</label>
					<input
						id="firstName"
						type="text"
						bind:value={firstName}
						placeholder="John"
						disabled={loading}
						class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition disabled:opacity-50"
					/>
				</div>

				<!-- Last Name -->
				<div>
					<label for="lastName" class="block text-sm font-medium text-gray-300 mb-2">
						Last Name <span class="text-red-400">*</span>
					</label>
					<input
						id="lastName"
						type="text"
						bind:value={lastName}
						placeholder="Doe"
						disabled={loading}
						class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition disabled:opacity-50"
					/>
				</div>

				<!-- Email -->
				<div>
					<label for="email" class="block text-sm font-medium text-gray-300 mb-2">
						Email Address <span class="text-red-400">*</span>
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

				<!-- Phone (Optional) -->
				<div>
					<label for="phone" class="block text-sm font-medium text-gray-300 mb-2">
						Phone Number <span class="text-gray-500 text-xs">(optional)</span>
					</label>
					<input
						id="phone"
						type="tel"
						bind:value={phone}
					placeholder="+1 234 567 8900"
					disabled={loading}
					class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition disabled:opacity-50"
					/>
				</div>

				<!-- IB Referral Code (hidden on white-label domains since it's auto-filled) -->
				{#if !isWhiteLabelDomain}
					<div>
						<label for="ibCode" class="block text-sm font-medium text-gray-300 mb-2">
							IB Referral Code <span class="text-gray-500 text-xs">(optional)</span>
						</label>
						<input
							id="ibCode"
							type="text"
							bind:value={ibCode}
							placeholder="Enter IB code if you have one"
							disabled={loading}
							class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition disabled:opacity-50 uppercase"
						/>
						<p class="text-xs text-gray-500 mt-1">If you were referred by an IB partner, enter their code here</p>
					</div>
				{/if}

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
					<p class="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
				</div>

				<!-- Confirm Password -->
				<div>
					<label for="confirmPassword" class="block text-sm font-medium text-gray-300 mb-2">
						Confirm Password
					</label>
					<input
						id="confirmPassword"
						type="password"
						bind:value={confirmPassword}
					placeholder="••••••••"
					disabled={loading}
					class="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition disabled:opacity-50"
				/>
			</div>

				<!-- Terms Checkbox -->
				<div class="flex items-start">
					<input
						id="agreeTerms"
						type="checkbox"
						bind:checked={agreeTerms}
						disabled={loading}
						class="mt-1 w-4 h-4 bg-gray-900/50 border border-gray-600 rounded focus:ring-red-500 focus:ring-2 text-red-500 disabled:opacity-50"
					/>
					<label for="agreeTerms" class="ml-2 text-sm text-gray-400">
						I agree to the <a href="#" class="text-gray-400 hover:text-red-400">Terms of Service</a> and <a href="#" class="text-gray-400 hover:text-red-400">Privacy Policy</a>
					</label>
				</div>

				<!-- Submit Button -->
				<button
					type="submit"
					disabled={loading}
					class="w-full px-6 py-3 text-white font-bold rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
					style="background: linear-gradient(to right, {brandColor}, {brandColor}cc); box-shadow: 0 10px 15px -3px {brandColor}50;"
				>
					{#if loading}
						<span class="flex items-center justify-center">
							<svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Creating Account...
						</span>
					{:else}
						Create Account
					{/if}
				</button>
			</form>

			<!-- Login Link -->
			<div class="mt-6 text-center">
				<p class="text-sm text-gray-400">
					Already have an account?
					<a href="/login" class="font-semibold transition hover:opacity-80" style="color: {brandColor};">
						Sign In
					</a>
				</p>
			</div>

			<!-- Terms -->
			<p class="text-xs text-gray-500 text-center mt-6">
				By creating an account, you agree to our Terms of Service and Privacy Policy
			</p>
		</div>

		<!-- Back to Home Link -->
		<div class="text-center mt-6">
			<a href="/" class="text-sm text-gray-400 transition hover:opacity-80">
				← Back to Home
			</a>
		</div>
	</div>
</div>
