<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="min-h-screen flex items-center justify-center bg-black py-8 sm:py-12">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 w-full">
		<!-- Hero Section -->
		<div class="mb-8 sm:mb-12">
		<div class="mb-4 sm:mb-6">
			<img src="/logo.png" alt="SCALPERIUM" class="w-80 h-80 sm:w-96 sm:h-96 lg:w-[28rem] lg:h-[28rem] mx-auto mb-3" />
		<h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold mb-2 px-2 transition-all duration-300" 
			style="font-family: 'Orbitron', sans-serif; color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); letter-spacing: 0.15em; font-weight: 900; text-transform: uppercase;">
			SCALPERIUM
		</h1>
		</div>
			<p class="text-base sm:text-lg lg:text-xl text-gray-300 mb-4 max-w-3xl mx-auto px-4">
				Elite mobile trading bot engineered for gold markets
			</p>
			<p class="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto px-4">
				High-frequency scalping system with precision entry execution. Built for serious traders who demand results.
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto mb-8 sm:mb-12">
			<!-- System Capabilities Card -->
			<div class="bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-gray-700/50 shadow-2xl hover:border-red-500/50 transition-all duration-300">
				<div class="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-lg mb-4 sm:mb-6 mx-auto shadow-lg shadow-red-500/50">
					<svg class="w-5 h-5 sm:w-6 sm:h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				</div>
				<h2 class="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">System Capabilities</h2>
				<ul class="text-left text-gray-300 space-y-2 sm:space-y-3 text-sm sm:text-base">
					<li class="flex items-center">
						<span class="text-gray-400 mr-2 sm:mr-3 text-lg" style="filter: drop-shadow(0 0 3px rgba(239, 68, 68, 0.5));">✓</span> Gold-optimized algorithms
					</li>
					<li class="flex items-center">
						<span class="text-gray-400 mr-2 sm:mr-3 text-lg" style="filter: drop-shadow(0 0 3px rgba(239, 68, 68, 0.5));">✓</span> Sniper entry execution
					</li>
					<li class="flex items-center">
						<span class="text-gray-400 mr-2 sm:mr-3 text-lg" style="filter: drop-shadow(0 0 3px rgba(239, 68, 68, 0.5));">✓</span> High-frequency scalping
					</li>
					<li class="flex items-center">
						<span class="text-gray-400 mr-2 sm:mr-3 text-lg" style="filter: drop-shadow(0 0 3px rgba(239, 68, 68, 0.5));">✓</span> Mobile MT5 integration
					</li>
					<li class="flex items-center">
						<span class="text-gray-400 mr-2 sm:mr-3 text-lg" style="filter: drop-shadow(0 0 3px rgba(239, 68, 68, 0.5));">✓</span> Real-time profit tracking
					</li>
				</ul>
			</div>

			<!-- Access Control Card -->
			<div class="bg-gray-800/50 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-gray-700/50 shadow-2xl hover:border-cyan-500/50 transition-all duration-300">
				<div class="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg mb-4 sm:mb-6 mx-auto shadow-lg shadow-cyan-500/50">
					<svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
					</svg>
				</div>
				<h2 class="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Access Your Bot</h2>
				<div class="text-left">
					<p class="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base">Monitor trades and control your gold scalper:</p>
					<button
						on:click={() => goto('/login')}
						class="w-full bg-gradient-to-r from-red-500 to-red-700 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold hover:from-red-400 hover:to-red-600 transition-all duration-300 mb-3 sm:mb-4 shadow-lg shadow-red-500/50 hover:shadow-red-500/70 hover:scale-105 active:scale-95 text-sm sm:text-base"
					>
						<span class="flex items-center justify-center">
							<svg class="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
							</svg>
							Sign In
						</span>
					</button>
					<button
						on:click={() => goto('/admin')}
						class="w-full bg-gray-700/50 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold hover:bg-gray-600/50 transition-all duration-300 border border-gray-600/50 hover:border-gray-500 hover:scale-105 active:scale-95 shadow-lg text-sm sm:text-base"
					>
						<span class="flex items-center justify-center">
							<svg class="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
							System Control
						</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div class="text-xs sm:text-sm text-gray-400 mt-8 sm:mt-12 px-4">
			<p class="flex items-center justify-center flex-wrap mb-2">
				<span class="text-red-500 mr-2">⚡</span>
				<span class="text-center">Mobile-First Gold Trading System</span>
			</p>
			<p class="text-xs text-gray-500 text-center">
				Powered by MT5 + C# Agent Architecture
			</p>
		</div>
	</div>
</div>
