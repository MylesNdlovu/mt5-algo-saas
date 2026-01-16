<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { SessionUser } from '$app.d.ts';

	export let user: SessionUser | null = null;

	let showMenu = false;

	// Check user role hierarchy
	$: isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
	$: isSuperAdmin = user?.role === 'SUPER_ADMIN';
	$: isIB = user?.role === 'IB';
	$: isRegularUser = user?.role === 'TRADER'; // All regular trading users

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
				<span class="text-base sm:text-xl md:text-2xl font-bold" style="color: #e5e7eb; text-shadow: 0 0 12px rgba(239, 68, 68, 0.6); font-family: 'Orbitron', sans-serif;">
					SCALPERIUM
				</span>
			</a>
			
			<!-- Desktop Navigation -->
			<div class="hidden md:flex items-center gap-4">
				<!-- Dashboard - Everyone sees this -->
				<a
					href="/dashboard"
					class="px-3 py-2 rounded-lg transition-all font-medium {currentPath === '/dashboard' ? 'bg-red-600/20 text-white border border-red-600/50' : 'text-gray-200 hover:bg-gray-800 hover:text-white'}"
				>
					Dashboard
				</a>

				<!-- Admin & Super Admin Only -->
				{#if isAdmin}
				<a
					href="/agents"
					class="px-3 py-2 rounded-lg transition-all font-medium {currentPath === '/agents' ? 'bg-red-600/20 text-white border border-red-600/50' : 'text-gray-200 hover:bg-gray-800 hover:text-white'}"
				>
					🤖 Agents
				</a>
				<a
					href="/docs/agent-setup"
					class="px-3 py-2 rounded-lg transition-all font-medium {currentPath === '/docs/agent-setup' ? 'bg-red-600/20 text-white border border-red-600/50' : 'text-gray-200 hover:bg-gray-800 hover:text-white'}"
				>
					📚 Setup
				</a>
				<a
					href="/automations"
					class="px-3 py-2 rounded-lg transition-all font-medium {currentPath === '/automations' ? 'bg-red-600/20 text-white border border-red-600/50' : 'text-gray-200 hover:bg-gray-800 hover:text-white'}"
				>
					🔔 Notifications
				</a>
				<a
					href="/admin/ib-partners"
					class="px-3 py-2 rounded-lg transition-all font-medium {currentPath.startsWith('/admin/ib-partners') ? 'bg-red-600/20 text-white border border-red-600/50' : 'text-gray-200 hover:bg-gray-800 hover:text-white'}"
				>
					🤝 IB Partners
				</a>
				<a
					href="/admin"
					class="px-3 py-2 rounded-lg transition-all font-medium {currentPath === '/admin' ? 'bg-red-600/20 text-white border border-red-600/50' : 'text-gray-200 hover:bg-gray-800 hover:text-white'}"
				>
					⚙️ Admin
				</a>
				{/if}

				<!-- IB Partners Only - Can see leaderboard to track their traders -->
				{#if isIB}
				<a
					href="/leaderboard"
					class="px-3 py-2 rounded-lg transition-all font-medium {currentPath === '/leaderboard' ? 'bg-red-600/20 text-white border border-red-600/50' : 'text-gray-200 hover:bg-gray-800 hover:text-white'}"
				>
					🏆 Leaderboard
				</a>
				{/if}

				<!-- Logout - Everyone -->
				<button
					on:click={handleLogout}
					class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all text-white font-semibold shadow-lg hover:shadow-red-600/50"
				>
					Logout
				</button>
			</div>
			
			<!-- Mobile Menu Button -->
			<button
				on:click={() => showMenu = !showMenu}
				class="md:hidden p-2 rounded-lg transition-all {showMenu ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}"
				aria-label="Toggle menu"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					{#if showMenu}
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					{:else}
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					{/if}
				</svg>
			</button>
		</div>
	</div>
	
	<!-- Mobile Menu -->
	{#if showMenu}
		<div class="md:hidden border-t border-red-600/30 bg-gradient-to-b from-gray-900 to-black shadow-xl">
			<div class="px-4 py-3 space-y-2">
				<!-- Dashboard - Everyone -->
				<a
					href="/dashboard"
					on:click={() => showMenu = false}
					class="block px-4 py-3 rounded-lg font-medium transition-all {currentPath === '/dashboard' ? 'bg-red-600/20 text-white border border-red-600/50' : 'text-gray-100 hover:bg-gray-800 hover:text-white'}"
				>
					Dashboard
				</a>

				<!-- Admin & Super Admin Only -->
				{#if isAdmin}
				<a
					href="/agents"
					on:click={() => showMenu = false}
					class="block px-4 py-3 rounded-lg font-medium transition-all {currentPath === '/agents' ? 'bg-red-600/20 text-white border border-red-600/50' : 'text-gray-100 hover:bg-gray-800 hover:text-white'}"
				>
					🤖 Agents
				</a>
				<a
					href="/docs/agent-setup"
					on:click={() => showMenu = false}
					class="block px-4 py-3 rounded-lg font-medium transition-all {currentPath === '/docs/agent-setup' ? 'bg-red-600/20 text-white border border-red-600/50' : 'text-gray-100 hover:bg-gray-800 hover:text-white'}"
				>
					📚 Setup
				</a>
				<a
					href="/automations"
					on:click={() => showMenu = false}
					class="block px-4 py-3 rounded-lg font-medium transition-all {currentPath === '/automations' ? 'bg-red-600/20 text-white border border-red-600/50' : 'text-gray-100 hover:bg-gray-800 hover:text-white'}"
				>
					🔔 Notifications
				</a>
				<a
					href="/admin/ib-partners"
					on:click={() => showMenu = false}
					class="block px-4 py-3 rounded-lg font-medium transition-all {currentPath.startsWith('/admin/ib-partners') ? 'bg-red-600/20 text-white border border-red-600/50' : 'text-gray-100 hover:bg-gray-800 hover:text-white'}"
				>
					🤝 IB Partners
				</a>
				<a
					href="/admin"
					on:click={() => showMenu = false}
					class="block px-4 py-3 rounded-lg font-medium transition-all {currentPath === '/admin' ? 'bg-red-600/20 text-white border border-red-600/50' : 'text-gray-100 hover:bg-gray-800 hover:text-white'}"
				>
					⚙️ Admin
				</a>
				{/if}

				<!-- IB Partners Only - Can see leaderboard to track their traders -->
				{#if isIB}
				<a
					href="/leaderboard"
					on:click={() => showMenu = false}
					class="block px-4 py-3 rounded-lg font-medium transition-all {currentPath === '/leaderboard' ? 'bg-red-600/20 text-white border border-red-600/50' : 'text-gray-100 hover:bg-gray-800 hover:text-white'}"
				>
					🏆 Leaderboard
				</a>
				{/if}

				<!-- Logout - Everyone -->
				<button
					on:click={handleLogout}
					class="w-full text-left px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-all shadow-lg mt-2"
				>
					Logout
				</button>
			</div>
		</div>
	{/if}
</nav>
