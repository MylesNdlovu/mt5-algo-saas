<script lang="ts">
	import { goto } from '$app/navigation';
	import Navigation from '$lib/components/Navigation.svelte';
</script>

<svelte:head>
	<title>IB Partner Program - SCALPERIUM</title>
</svelte:head>

<Navigation />

<div class="min-h-screen bg-black text-white">
	<!-- Hero Section -->
	<div class="bg-gradient-to-br from-gray-900 via-black to-red-900/20 py-20">
		<div class="max-w-6xl mx-auto px-8 text-center">
			<h1 class="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
				SCALPERIUM IB PARTNER PROGRAM
			</h1>
			<p class="text-2xl md:text-3xl text-gray-300 mb-4">
				Transform Your FTD Revenue Model Into Sustainable Monthly Recurring Income
			</p>
			<div class="flex flex-col md:flex-row gap-4 justify-center mt-8">
				<a
					href="/ib-register"
					class="px-8 py-4 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 rounded-lg font-bold text-lg transition-all shadow-lg"
				>
					Apply Now
				</a>
				<a
					href="http://localhost:5173"
					target="_blank"
					class="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-lg transition-all"
				>
					🎯 Preview Live Demo
				</a>
			</div>
		</div>
	</div>

	<!-- The Problem Section -->
	<div class="max-w-6xl mx-auto px-8 py-16">
		<div class="bg-gray-900 border border-red-500/30 rounded-lg p-8 mb-12">
			<h2 class="text-3xl font-bold mb-6 text-red-400">THE PROBLEM YOU'RE FACING</h2>
			<p class="text-gray-300 text-lg mb-4">
				You're grinding to acquire new traders every month. You bring in 100 FTDs, they burn out in 30-60 days, and you're back to square one. Your monthly revenue looks like a roller coaster instead of a growth curve.
			</p>
			<p class="text-xl font-bold text-red-500">
				The traditional FTD model is broken.
			</p>
		</div>

		<!-- Revenue Projections -->
		<h2 class="text-4xl font-bold mb-8 text-center">YOUR REVENUE PROJECTIONS</h2>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
			<div class="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-6">
				<div class="text-center">
					<div class="text-gray-400 text-sm mb-2">500 Active Traders</div>
					<div class="text-4xl font-bold text-green-500 mb-4">$57,750</div>
					<div class="text-gray-400 text-sm">Monthly Spread Revenue</div>
					<div class="text-2xl font-bold mt-2">$693,000</div>
					<div class="text-gray-500 text-sm">Annual Revenue</div>
				</div>
			</div>

			<div class="bg-gradient-to-br from-red-900/30 to-gray-900 border border-red-500 rounded-lg p-6 transform scale-105">
				<div class="text-center">
					<div class="text-red-400 text-sm mb-2 font-bold">1,000 Active Traders</div>
					<div class="text-5xl font-bold text-green-500 mb-4">$115,500</div>
					<div class="text-gray-300 font-bold">Monthly Spread Revenue</div>
					<div class="text-3xl font-bold mt-2 text-green-400">$1,386,000</div>
					<div class="text-gray-400">Annual Revenue</div>
				</div>
			</div>

			<div class="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-6">
				<div class="text-center">
					<div class="text-gray-400 text-sm mb-2">2,500 Active Traders</div>
					<div class="text-4xl font-bold text-green-500 mb-4">$288,750</div>
					<div class="text-gray-400 text-sm">Monthly Spread Revenue</div>
					<div class="text-2xl font-bold mt-2">$3,465,000</div>
					<div class="text-gray-500 text-sm">Annual Revenue</div>
				</div>
			</div>
		</div>

		<!-- How It Works -->
		<div class="bg-gray-900 border border-gray-700 rounded-lg p-8 mb-12">
			<h2 class="text-3xl font-bold mb-6">HOW IT WORKS</h2>
			<div class="space-y-4 text-lg">
				<div class="flex items-start gap-4">
					<div class="text-4xl">🟢</div>
					<div>
						<strong>GREEN</strong> = Favorable market conditions detected. High probability trading window.
					</div>
				</div>
				<div class="flex items-start gap-4">
					<div class="text-4xl">🟠</div>
					<div>
						<strong>ORANGE</strong> = Moderate conditions. Proceed with caution.
					</div>
				</div>
				<div class="flex items-start gap-4">
					<div class="text-4xl">🔴</div>
					<div>
						<strong>RED</strong> = Unfavorable conditions. Avoid trading.
					</div>
				</div>
			</div>
			<p class="text-xl font-bold text-green-500 mt-6">
				Traders control everything. You provide the tool. Zero IB liability.
			</p>
		</div>

		<!-- Why Traders Stay Longer -->
		<div class="bg-gradient-to-r from-green-900/20 to-gray-900 border border-green-500/30 rounded-lg p-8 mb-12">
			<h2 class="text-3xl font-bold mb-6 text-green-400">WHY TRADERS STAY LONGER</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<div class="text-5xl font-bold text-green-500 mb-2">65-75%</div>
					<div class="text-gray-300">Win Rates (vs industry average 10-20%)</div>
				</div>
				<div>
					<div class="text-5xl font-bold text-green-500 mb-2">6-12+</div>
					<div class="text-gray-300">Month Retention (vs typical 30-60 days)</div>
				</div>
			</div>
		</div>

		<!-- White Label -->
		<div class="bg-gray-900 border border-purple-500/30 rounded-lg p-8 mb-12">
			<h2 class="text-3xl font-bold mb-6 text-purple-400">100% WHITE LABEL SOLUTION</h2>
			<p class="text-xl text-gray-300 mb-4">
				<strong>Your brand. Your logo. Your domain. Your colors.</strong>
			</p>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
				<div>✓ Custom domain setup</div>
				<div>✓ Full branding customization</div>
				<div>✓ Personalized email/SMS templates</div>
				<div>✓ Customizable leaderboards</div>
				<div>✓ Admin dashboard analytics</div>
				<div>✓ MT5 broker integration</div>
			</div>
			<p class="text-xl font-bold text-purple-400 mt-6">
				Setup time: 72 hours
			</p>
		</div>

		<!-- Pricing -->
		<div class="bg-gray-900 border border-gray-700 rounded-lg p-8 mb-12">
			<h2 class="text-3xl font-bold mb-6 text-center">PRICING STRUCTURE</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
					<div class="text-gray-400 mb-2">0-500 Traders</div>
					<div class="text-4xl font-bold text-green-500">$2,500</div>
					<div class="text-gray-500">/month</div>
				</div>
				<div class="bg-gray-800 border border-red-500 rounded-lg p-6 text-center transform scale-105">
					<div class="text-red-400 font-bold mb-2">501-1,000 Traders</div>
					<div class="text-5xl font-bold text-green-500">$4,500</div>
					<div class="text-gray-400">/month</div>
				</div>
				<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
					<div class="text-gray-400 mb-2">1,001-2,500 Traders</div>
					<div class="text-4xl font-bold text-green-500">$8,500</div>
					<div class="text-gray-500">/month</div>
				</div>
			</div>
			<div class="mt-8 bg-green-900/20 border border-green-500/30 rounded-lg p-6">
				<div class="text-center">
					<div class="text-gray-400 mb-2">ROI Example (1,000 traders):</div>
					<div class="text-2xl font-bold">$115,500 revenue - $4,500 fee = <span class="text-green-500">$111,000 profit/month</span></div>
					<div class="text-xl text-green-400 mt-2">25.6x return on investment</div>
				</div>
			</div>
		</div>

		<!-- Limited Availability -->
		<div class="bg-gradient-to-r from-red-900/30 to-gray-900 border border-red-500 rounded-lg p-8 mb-12 text-center">
			<h2 class="text-3xl font-bold mb-4 text-red-400">LIMITED PARTNERSHIP AVAILABILITY</h2>
			<p class="text-2xl font-bold mb-4">
				Only 25 IB partners per quarter
			</p>
			<p class="text-xl text-gray-300 mb-4">
				Current status: 13 partnerships confirmed for Q1 2026
			</p>
			<div class="text-5xl font-bold text-red-500">
				12 slots remaining
			</div>
		</div>

		<!-- CTA Section -->
		<div class="bg-gradient-to-r from-gray-900 to-black border border-red-500 rounded-lg p-12 text-center">
			<h2 class="text-4xl font-bold mb-6">WHAT HAPPENS NEXT</h2>
			<div class="space-y-4 text-left max-w-3xl mx-auto mb-8">
				<div class="flex items-start gap-4">
					<div class="bg-red-600 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 font-bold">1</div>
					<div>
						<strong>Experience the platform live.</strong> Click the preview button below to see the traffic light system, leaderboards, and analytics dashboard in action.
					</div>
				</div>
				<div class="flex items-start gap-4">
					<div class="bg-red-600 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 font-bold">2</div>
					<div>
						<strong>Calculate your numbers.</strong> How many active traders do you currently have?
					</div>
				</div>
				<div class="flex items-start gap-4">
					<div class="bg-red-600 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 font-bold">3</div>
					<div>
						<strong>Apply now.</strong> Fill out the partnership application with your company details and current trader count.
					</div>
				</div>
				<div class="flex items-start gap-4">
					<div class="bg-red-600 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 font-bold">4</div>
					<div>
						<strong>Go live in 72 hours.</strong> Your branded SCALPERIUM platform is deployed and recurring revenue starts flowing.
					</div>
				</div>
			</div>

			<div class="flex flex-col md:flex-row gap-4 justify-center">
				<a
					href="http://localhost:5173"
					target="_blank"
					class="px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 rounded-lg font-bold text-xl transition-all shadow-xl"
				>
					🎯 Preview Live Demo
				</a>
				<a
					href="/ib-register"
					class="px-10 py-5 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 rounded-lg font-bold text-xl transition-all shadow-xl"
				>
					Apply for Partnership
				</a>
			</div>
		</div>

		<!-- Contact -->
		<div class="mt-12 text-center text-gray-400">
			<p class="mb-2">Questions? Contact us:</p>
			<p class="text-xl">
				<a href="mailto:partners@scalperium.com" class="text-blue-400 hover:underline">partners@scalperium.com</a>
			</p>
		</div>
	</div>
</div>
