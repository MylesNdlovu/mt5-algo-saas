<script lang="ts">
	import Navigation from '$lib/components/Navigation.svelte';
	import type { PageData } from './$types';
	
	export let data: PageData;
</script>

<Navigation user={data.user} />

<div class="min-h-screen bg-black text-white p-8">
	<h1 class="text-4xl font-bold mb-8">Admin Debug Info</h1>
	
	<div class="bg-gray-800 p-6 rounded-lg">
		<h2 class="text-2xl mb-4">User Data:</h2>
		<pre class="bg-gray-900 p-4 rounded overflow-auto">{JSON.stringify(data, null, 2)}</pre>
	</div>
	
	<div class="mt-8">
		<a href="/admin" class="bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-700">
			Go to Admin Dashboard
		</a>
	</div>
</div>
