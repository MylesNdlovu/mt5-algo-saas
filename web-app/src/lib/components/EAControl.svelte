<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let status: 'RUNNING' | 'STOPPED' | 'PAUSED' | 'ERROR';
	export let safetyIndicator: 'RED' | 'ORANGE' | 'GREEN';

	const dispatch = createEventDispatcher();

	$: isRunning = status === 'RUNNING';
	$: canStart = !isRunning && safetyIndicator !== 'RED';
	$: canStop = isRunning;

	function handleStart() {
		if (safetyIndicator === 'RED') {
			alert('Cannot start EA: Market conditions are unsafe');
			return;
		}
		dispatch('control', { action: 'start' });
	}

	function handleStop() {
		dispatch('control', { action: 'stop' });
	}

	const statusConfig = {
		RUNNING: { color: 'text-green-400', bg: 'bg-green-900/30', text: 'Running' },
		STOPPED: { color: 'text-gray-400', bg: 'bg-gray-800/50', text: 'Stopped' },
		PAUSED: { color: 'text-yellow-400', bg: 'bg-yellow-900/30', text: 'Paused' },
		ERROR: { color: 'text-red-400', bg: 'bg-red-900/30', text: 'Error' }
	};

	$: statusDisplay = statusConfig[status];
</script>

<div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-4 sm:p-6 border border-gray-700/50">
	<h3 class="text-base sm:text-lg font-semibold text-white mb-4">Bot Control</h3>

	<!-- Status Display -->
	<div class="mb-6">
		<p class="text-xs sm:text-sm text-gray-400 mb-2 uppercase tracking-wide">Scalper Status</p>
		<div class={`inline-flex items-center px-3 sm:px-4 py-2 rounded-full ${statusDisplay.bg} border border-gray-600`}>
			{#if isRunning}
				<div class="w-2 h-2 rounded-full bg-green-400 animate-pulse mr-2"></div>
			{/if}
			<span class={`font-semibold text-sm sm:text-base ${statusDisplay.color}`}>{statusDisplay.text}</span>
		</div>
	</div>

	<!-- Control Buttons -->
	<div class="flex flex-row gap-2 sm:gap-3">
		<button
			on:click={handleStart}
			disabled={!canStart}
			class="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:from-green-500 hover:to-green-600 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg text-xs sm:text-sm"
			class:opacity-50={!canStart}
		>
			{#if isRunning}
				✓ Running
			{:else}
				Start
			{/if}
		</button>

		<button
			on:click={handleStop}
			disabled={!canStop}
			class="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-medium hover:from-red-500 hover:to-red-600 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg text-xs sm:text-sm"
			class:opacity-50={!canStop}
		>
			Stop
		</button>
	</div>

	{#if safetyIndicator === 'RED' && !isRunning}
		<div class="mt-3 p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg text-xs sm:text-sm text-red-400">
			⚠️ Locked - Unsafe conditions
		</div>
	{:else if safetyIndicator === 'ORANGE' && isRunning}
		<div class="mt-3 p-2.5 bg-amber-900/20 border border-amber-500/50 rounded-lg text-xs sm:text-sm text-amber-400">
			⚡ Caution - Monitor closely
		</div>
	{/if}
</div>
