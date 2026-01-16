<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	// Get white-label branding from layout data (set when accessed via IB custom domain)
	$: whiteLabel = $page.data.whiteLabel;
	$: brandName = whiteLabel?.brandName || 'SCALPERIUM';
	$: brandColor = whiteLabel?.brandColor || '#EF4444';
	$: logoUrl = whiteLabel?.logo || '/logo.png';
</script>

<div class="min-h-screen flex items-center justify-center bg-black py-8 sm:py-12">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 w-full">
		<!-- Hero Section -->
		<div class="mb-6 sm:mb-8">
		<div class="mb-3 sm:mb-6">
			{#if whiteLabel?.logo}
				<img src={logoUrl} alt={brandName} class="max-h-48 sm:max-h-64 lg:max-h-80 mx-auto mb-2" />
			{:else}
				<img src="/logo.png" alt="SCALPERIUM" class="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 mx-auto mb-2" />
			{/if}
		<h1 class="text-2xl sm:text-4xl lg:text-5xl font-bold mb-2 px-2 transition-all duration-300"
			style="font-family: 'Orbitron', sans-serif; color: #9ca3af; text-shadow: 0 0 10px {brandColor}80; letter-spacing: 0.15em; font-weight: 900; text-transform: uppercase;">
			{brandName}
		</h1>
		</div>
			<p class="text-base sm:text-lg lg:text-xl text-gray-300 mb-4 max-w-3xl mx-auto px-4">
				Elite mobile trading bot engineered for gold markets
			</p>
			<p class="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto px-4 mb-6">
				High-frequency scalping system with precision entry execution. Built for serious traders who demand results.
			</p>

			<!-- Login/Register Buttons -->
			<div class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6">
				<button
					on:click={() => goto('/login')}
					class="w-full sm:w-auto text-white px-8 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:scale-105 active:scale-95"
					style="background: linear-gradient(to right, {brandColor}, {brandColor}cc); box-shadow: 0 10px 15px -3px {brandColor}50;"
				>
					Login
				</button>
				<button
					on:click={() => goto('/register')}
					class="w-full sm:w-auto bg-transparent border-2 px-8 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 active:scale-95"
					style="border-color: {brandColor}; color: {brandColor};"
				>
					Register
				</button>
			</div>
		</div>

		<!-- System Capabilities -->
		<div class="max-w-2xl mx-auto mb-8">
			<div class="bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-gray-700/50 shadow-2xl">
				<div
					class="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg mb-4 sm:mb-6 mx-auto shadow-lg"
					style="background: linear-gradient(to bottom right, {brandColor}, {brandColor}cc); box-shadow: 0 10px 15px -3px {brandColor}50;"
				>
					<svg class="w-5 h-5 sm:w-6 sm:h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				</div>
				<h2 class="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">System Capabilities</h2>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm sm:text-base">
					<div class="flex items-center text-gray-300">
						<span class="text-gray-400 mr-2 sm:mr-3" style="filter: drop-shadow(0 0 3px {brandColor}80);">✓</span> Gold-optimized algorithms
					</div>
					<div class="flex items-center text-gray-300">
						<span class="text-gray-400 mr-2 sm:mr-3" style="filter: drop-shadow(0 0 3px {brandColor}80);">✓</span> Sniper entry execution
					</div>
					<div class="flex items-center text-gray-300">
						<span class="text-gray-400 mr-2 sm:mr-3" style="filter: drop-shadow(0 0 3px {brandColor}80);">✓</span> High-frequency scalping
					</div>
					<div class="flex items-center text-gray-300">
						<span class="text-gray-400 mr-2 sm:mr-3" style="filter: drop-shadow(0 0 3px {brandColor}80);">✓</span> Mobile MT5 integration
					</div>
					<div class="flex items-center text-gray-300 sm:col-span-2 sm:justify-center">
						<span class="text-gray-400 mr-2 sm:mr-3" style="filter: drop-shadow(0 0 3px {brandColor}80);">✓</span> Real-time profit tracking
					</div>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div class="text-xs sm:text-sm text-gray-500 mt-6 px-4">
			<p class="text-center">Mobile-First Gold Trading System</p>
			{#if !whiteLabel}
				<div class="flex items-center justify-center gap-4 mt-3 text-gray-600">
					<a href="/ib-login" class="hover:text-gray-400 transition-colors">IB Partner Login</a>
					<span class="text-gray-700">•</span>
					<a href="/ib-register" class="hover:text-gray-400 transition-colors">Become an IB Partner</a>
				</div>
			{/if}
		</div>
	</div>
</div>
