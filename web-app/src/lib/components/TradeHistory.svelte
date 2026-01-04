<script lang="ts">
	export let trades: {
		open: any[];
		closed: any[];
	};

	let activeTab: 'open' | 'closed' = 'open';

	function formatDate(date: string) {
		return new Date(date).toLocaleString();
	}
</script>

<div class="bg-white rounded-lg shadow">
	<div class="border-b border-gray-200">
		<div class="flex">
			<button
				on:click={() => (activeTab = 'open')}
				class="flex-1 px-6 py-4 text-center font-semibold transition"
				class:border-b-2={activeTab === 'open'}
				class:border-primary-600={activeTab === 'open'}
				class:text-primary-600={activeTab === 'open'}
				class:text-gray-500={activeTab !== 'open'}
			>
				Open Trades ({trades.open.length})
			</button>
			<button
				on:click={() => (activeTab = 'closed')}
				class="flex-1 px-6 py-4 text-center font-semibold transition"
				class:border-b-2={activeTab === 'closed'}
				class:border-primary-600={activeTab === 'closed'}
				class:text-primary-600={activeTab === 'closed'}
				class:text-gray-500={activeTab !== 'closed'}
			>
				Closed Trades ({trades.closed.length})
			</button>
		</div>
	</div>

	<div class="p-6">
		{#if activeTab === 'open'}
			{#if trades.open.length === 0}
				<p class="text-center text-gray-500 py-8">No open trades</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full">
						<thead>
							<tr class="border-b border-gray-200">
								<th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ticket</th>
								<th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Symbol</th>
								<th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
								<th class="text-right py-3 px-4 text-sm font-semibold text-gray-700">Volume</th>
								<th class="text-right py-3 px-4 text-sm font-semibold text-gray-700">Open Price</th>
								<th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Open Time</th>
								<th class="text-right py-3 px-4 text-sm font-semibold text-gray-700">P&L</th>
							</tr>
						</thead>
						<tbody>
							{#each trades.open as trade}
								<tr class="border-b border-gray-100 hover:bg-gray-50">
									<td class="py-3 px-4 text-sm">{trade.ticket}</td>
									<td class="py-3 px-4 text-sm font-medium">{trade.symbol}</td>
									<td class="py-3 px-4 text-sm">
										<span class="px-2 py-1 rounded text-xs font-semibold"
											class:bg-green-100={trade.type === 'BUY'}
											class:text-green-700={trade.type === 'BUY'}
											class:bg-red-100={trade.type === 'SELL'}
											class:text-red-700={trade.type === 'SELL'}
										>
											{trade.type}
										</span>
									</td>
									<td class="py-3 px-4 text-sm text-right">{trade.volume}</td>
									<td class="py-3 px-4 text-sm text-right">{trade.openPrice.toFixed(5)}</td>
									<td class="py-3 px-4 text-sm">{formatDate(trade.openTime)}</td>
									<td class="py-3 px-4 text-sm text-right font-semibold"
										class:text-green-600={trade.profit >= 0}
										class:text-red-600={trade.profit < 0}
									>
										${trade.profit.toFixed(2)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{:else}
			{#if trades.closed.length === 0}
				<p class="text-center text-gray-500 py-8">No closed trades</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full">
						<thead>
							<tr class="border-b border-gray-200">
								<th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ticket</th>
								<th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Symbol</th>
								<th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
								<th class="text-right py-3 px-4 text-sm font-semibold text-gray-700">Volume</th>
								<th class="text-right py-3 px-4 text-sm font-semibold text-gray-700">Open</th>
								<th class="text-right py-3 px-4 text-sm font-semibold text-gray-700">Close</th>
								<th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Close Time</th>
								<th class="text-right py-3 px-4 text-sm font-semibold text-gray-700">P&L</th>
							</tr>
						</thead>
						<tbody>
							{#each trades.closed as trade}
								<tr class="border-b border-gray-100 hover:bg-gray-50">
									<td class="py-3 px-4 text-sm">{trade.ticket}</td>
									<td class="py-3 px-4 text-sm font-medium">{trade.symbol}</td>
									<td class="py-3 px-4 text-sm">
										<span class="px-2 py-1 rounded text-xs font-semibold"
											class:bg-green-100={trade.type === 'BUY'}
											class:text-green-700={trade.type === 'BUY'}
											class:bg-red-100={trade.type === 'SELL'}
											class:text-red-700={trade.type === 'SELL'}
										>
											{trade.type}
										</span>
									</td>
									<td class="py-3 px-4 text-sm text-right">{trade.volume}</td>
									<td class="py-3 px-4 text-sm text-right">{trade.openPrice.toFixed(5)}</td>
									<td class="py-3 px-4 text-sm text-right">{trade.closePrice?.toFixed(5) || '-'}</td>
									<td class="py-3 px-4 text-sm">{trade.closeTime ? formatDate(trade.closeTime) : '-'}</td>
									<td class="py-3 px-4 text-sm text-right font-semibold"
										class:text-green-600={trade.profit >= 0}
										class:text-red-600={trade.profit < 0}
									>
										${trade.profit.toFixed(2)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{/if}
	</div>
</div>
