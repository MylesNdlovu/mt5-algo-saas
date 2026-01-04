<script lang="ts">
	export let pnl: {
		total: number;
		profit: number;
		commission: number;
		swap: number;
	};

	$: isProfit = pnl.total >= 0;
</script>

<div class="bg-white rounded-lg shadow p-6 mb-8">
	<h3 class="text-lg font-semibold mb-4">Profit & Loss Details</h3>

	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<div class="p-4 bg-gray-50 rounded-lg">
			<p class="text-sm text-gray-500 mb-1">Total P&L</p>
			<p class="text-xl font-bold" class:text-green-600={isProfit} class:text-red-600={!isProfit}>
				${pnl.total.toFixed(2)}
			</p>
		</div>

		<div class="p-4 bg-gray-50 rounded-lg">
			<p class="text-sm text-gray-500 mb-1">Gross Profit</p>
			<p class="text-xl font-bold" class:text-green-600={pnl.profit >= 0} class:text-red-600={pnl.profit < 0}>
				${pnl.profit.toFixed(2)}
			</p>
		</div>

		<div class="p-4 bg-gray-50 rounded-lg">
			<p class="text-sm text-gray-500 mb-1">Commission</p>
			<p class="text-xl font-bold text-gray-700">
				${pnl.commission.toFixed(2)}
			</p>
		</div>

		<div class="p-4 bg-gray-50 rounded-lg">
			<p class="text-sm text-gray-500 mb-1">Swap</p>
			<p class="text-xl font-bold" class:text-green-600={pnl.swap >= 0} class:text-red-600={pnl.swap < 0}>
				${pnl.swap.toFixed(2)}
			</p>
		</div>
	</div>
</div>
