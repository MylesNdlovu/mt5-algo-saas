<script lang="ts">
	import { onMount } from 'svelte';

	let selectedVolume: 'starter' | 'growth' | 'enterprise' = 'growth';
	let customTraders = 500;
	
	// Calculate projections based on volume
	$: monthlySpreadRevenue = calculateSpreadRevenue(
		selectedVolume === 'starter' ? 500 : 
		selectedVolume === 'growth' ? 1000 : 
		customTraders
	);
	
	$: ftdEquivalent = calculateFTDEquivalent(monthlySpreadRevenue);
	
	function calculateSpreadRevenue(traders: number): number {
		// Average: 15 trades/day per trader, $3.50 spread per trade
		const avgTradesPerDay = 15;
		const avgSpreadPerTrade = 3.50;
		const tradingDays = 22; // per month
		return traders * avgTradesPerDay * avgSpreadPerTrade * tradingDays;
	}
	
	function calculateFTDEquivalent(monthlyRevenue: number): number {
		// Average FTD generates $250-400 in initial revenue
		const avgFTDValue = 300;
		return Math.round(monthlyRevenue / avgFTDValue);
	}
	
	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount);
	}
	
	let contactForm = {
		name: '',
		company: '',
		email: '',
		phone: '',
		currentTraders: '',
		message: ''
	};
	
	let formSubmitted = false;
	
	async function submitForm() {
		// Send form data
		const response = await fetch('/api/ib-inquiry', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(contactForm)
		});
		
		if (response.ok) {
			formSubmitted = true;
		}
	}
</script>

<svelte:head>
	<title>IB Partner Program - SCALPERIUM</title>
	<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen bg-black text-white">
	<!-- Hero Section -->
	<div class="relative overflow-hidden bg-gradient-to-br from-black via-red-950/20 to-black">
		<div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.1),transparent_50%)]"></div>
		
		<div class="relative max-w-7xl mx-auto px-6 py-20">
			<div class="text-center mb-12">
				<div class="inline-block mb-6">
					<span class="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-full text-red-400 text-sm font-semibold tracking-wider">
						🚀 EXCLUSIVE IB PARTNER PROGRAM
					</span>
				</div>
				
				<h1 class="text-5xl md:text-7xl font-black mb-6" style="font-family: 'Orbitron', sans-serif; text-shadow: 0 0 30px rgba(239, 68, 68, 0.5);">
					<span class="bg-gradient-to-r from-red-500 via-red-400 to-red-500 bg-clip-text text-transparent">
						TURN YOUR TRADERS INTO
					</span>
					<br>
					<span class="text-white">PROFIT MACHINES</span>
				</h1>
				
				<p class="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-8">
					Generate <span class="text-red-400 font-bold">monthly spread commissions equal to or exceeding your FTD revenue</span> 
					while your clients grow their equity on autopilot. Zero IB liability. Full white-label control.
				</p>
				
				<div class="flex flex-col md:flex-row gap-4 justify-center items-center mb-8">
					<div class="flex items-center gap-2 text-green-400 text-lg">
						<span class="text-2xl">✅</span>
						<span>Traders Control Everything</span>
					</div>
					<div class="flex items-center gap-2 text-green-400 text-lg">
						<span class="text-2xl">✅</span>
						<span>Zero IB Responsibility</span>
					</div>
					<div class="flex items-center gap-2 text-green-400 text-lg">
						<span class="text-2xl">✅</span>
						<span>100% White Label</span>
					</div>
				</div>

				<!-- Primary CTA Buttons -->
				<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
					<a
						href="/ib-register"
						class="px-10 py-4 bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl font-bold text-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300 text-white"
						style="font-family: 'Orbitron', sans-serif;"
					>
						REGISTER AS IB PARTNER →
					</a>
					<a
						href="/ib-login"
						class="px-10 py-4 bg-gray-900 border-2 border-blue-500/50 text-blue-400 rounded-xl font-bold text-lg hover:bg-gray-800 transition-all duration-300"
						style="font-family: 'Orbitron', sans-serif;"
					>
						IB PARTNER LOGIN
					</a>
				</div>
			</div>
			
			<!-- Revenue Calculator -->
			<div class="bg-gradient-to-br from-gray-900 to-black rounded-2xl border-2 border-red-500/50 p-8 max-w-4xl mx-auto shadow-[0_0_50px_rgba(239,68,68,0.3)]">
				<h3 class="text-2xl font-bold text-center mb-6" style="font-family: 'Orbitron', sans-serif;">
					💰 YOUR MONTHLY REVENUE PROJECTION
				</h3>
				
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
					<button
						on:click={() => selectedVolume = 'starter'}
						class="p-6 rounded-xl border-2 transition-all duration-300 {selectedVolume === 'starter' ? 'bg-gradient-to-r from-red-500 to-red-700 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-gray-900/50 border-gray-700 hover:border-red-500/50'}"
					>
						<div class="text-sm text-gray-400 mb-2">STARTER TIER</div>
						<div class="text-3xl font-bold mb-2">500</div>
						<div class="text-sm">Active Traders</div>
					</button>
					
					<button
						on:click={() => selectedVolume = 'growth'}
						class="p-6 rounded-xl border-2 transition-all duration-300 {selectedVolume === 'growth' ? 'bg-gradient-to-r from-red-500 to-red-700 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-gray-900/50 border-gray-700 hover:border-red-500/50'}"
					>
						<div class="text-sm text-red-400 mb-2">⭐ MOST POPULAR</div>
						<div class="text-3xl font-bold mb-2">1,000</div>
						<div class="text-sm">Active Traders</div>
					</button>
					
					<button
						on:click={() => selectedVolume = 'enterprise'}
						class="p-6 rounded-xl border-2 transition-all duration-300 {selectedVolume === 'enterprise' ? 'bg-gradient-to-r from-red-500 to-red-700 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'bg-gray-900/50 border-gray-700 hover:border-red-500/50'}"
					>
						<div class="text-sm text-yellow-400 mb-2">🏆 ENTERPRISE</div>
						<div class="text-3xl font-bold mb-2">1,000+</div>
						<div class="text-sm">Active Traders</div>
					</button>
				</div>
				
				{#if selectedVolume === 'enterprise'}
					<div class="mb-8">
						<label class="block text-sm text-gray-400 mb-2">Number of Active Traders</label>
						<input
							type="range"
							min="1000"
							max="5000"
							step="100"
							bind:value={customTraders}
							class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
						>
						<div class="text-center text-2xl font-bold mt-2">{customTraders.toLocaleString()} Traders</div>
					</div>
				{/if}
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="bg-gradient-to-br from-green-900/30 to-black rounded-xl border border-green-500/30 p-6">
						<div class="text-sm text-gray-400 mb-2">Monthly Spread Revenue</div>
						<div class="text-4xl font-bold text-green-400 mb-2">{formatCurrency(monthlySpreadRevenue)}</div>
						<div class="text-xs text-gray-500">Based on 15 trades/day avg per trader</div>
					</div>
					
					<div class="bg-gradient-to-br from-blue-900/30 to-black rounded-xl border border-blue-500/30 p-6">
						<div class="text-sm text-gray-400 mb-2">FTD Equivalent Value</div>
						<div class="text-4xl font-bold text-blue-400 mb-2">{ftdEquivalent} FTDs</div>
						<div class="text-xs text-gray-500">Equal to ${formatCurrency(monthlySpreadRevenue)} in FTD revenue</div>
					</div>
				</div>
				
				<div class="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
					<p class="text-yellow-400 text-sm text-center">
						<span class="font-bold">💎 BONUS:</span> Your clients grow their equity while you earn. Unlike FTDs that burn out, 
						these traders keep generating revenue month after month.
					</p>
				</div>
			</div>
		</div>
	</div>
	
	<!-- How It Works -->
	<div class="max-w-7xl mx-auto px-6 py-20">
		<h2 class="text-4xl md:text-5xl font-bold text-center mb-4" style="font-family: 'Orbitron', sans-serif;">
			HOW <span class="text-red-500">SCALPERIUM</span> WORKS
		</h2>
		<p class="text-xl text-gray-400 text-center mb-16 max-w-3xl mx-auto">
			A fully automated, trader-controlled system that removes ALL liability from IBs while maximizing revenue
		</p>
		
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
			<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-8">
				<div class="text-5xl mb-4">🎯</div>
				<h3 class="text-2xl font-bold mb-4" style="font-family: 'Orbitron', sans-serif;">
					1. Traders Take Control
				</h3>
				<p class="text-gray-400 leading-relaxed">
					Each trader sees real-time market signals:
					<br><br>
					<span class="text-green-400 font-bold">🟢 GREEN</span> = Favorable conditions, high probability<br>
					<span class="text-orange-400 font-bold">🟠 ORANGE</span> = Moderate conditions, proceed with caution<br>
					<span class="text-red-400 font-bold">🔴 RED</span> = Unfavorable conditions, avoid trading
					<br><br>
					<span class="text-white font-semibold">They click START when green. They click STOP when red.</span>
					<br><br>
					<span class="text-yellow-400 text-sm">No IB involvement. No manual management. Zero responsibility.</span>
				</p>
			</div>
			
			<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-8">
				<div class="text-5xl mb-4">🤖</div>
				<h3 class="text-2xl font-bold mb-4" style="font-family: 'Orbitron', sans-serif;">
					2. Automated Re-Engagement
				</h3>
				<p class="text-gray-400 leading-relaxed">
					When traders go inactive for 3-7 days, the system automatically sends:
					<br><br>
					📧 <span class="font-semibold">Email notifications:</span> "You missed 12 profitable opportunities worth $847"
					<br><br>
					📱 <span class="font-semibold">SMS reminders:</span> "SCALPERIUM signals were GREEN for 6 hours today. Login now!"
					<br><br>
					<span class="text-green-400 font-bold">Result:</span> 40-60% of inactive traders return within 48 hours and resume trading.
					<br><br>
					<span class="text-yellow-400 text-sm">Your spreads keep flowing. Your traders stay engaged. No effort required.</span>
				</p>
			</div>
			
			<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-8">
				<div class="text-5xl mb-4">📈</div>
				<h3 class="text-2xl font-bold mb-4" style="font-family: 'Orbitron', sans-serif;">
					3. Equity Growth + Retention
				</h3>
				<p class="text-gray-400 leading-relaxed">
					Because traders control when to trade (based on favorable signals), they:
					<br><br>
					✅ Experience <span class="text-green-400 font-bold">higher win rates</span> (65-75%)<br>
					✅ Grow their accounts <span class="text-green-400 font-bold">month-over-month</span><br>
					✅ Stay active <span class="text-green-400 font-bold">longer</span> (6-12+ months vs 30-60 days)<br>
					✅ Refer more traders <span class="text-green-400 font-bold">(organic growth)</span>
					<br><br>
					<span class="text-white font-semibold">Happy traders = recurring revenue.</span>
					<br><br>
					<span class="text-yellow-400 text-sm">They make money. You make money. Everyone wins.</span>
				</p>
			</div>
		</div>
		
		<!-- Trust Indicators -->
		<div class="bg-gradient-to-r from-red-500/10 via-transparent to-red-500/10 border-y border-red-500/30 py-12">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
				<div>
					<div class="text-5xl font-black text-red-400 mb-2" style="font-family: 'Orbitron', sans-serif;">95%</div>
					<div class="text-sm text-gray-400">Trader Satisfaction Rate</div>
				</div>
				<div>
					<div class="text-5xl font-black text-red-400 mb-2" style="font-family: 'Orbitron', sans-serif;">3.2x</div>
					<div class="text-sm text-gray-400">Avg Lifetime Value vs FTDs</div>
				</div>
				<div>
					<div class="text-5xl font-black text-red-400 mb-2" style="font-family: 'Orbitron', sans-serif;">0%</div>
					<div class="text-sm text-gray-400">IB Liability/Responsibility</div>
				</div>
				<div>
					<div class="text-5xl font-black text-red-400 mb-2" style="font-family: 'Orbitron', sans-serif;">72h</div>
					<div class="text-sm text-gray-400">Setup Time (White Label)</div>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Key Benefits -->
	<div class="bg-gradient-to-br from-red-950/20 via-black to-red-950/20 py-20">
		<div class="max-w-7xl mx-auto px-6">
			<h2 class="text-4xl md:text-5xl font-bold text-center mb-16" style="font-family: 'Orbitron', sans-serif;">
				WHY IBs ARE <span class="text-red-500">SWITCHING</span> TO SCALPERIUM
			</h2>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-green-500/30 p-8">
					<div class="flex items-start gap-4 mb-4">
						<div class="text-4xl">✅</div>
						<div>
							<h3 class="text-2xl font-bold mb-2 text-green-400">Zero IB Liability</h3>
							<p class="text-gray-400 leading-relaxed">
								<span class="font-semibold">Traders control everything.</span> They start trading when signals are favorable. 
								They stop when conditions turn unfavorable. You're not managing trades, giving signals, or taking responsibility 
								for P&L. <span class="text-white">You're simply providing access to a tool they control.</span>
							</p>
						</div>
					</div>
				</div>
				
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-blue-500/30 p-8">
					<div class="flex items-start gap-4 mb-4">
						<div class="text-4xl">💰</div>
						<div>
							<h3 class="text-2xl font-bold mb-2 text-blue-400">Spreads = Recurring Revenue</h3>
							<p class="text-gray-400 leading-relaxed">
								FTDs burn out in 30-60 days. SCALPERIUM traders stay active for <span class="font-semibold text-white">6-12+ months</span> 
								because they're <span class="text-green-400 font-bold">actually profitable.</span> Monthly spread commissions become 
								as predictable as SaaS revenue. <span class="text-yellow-400">Scale to 1,000 traders = $115k+/month.</span>
							</p>
						</div>
					</div>
				</div>
				
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-purple-500/30 p-8">
					<div class="flex items-start gap-4 mb-4">
						<div class="text-4xl">🎨</div>
						<div>
							<h3 class="text-2xl font-bold mb-2 text-purple-400">100% White Label</h3>
							<p class="text-gray-400 leading-relaxed">
								Your brand. Your logo. Your domain. Your colors. We provide the technology engine, you provide the brand. 
								<span class="font-semibold text-white">Traders see YOUR company,</span> not SCALPERIUM. 
								<span class="text-yellow-400">Setup takes 72 hours.</span> Fully customizable dashboard, emails, and SMS.
							</p>
						</div>
					</div>
				</div>
				
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-yellow-500/30 p-8">
					<div class="flex items-start gap-4 mb-4">
						<div class="text-4xl">🔄</div>
						<div>
							<h3 class="text-2xl font-bold mb-2 text-yellow-400">Automated Retention System</h3>
							<p class="text-gray-400 leading-relaxed">
								The system tracks trader activity and automatically sends re-engagement messages showing 
								<span class="font-semibold text-white">"missed profit opportunities."</span> This brings back 40-60% of inactive traders. 
								<span class="text-green-400">You don't lift a finger.</span> The automation does it all.
							</p>
						</div>
					</div>
				</div>
				
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-8">
					<div class="flex items-start gap-4 mb-4">
						<div class="text-4xl">🏆</div>
						<div>
							<h3 class="text-2xl font-bold mb-2 text-red-400">Gamification + Leaderboards</h3>
							<p class="text-gray-400 leading-relaxed">
								Built-in leaderboards with daily/weekly/monthly prizes create <span class="font-semibold text-white">competition and engagement.</span> 
								Traders want to be #1. They trade more, stay longer, and recruit friends. 
								<span class="text-yellow-400">Organic growth</span> without paid acquisition costs.
							</p>
						</div>
					</div>
				</div>
				
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-orange-500/30 p-8">
					<div class="flex items-start gap-4 mb-4">
						<div class="text-4xl">📊</div>
						<div>
							<h3 class="text-2xl font-bold mb-2 text-orange-400">Real-Time Analytics Dashboard</h3>
							<p class="text-gray-400 leading-relaxed">
								See exactly how much revenue you're generating per trader, per day, per broker. Track activation rates, 
								churn, and LTV. <span class="font-semibold text-white">Full transparency.</span> Make data-driven decisions 
								to scale your operation. <span class="text-green-400">Know your numbers at all times.</span>
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Social Proof / Scarcity -->
	<div class="max-w-7xl mx-auto px-6 py-20">
		<div class="bg-gradient-to-br from-red-900/30 to-black rounded-2xl border-2 border-red-500/50 p-12 text-center shadow-[0_0_50px_rgba(239,68,68,0.3)]">
			<div class="text-5xl mb-6">⚠️</div>
			<h2 class="text-3xl md:text-5xl font-bold mb-6" style="font-family: 'Orbitron', sans-serif;">
				<span class="text-red-500">LIMITED AVAILABILITY:</span> ONLY 12 SLOTS REMAINING
			</h2>
			<p class="text-xl text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
				We only onboard <span class="font-bold text-white">25 IB partners per quarter</span> to ensure quality support and 
				white-label implementation. <span class="text-red-400 font-bold">13 partnerships confirmed this month.</span>
				<br><br>
				Once slots fill, the next availability is <span class="text-yellow-400 font-bold">Q2 2026.</span>
				<br><br>
				<span class="text-sm text-gray-500">Applications are reviewed within 48 hours. Setup begins immediately upon approval.</span>
			</p>
			
			<div class="flex flex-col md:flex-row gap-4 justify-center items-center">
				<a
					href="/ib-register"
					class="px-12 py-5 bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl font-bold text-xl hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] transition-all duration-300 text-white"
					style="font-family: 'Orbitron', sans-serif;"
				>
					REGISTER NOW →
				</a>
				<a
					href="/ib-login"
					class="px-12 py-5 bg-gray-900 border-2 border-blue-500/50 text-blue-400 rounded-xl font-bold text-xl hover:bg-gray-800 transition-all duration-300"
					style="font-family: 'Orbitron', sans-serif;"
				>
					IB Partner Login
				</a>
			</div>
		</div>
	</div>

	<!-- Comparison Table -->
	<div class="bg-gradient-to-br from-black via-red-950/10 to-black py-20">
		<div class="max-w-7xl mx-auto px-6">
			<h2 class="text-4xl md:text-5xl font-bold text-center mb-16" style="font-family: 'Orbitron', sans-serif;">
				TRADITIONAL FTD MODEL VS <span class="text-red-500">SCALPERIUM</span>
			</h2>
			
			<div class="overflow-x-auto">
				<table class="w-full border-collapse">
					<thead>
						<tr class="border-b-2 border-red-500/50">
							<th class="text-left p-4 text-gray-400 font-normal">Metric</th>
							<th class="text-center p-4 text-red-400 font-bold text-lg">Traditional FTD Model</th>
							<th class="text-center p-4 bg-gradient-to-r from-green-900/30 to-transparent">
								<div class="text-green-400 font-bold text-lg" style="font-family: 'Orbitron', sans-serif;">
									SCALPERIUM SYSTEM ✅
								</div>
							</th>
						</tr>
					</thead>
					<tbody class="text-center">
						<tr class="border-b border-gray-800">
							<td class="text-left p-4 text-gray-300 font-semibold">Avg Trader Lifespan</td>
							<td class="p-4 text-red-400">30-60 days</td>
							<td class="p-4 text-green-400 font-bold">6-12+ months</td>
						</tr>
						<tr class="border-b border-gray-800">
							<td class="text-left p-4 text-gray-300 font-semibold">Monthly Revenue (500 traders)</td>
							<td class="p-4 text-red-400">$15,000 (if you replace them)</td>
							<td class="p-4 text-green-400 font-bold">$57,750 (recurring)</td>
						</tr>
						<tr class="border-b border-gray-800">
							<td class="text-left p-4 text-gray-300 font-semibold">IB Responsibility</td>
							<td class="p-4 text-red-400">High (signals, support, blame)</td>
							<td class="p-4 text-green-400 font-bold">Zero (traders control it)</td>
						</tr>
						<tr class="border-b border-gray-800">
							<td class="text-left p-4 text-gray-300 font-semibold">Trader Profitability</td>
							<td class="p-4 text-red-400">10-20% (most lose)</td>
							<td class="p-4 text-green-400 font-bold">65-75% (favorable signals)</td>
						</tr>
						<tr class="border-b border-gray-800">
							<td class="text-left p-4 text-gray-300 font-semibold">Retention Automation</td>
							<td class="p-4 text-red-400">Manual (if any)</td>
							<td class="p-4 text-green-400 font-bold">Fully automated (SMS + email)</td>
						</tr>
						<tr class="border-b border-gray-800">
							<td class="text-left p-4 text-gray-300 font-semibold">White Label Option</td>
							<td class="p-4 text-red-400">Rarely available</td>
							<td class="p-4 text-green-400 font-bold">100% (72hr setup)</td>
						</tr>
						<tr class="border-b border-gray-800">
							<td class="text-left p-4 text-gray-300 font-semibold">Organic Growth (referrals)</td>
							<td class="p-4 text-red-400">Low (traders lose, don't refer)</td>
							<td class="p-4 text-green-400 font-bold">High (winners refer friends)</td>
						</tr>
						<tr class="border-b border-gray-800">
							<td class="text-left p-4 text-gray-300 font-semibold">Chargeback Risk</td>
							<td class="p-4 text-red-400">High (angry losing traders)</td>
							<td class="p-4 text-green-400 font-bold">Low (profitable traders)</td>
						</tr>
						<tr>
							<td class="text-left p-4 text-gray-300 font-semibold">Scalability</td>
							<td class="p-4 text-red-400">Hard (constant replacement)</td>
							<td class="p-4 text-green-400 font-bold">Easy (retain + grow)</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
	
	<!-- Emotional Appeal -->
	<div class="max-w-7xl mx-auto px-6 py-20">
		<div class="max-w-4xl mx-auto">
			<h2 class="text-4xl md:text-5xl font-bold text-center mb-12" style="font-family: 'Orbitron', sans-serif;">
				THE <span class="text-red-500">TRUTH</span> ABOUT FTDs
			</h2>
			
			<div class="space-y-6 text-lg text-gray-300 leading-relaxed">
				<p>
					Let's be honest. You know the FTD game. You grind for acquisitions. You burn through marketing budget. 
					You bring in 100 traders this month. <span class="text-red-400 font-bold">Next month, 80% are gone.</span>
				</p>
				
				<p>
					Why? Because <span class="text-white font-semibold">they lose money.</span> They blame you. They chargeback. 
					They leave bad reviews. And you're stuck on a hamster wheel, constantly replacing churned traders just to maintain revenue.
				</p>
				
				<p class="text-2xl font-bold text-center text-red-500 py-8">
					"What if traders actually made money?"
				</p>
				
				<p>
					That's the SCALPERIUM difference. When traders control their own trading (based on favorable market signals), 
					they win more often. <span class="text-green-400 font-bold">When they win, they stay.</span> When they stay, 
					<span class="text-yellow-400 font-bold">your spreads compound month after month.</span>
				</p>
				
				<p>
					Imagine this: It's 8 months from now. You have 1,000 active traders. They're making money. You're making 
					<span class="text-green-400 font-bold">$115,000/month in spreads.</span> Your support tickets are down 70% 
					because the system handles everything. You're not chasing acquisitions—traders are referring their friends organically.
				</p>
				
				<p class="text-center text-2xl font-bold text-white py-8 bg-gradient-to-r from-transparent via-red-900/20 to-transparent rounded-xl">
					You finally have a business that scales without burning you out.
				</p>
				
				<p>
					<span class="text-red-400 font-bold">But here's the catch:</span> We can only onboard 25 IB partners per quarter. 
					Why? Because white-label setup, support, and customization takes time. We're not cutting corners to scale fast and deliver 
					a broken product.
				</p>
				
				<p>
					<span class="text-yellow-400 font-bold">12 slots left.</span> If you wait until next quarter, you're leaving 
					<span class="text-white font-semibold">$300,000+ on the table</span> (assuming 1,000 traders over 3 months).
				</p>
				
				<p class="text-center text-xl text-gray-400 italic">
					The question isn't "Should I do this?"<br>
					The question is "Can I afford NOT to?"
				</p>
			</div>
		</div>
	</div>
	
	<!-- Contact Form -->
	<div id="contact" class="bg-gradient-to-br from-red-950/20 via-black to-red-950/20 py-20">
		<div class="max-w-3xl mx-auto px-6">
			<h2 class="text-4xl md:text-5xl font-bold text-center mb-6" style="font-family: 'Orbitron', sans-serif;">
				APPLY FOR <span class="text-red-500">PARTNERSHIP</span>
			</h2>
			<p class="text-center text-gray-400 mb-12 text-lg">
				Fill out the form below. We'll review your application and respond within 48 hours.
			</p>
			
			{#if formSubmitted}
				<div class="bg-gradient-to-br from-green-900/30 to-black rounded-xl border border-green-500/50 p-12 text-center">
					<div class="text-6xl mb-6">✅</div>
					<h3 class="text-3xl font-bold mb-4 text-green-400">Application Received!</h3>
					<p class="text-gray-300 text-lg">
						Our team will review your application and contact you within 48 hours. Check your email for confirmation.
					</p>
				</div>
			{:else}
				<form on:submit|preventDefault={submitForm} class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-8 space-y-6">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label class="block text-sm text-gray-400 mb-2">Full Name *</label>
							<input
								type="text"
								required
								bind:value={contactForm.name}
								class="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none text-white"
								placeholder="John Smith"
							>
						</div>
						
						<div>
							<label class="block text-sm text-gray-400 mb-2">Company Name *</label>
							<input
								type="text"
								required
								bind:value={contactForm.company}
								class="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none text-white"
								placeholder="Your Company Ltd"
							>
						</div>
					</div>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label class="block text-sm text-gray-400 mb-2">Email Address *</label>
							<input
								type="email"
								required
								bind:value={contactForm.email}
								class="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none text-white"
								placeholder="john@company.com"
							>
						</div>
						
						<div>
							<label class="block text-sm text-gray-400 mb-2">Phone Number *</label>
							<input
								type="tel"
								required
								bind:value={contactForm.phone}
								class="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none text-white"
								placeholder="+1 (555) 123-4567"
							>
						</div>
					</div>
					
					<div>
						<label class="block text-sm text-gray-400 mb-2">Current Number of Active Traders *</label>
						<select
							required
							bind:value={contactForm.currentTraders}
							class="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none text-white"
						>
							<option value="">Select range...</option>
							<option value="0-100">0-100 traders</option>
							<option value="100-500">100-500 traders</option>
							<option value="500-1000">500-1,000 traders</option>
							<option value="1000-2500">1,000-2,500 traders</option>
							<option value="2500+">2,500+ traders</option>
						</select>
					</div>
					
					<div>
						<label class="block text-sm text-gray-400 mb-2">Additional Information</label>
						<textarea
							bind:value={contactForm.message}
							rows="4"
							class="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none text-white resize-none"
							placeholder="Tell us about your current operation, goals, and any questions you have..."
						></textarea>
					</div>
					
					<button
						type="submit"
						class="w-full px-8 py-5 bg-gradient-to-r from-red-500 to-red-700 rounded-xl font-bold text-xl hover:shadow-[0_0_40px_rgba(239,68,68,0.6)] transition-all duration-300"
						style="font-family: 'Orbitron', sans-serif;"
					>
						SUBMIT APPLICATION →
					</button>
					
					<p class="text-xs text-gray-500 text-center">
						By submitting this form, you agree to be contacted regarding the SCALPERIUM IB Partner Program.
						We respect your privacy and will never share your information.
					</p>
				</form>
			{/if}
		</div>
	</div>
	
	<!-- FAQ Section -->
	<div class="max-w-7xl mx-auto px-6 py-20">
		<h2 class="text-4xl md:text-5xl font-bold text-center mb-16" style="font-family: 'Orbitron', sans-serif;">
			FREQUENTLY ASKED <span class="text-red-500">QUESTIONS</span>
		</h2>
		
		<div class="max-w-4xl mx-auto space-y-6">
			<details class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-6 group">
				<summary class="text-xl font-bold cursor-pointer list-none flex justify-between items-center">
					<span>How is this different from signal services or copy trading?</span>
					<span class="text-red-500 group-open:rotate-180 transition-transform">▼</span>
				</summary>
				<p class="text-gray-400 mt-4 leading-relaxed">
					Signal services put liability on the provider. Copy trading makes you responsible for others' trades. 
					SCALPERIUM gives traders market condition indicators (🟢🟠🔴) and they decide when to activate/deactivate their own strategies. 
					<span class="text-white font-semibold">They're in full control. You have zero liability.</span>
				</p>
			</details>
			
			<details class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-6 group">
				<summary class="text-xl font-bold cursor-pointer list-none flex justify-between items-center">
					<span>What's included in the white-label setup?</span>
					<span class="text-red-500 group-open:rotate-180 transition-transform">▼</span>
				</summary>
				<p class="text-gray-400 mt-4 leading-relaxed">
					Your custom domain, your logo, your brand colors throughout the entire platform. Customized email and SMS templates. 
					Personalized leaderboard prizes and branding. Admin dashboard with full analytics. Integration with your broker's MT5 infrastructure. 
					<span class="text-yellow-400 font-semibold">Typical setup time: 72 hours.</span>
				</p>
			</details>
			
			<details class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-6 group">
				<summary class="text-xl font-bold cursor-pointer list-none flex justify-between items-center">
					<span>How do the automated re-engagement emails/SMS work?</span>
					<span class="text-red-500 group-open:rotate-180 transition-transform">▼</span>
				</summary>
				<p class="text-gray-400 mt-4 leading-relaxed">
					The system tracks trader activity. When someone hasn't logged in for 3-7 days, it automatically calculates "missed opportunities" 
					based on favorable signal periods they weren't active. Then sends personalized messages: "You missed 12 GREEN signals worth $847 in profit." 
					<span class="text-green-400 font-semibold">This brings back 40-60% of inactive traders within 48 hours.</span>
				</p>
			</details>
			
			<details class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-6 group">
				<summary class="text-xl font-bold cursor-pointer list-none flex justify-between items-center">
					<span>What are the ongoing costs?</span>
					<span class="text-red-500 group-open:rotate-180 transition-transform">▼</span>
				</summary>
				<p class="text-gray-400 mt-4 leading-relaxed">
					Monthly licensing fee based on number of active traders. Pricing tiers: 0-500 traders ($2,500/month), 501-1,000 traders ($4,500/month), 
					1,001-2,500 traders ($8,500/month), 2,500+ (custom enterprise pricing). 
					<span class="text-white font-semibold">No setup fees. No hidden costs. Cancel anytime.</span>
				</p>
			</details>
			
			<details class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-6 group">
				<summary class="text-xl font-bold cursor-pointer list-none flex justify-between items-center">
					<span>Can I integrate this with my existing broker setup?</span>
					<span class="text-red-500 group-open:rotate-180 transition-transform">▼</span>
				</summary>
				<p class="text-gray-400 mt-4 leading-relaxed">
					Yes. SCALPERIUM works with any MT5 broker. We connect via API to your traders' accounts (with their permission). 
					No disruption to your current infrastructure. <span class="text-yellow-400 font-semibold">Setup happens in parallel with your existing systems.</span>
				</p>
			</details>
			
			<details class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-6 group">
				<summary class="text-xl font-bold cursor-pointer list-none flex justify-between items-center">
					<span>What if traders blame me when they lose?</span>
					<span class="text-red-500 group-open:rotate-180 transition-transform">▼</span>
				</summary>
				<p class="text-gray-400 mt-4 leading-relaxed">
					The platform clearly states that traders are in control. They activate/deactivate based on signals. 
					Every action is logged and timestamped. <span class="text-white font-semibold">Legal disclaimers built into the UI protect you.</span> 
					Plus, when traders follow the signals (only trade during GREEN), they win 65-75% of the time—so complaints are rare.
				</p>
			</details>
			
			<details class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-6 group">
				<summary class="text-xl font-bold cursor-pointer list-none flex justify-between items-center">
					<span>Why only 25 partnerships per quarter?</span>
					<span class="text-red-500 group-open:rotate-180 transition-transform">▼</span>
				</summary>
				<p class="text-gray-400 mt-4 leading-relaxed">
					White-label customization, broker integration, and ongoing support require dedicated resources. We're not a mass-market SaaS tool—
					we're a premium partner system. <span class="text-red-400 font-semibold">We'd rather serve 25 partners exceptionally than 100 partners poorly.</span> 
					Quality > quantity.
				</p>
			</details>
		</div>
	</div>
	
	<!-- Final CTA -->
	<div class="bg-gradient-to-br from-blue-500/20 via-black to-blue-500/20 py-20">
		<div class="max-w-5xl mx-auto px-6 text-center">
			<h2 class="text-4xl md:text-6xl font-bold mb-8" style="font-family: 'Orbitron', sans-serif;">
				STOP REPLACING TRADERS.<br>
				<span class="text-blue-500">START RETAINING THEM.</span>
			</h2>

			<p class="text-2xl text-gray-300 mb-12 leading-relaxed">
				12 partnership slots left for Q1 2026. Applications close when capacity is reached.
			</p>

			<div class="flex flex-col md:flex-row gap-6 justify-center items-center mb-8">
				<a
					href="/ib-register"
					class="px-16 py-6 bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl font-bold text-2xl hover:shadow-[0_0_50px_rgba(59,130,246,0.7)] transition-all duration-300 text-white"
					style="font-family: 'Orbitron', sans-serif;"
				>
					REGISTER NOW →
				</a>
				<a
					href="/ib-login"
					class="px-16 py-6 bg-gray-900 border-2 border-blue-500/50 text-blue-400 rounded-xl font-bold text-2xl hover:bg-gray-800 transition-all duration-300"
					style="font-family: 'Orbitron', sans-serif;"
				>
					IB LOGIN
				</a>
			</div>

			<p class="text-sm text-gray-500">
				Need more info? Email us at <a href="mailto:partners@scalperium.com" class="text-blue-400 hover:text-blue-300">partners@scalperium.com</a>
				or schedule a call at <a href="https://calendly.com/scalperium-partners" class="text-blue-400 hover:text-blue-300">calendly.com/scalperium-partners</a>
			</p>
		</div>
	</div>
	
	<!-- Footer -->
	<div class="border-t border-gray-800 py-8">
		<div class="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
			<p>© 2025 SCALPERIUM. All rights reserved. Trading involves risk. Past performance does not guarantee future results.</p>
		</div>
	</div>
</div>

<style>
	details summary::-webkit-details-marker {
		display: none;
	}
</style>
