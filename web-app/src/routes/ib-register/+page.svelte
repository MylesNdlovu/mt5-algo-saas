<script lang="ts">
	import { goto } from '$app/navigation';

	let formData = {
		email: '',
		password: '',
		confirmPassword: '',
		companyName: '',
		contactName: '',
		phone: '',
		currentTraders: '',
		message: ''
	};

	let errors: Record<string, string> = {};
	let isSubmitting = false;
	let successMessage = '';

	async function handleSubmit() {
		errors = {};
		
		// Validation
		if (!formData.email) errors.email = 'Email is required';
		if (!formData.password) errors.password = 'Password is required';
		if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters';
		if (formData.password !== formData.confirmPassword) {
			errors.confirmPassword = 'Passwords do not match';
		}
		if (!formData.companyName) errors.companyName = 'Company name is required';
		if (!formData.contactName) errors.contactName = 'Contact name is required';
		if (!formData.phone) errors.phone = 'Phone number is required';
		
		if (Object.keys(errors).length > 0) return;
		
		isSubmitting = true;
		
		try {
			const response = await fetch('/api/ib/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});
			
			const result = await response.json();
			
			if (response.ok) {
				successMessage = 'Registration successful! Your application is pending approval. We will contact you within 48 hours.';
				setTimeout(() => {
					goto('/ib-login');
				}, 3000);
			} else {
				errors.submit = result.error || 'Registration failed';
			}
		} catch (error) {
			errors.submit = 'Network error. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>IB Partner Registration - SCALPERIUM</title>
	<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen bg-black flex items-center justify-center px-6 py-12">
	<div class="w-full max-w-2xl">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold mb-2" style="font-family: 'Orbitron', sans-serif; text-shadow: 0 0 20px rgba(239, 68, 68, 0.5);">
				<span class="bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
					IB PARTNER REGISTRATION
				</span>
			</h1>
			<p class="text-gray-400">Apply to become a SCALPERIUM white-label partner</p>
		</div>
		
		{#if successMessage}
			<div class="bg-gradient-to-br from-green-900/30 to-black rounded-xl border border-green-500/50 p-6 mb-6">
				<div class="flex items-center gap-3">
					<span class="text-3xl">✅</span>
					<div>
						<h3 class="text-green-400 font-bold text-lg mb-1">Application Submitted</h3>
						<p class="text-gray-300">{successMessage}</p>
					</div>
				</div>
			</div>
		{:else}
			<!-- Registration Form -->
			<form on:submit|preventDefault={handleSubmit} class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 p-8 space-y-6">
				<!-- Company Information -->
				<div>
					<h3 class="text-xl font-bold text-red-400 mb-4" style="font-family: 'Orbitron', sans-serif;">
						Company Information
					</h3>
					
					<div class="space-y-4">
						<div>
							<label class="block text-sm text-gray-400 mb-2">Company Name *</label>
							<input
								type="text"
								bind:value={formData.companyName}
								class="w-full px-4 py-3 bg-black border rounded-lg focus:border-red-500 focus:outline-none text-white {errors.companyName ? 'border-red-500' : 'border-gray-700'}"
								placeholder="Your Company Ltd"
							>
							{#if errors.companyName}
								<p class="text-red-400 text-sm mt-1">{errors.companyName}</p>
							{/if}
						</div>
						
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label class="block text-sm text-gray-400 mb-2">Contact Name *</label>
								<input
									type="text"
									bind:value={formData.contactName}
									class="w-full px-4 py-3 bg-black border rounded-lg focus:border-red-500 focus:outline-none text-white {errors.contactName ? 'border-red-500' : 'border-gray-700'}"
									placeholder="John Smith"
								>
								{#if errors.contactName}
									<p class="text-red-400 text-sm mt-1">{errors.contactName}</p>
								{/if}
							</div>
							
							<div>
								<label class="block text-sm text-gray-400 mb-2">Phone Number *</label>
								<input
									type="tel"
									bind:value={formData.phone}
									class="w-full px-4 py-3 bg-black border rounded-lg focus:border-red-500 focus:outline-none text-white {errors.phone ? 'border-red-500' : 'border-gray-700'}"
									placeholder="+1 (555) 123-4567"
								>
								{#if errors.phone}
									<p class="text-red-400 text-sm mt-1">{errors.phone}</p>
								{/if}
							</div>
						</div>
					</div>
				</div>
				
				<!-- Account Credentials -->
				<div>
					<h3 class="text-xl font-bold text-red-400 mb-4" style="font-family: 'Orbitron', sans-serif;">
						Account Credentials
					</h3>
					
					<div class="space-y-4">
						<div>
							<label class="block text-sm text-gray-400 mb-2">Email Address *</label>
							<input
								type="email"
								bind:value={formData.email}
								class="w-full px-4 py-3 bg-black border rounded-lg focus:border-red-500 focus:outline-none text-white {errors.email ? 'border-red-500' : 'border-gray-700'}"
								placeholder="john@company.com"
							>
							{#if errors.email}
								<p class="text-red-400 text-sm mt-1">{errors.email}</p>
							{/if}
						</div>
						
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label class="block text-sm text-gray-400 mb-2">Password *</label>
								<input
									type="password"
									bind:value={formData.password}
									class="w-full px-4 py-3 bg-black border rounded-lg focus:border-red-500 focus:outline-none text-white {errors.password ? 'border-red-500' : 'border-gray-700'}"
									placeholder="Min 8 characters"
								>
								{#if errors.password}
									<p class="text-red-400 text-sm mt-1">{errors.password}</p>
								{/if}
							</div>
							
							<div>
								<label class="block text-sm text-gray-400 mb-2">Confirm Password *</label>
								<input
									type="password"
									bind:value={formData.confirmPassword}
									class="w-full px-4 py-3 bg-black border rounded-lg focus:border-red-500 focus:outline-none text-white {errors.confirmPassword ? 'border-red-500' : 'border-gray-700'}"
									placeholder="Re-enter password"
								>
								{#if errors.confirmPassword}
									<p class="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
								{/if}
							</div>
						</div>
					</div>
				</div>
				
				<!-- Additional Information -->
				<div>
					<h3 class="text-xl font-bold text-red-400 mb-4" style="font-family: 'Orbitron', sans-serif;">
						Business Details
					</h3>
					
					<div class="space-y-4">
						<div>
							<label class="block text-sm text-gray-400 mb-2">Current Number of Active Traders</label>
							<select
								bind:value={formData.currentTraders}
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
								bind:value={formData.message}
								rows="4"
								class="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none text-white resize-none"
								placeholder="Tell us about your business, goals, and any questions..."
							></textarea>
						</div>
					</div>
				</div>
				
				{#if errors.submit}
					<div class="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
						<p class="text-red-400">{errors.submit}</p>
					</div>
				{/if}
				
				<!-- Submit Button -->
				<button
					type="submit"
					disabled={isSubmitting}
					class="w-full px-8 py-4 bg-gradient-to-r from-red-500 to-red-700 rounded-xl font-bold text-lg hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
					style="font-family: 'Orbitron', sans-serif;"
				>
					{isSubmitting ? 'SUBMITTING...' : 'SUBMIT APPLICATION →'}
				</button>
				
				<p class="text-xs text-gray-500 text-center">
					By submitting this form, you agree to our Terms of Service and Privacy Policy.
					Applications are reviewed within 48 hours.
				</p>
			</form>
		{/if}
		
		<!-- Login Link -->
		<div class="text-center mt-6">
			<p class="text-gray-400">
				Already have an IB account? 
				<a href="/ib-login" class="text-red-400 hover:text-red-300 font-semibold">Login here</a>
			</p>
		</div>
	</div>
</div>
