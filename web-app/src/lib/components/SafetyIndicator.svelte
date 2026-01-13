<script lang="ts">
	export let indicator: 'RED' | 'ORANGE' | 'GREEN';

	const indicatorConfig = {
		RED: {
			color: 'bg-red-500',
			text: 'UNSAFE',
			description: 'Market conditions are not favorable. EA trading is disabled.',
			icon: '⚠️'
		},
		ORANGE: {
			color: 'bg-amber-500',
			text: 'CAUTION',
			description: 'Market conditions require careful monitoring. Proceed with care.',
			icon: '⚡'
		},
		GREEN: {
			color: 'bg-green-500',
			text: 'SAFE',
			description: 'Market conditions are favorable. Safe to trade.',
			icon: '✓'
		}
	};

	$: config = indicatorConfig[indicator];
</script>

<div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-lg p-4 sm:p-6 border border-gray-700/50">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-base sm:text-lg font-semibold text-white">Market Status</h3>
		<div class="flex items-center space-x-2">
			<div class={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${config.color} animate-pulse`}></div>
			<span class="text-xl sm:text-2xl">{config.icon}</span>
		</div>
	</div>

	<div class="mb-4">
		<div class={`inline-block px-3 sm:px-4 py-1 sm:py-2 rounded-full ${config.color} text-white font-bold text-sm sm:text-lg`}>
			{config.text}
		</div>
	</div>

	<p class="text-gray-300 text-sm sm:text-base">{config.description}</p>

	<div class="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-700">
		<div class="flex justify-between text-xs text-gray-400">
			<div class="flex items-center gap-1.5">
				<div class="w-2 h-2 rounded-full bg-green-500"></div>
				<span>Safe</span>
			</div>
			<div class="flex items-center gap-1.5">
				<div class="w-2 h-2 rounded-full bg-amber-500"></div>
				<span>Caution</span>
			</div>
			<div class="flex items-center gap-1.5">
				<div class="w-2 h-2 rounded-full bg-red-500"></div>
				<span>Unsafe</span>
			</div>
		</div>
	</div>
</div>
