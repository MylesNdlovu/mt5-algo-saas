<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	
	let showMenu = false;
	
	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		goto('/login');
	}
	
	$: currentPath = $page.url.pathname;
</script>

<!-- Top Navigation Bar -->
<nav class="bg-gradient-to-r from-gray-900 via-black to-gray-900 border-b border-gray-800 sticky top-0 z-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between h-16">
			<!-- Logo/Brand -->
			<a href="/dashboard" class="flex items-center">
				<span class="text-2xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); font-family: 'Orbitron', sans-serif;">
					SCALPERIUM
				</span>
			</a>
			
			<!-- Desktop Navigation -->
			<div class="hidden md:flex items-center gap-6">
				<a 
					href="/dashboard" 
					class="px-3 py-2 rounded-lg transition-colors {currentPath === '/dashboard' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'}"
				>
					Dashboard
				</a>
				<a 
					href="/agents" 
					class="px-3 py-2 rounded-lg transition-colors {currentPath === '/agents' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'}"
				>
					🤖 Agents
				</a>
				<a 
					href="/docs/agent-setup" 
					class="px-3 py-2 rounded-lg transition-colors {currentPath === '/docs/agent-setup' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'}"
				>
					📚 Setup
				</a>
				<a 
					href="/leaderboard" 
					class="px-3 py-2 rounded-lg transition-colors {currentPath === '/leaderboard' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'}"
				>
					🏆 Leaderboard
				</a>
				<a 
					href="/ib-partners" 
					class="px-3 py-2 rounded-lg transition-colors {currentPath === '/ib-partners' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'}"
				>
					🤝 IB Partners
				</a>
				<a 
					href="/admin" 
					class="px-3 py-2 rounded-lg transition-colors {currentPath === '/admin' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'}"
				>
					⚙️ Admin
				</a>
				<button 
					on:click={handleLogout}
					class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-white font-medium"
				>
					Logout
				</button>
			</div>
			
			<!-- Mobile Menu Button -->
			<button 
				on:click={() => showMenu = !showMenu}
				class="md:hidden p-2 rounded-lg hover:bg-gray-800"
			>
				<svg class="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
		</div>
	</div>
	
	<!-- Mobile Menu -->
	{#if showMenu}
		<div class="md:hidden border-t border-gray-800 bg-black">
			<div class="px-4 py-2 space-y-1">
				<a 
					href="/dashboard" 
					class="block px-3 py-2 rounded-lg {currentPath === '/dashboard' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'}"
				>
					Dashboard
				</a>
				<a 
					href="/agents" 
					class="block px-3 py-2 rounded-lg {currentPath === '/agents' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'}"
				>
					🤖 Agents
				</a>
				<a 
					href="/docs/agent-setup" 
					class="block px-3 py-2 rounded-lg {currentPath === '/docs/agent-setup' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'}"
				>
					📚 Setup
				</a>
				<a 
					href="/leaderboard" 
					class="block px-3 py-2 rounded-lg {currentPath === '/leaderboard' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'}"
				>
					🏆 Leaderboard
				</a>
				<a 
					href="/ib-partners" 
					class="block px-3 py-2 rounded-lg {currentPath === '/ib-partners' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'}"
				>
					🤝 IB Partners
				</a>
				<a 
					href="/admin" 
					class="block px-3 py-2 rounded-lg {currentPath === '/admin' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'}"
				>
					⚙️ Admin
				</a>
				<button 
					on:click={handleLogout}
					class="w-full text-left px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium"
				>
					Logout
				</button>
			</div>
		</div>
	{/if}
</nav>
