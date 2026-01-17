<script lang="ts">
	export let indicator: 'RED' | 'ORANGE' | 'GREEN';
	export let score: number = 0; // 0-100 score from indicator
	export let compact: boolean = false; // Compact mode for smaller displays

	const indicatorConfig = {
		RED: {
			color: 'bg-red-500',
			ringColor: 'ring-red-500/30',
			textColor: 'text-red-400',
			text: 'UNSAFE',
			description: 'Market choppy/unpredictable. EA trading paused.',
			icon: '⚠️'
		},
		ORANGE: {
			color: 'bg-amber-500',
			ringColor: 'ring-amber-500/30',
			textColor: 'text-amber-400',
			text: 'CAUTION',
			description: 'Proceed with care. Monitoring market conditions.',
			icon: '⚡'
		},
		GREEN: {
			color: 'bg-green-500',
			ringColor: 'ring-green-500/30',
			textColor: 'text-green-400',
			text: 'OPTIMAL',
			description: 'Market conditions favorable for scalping.',
			icon: '✓'
		}
	};

	$: config = indicatorConfig[indicator];
	$: scoreDisplay = Math.round(score);
</script>

{#if compact}
	<!-- Compact Mode - Just the traffic light -->
	<div class="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50">
		<div class={`w-4 h-4 rounded-full ${config.color} animate-pulse ring-4 ${config.ringColor}`}></div>
		<div class="flex items-center gap-2">
			<span class={`font-semibold ${config.textColor}`}>{config.text}</span>
			<span class="text-gray-400 text-sm">({scoreDisplay}%)</span>
		</div>
	</div>
{:else}
	<!-- Full Mode - Card with details -->
	<div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-4 sm:p-6 border border-gray-700/50">
		<div class="flex items-center justify-between mb-4">
			<h3 class="text-base sm:text-lg font-semibold text-white">Market Status</h3>
			<div class="flex items-center space-x-2">
				<div class={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${config.color} animate-pulse ring-4 ${config.ringColor}`}></div>
				<span class="text-xl sm:text-2xl">{config.icon}</span>
			</div>
		</div>

		<!-- Score Display -->
		<div class="mb-4 flex items-center gap-4">
			<div class={`inline-block px-3 sm:px-4 py-1 sm:py-2 rounded-full ${config.color} text-white font-bold text-sm sm:text-lg`}>
				{config.text}
			</div>
			<div class="flex items-center gap-2">
				<span class="text-2xl sm:text-3xl font-bold text-white">{scoreDisplay}</span>
				<span class="text-gray-400 text-sm">/ 100</span>
			</div>
		</div>

		<!-- Score Bar -->
		<div class="mb-4">
			<div class="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
				<div
					class={`h-full ${config.color} transition-all duration-500 ease-out`}
					style="width: {scoreDisplay}%"
				></div>
			</div>
			<div class="flex justify-between text-xs text-gray-500 mt-1">
				<span>0</span>
				<span class="text-amber-500">40</span>
				<span class="text-green-500">70</span>
				<span>100</span>
			</div>
		</div>

		<p class="text-gray-300 text-sm sm:text-base">{config.description}</p>

		<div class="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-700">
			<div class="flex justify-between text-xs text-gray-400">
				<div class="flex items-center gap-1.5">
					<div class="w-2 h-2 rounded-full bg-red-500"></div>
					<span>&lt;40% Unsafe</span>
				</div>
				<div class="flex items-center gap-1.5">
					<div class="w-2 h-2 rounded-full bg-amber-500"></div>
					<span>40-70% Caution</span>
				</div>
				<div class="flex items-center gap-1.5">
					<div class="w-2 h-2 rounded-full bg-green-500"></div>
					<span>&gt;70% Optimal</span>
				</div>
			</div>
		</div>
	</div>
{/if}
