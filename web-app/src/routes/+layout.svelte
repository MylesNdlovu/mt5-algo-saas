<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import WhiteLabelBranding from '$lib/components/WhiteLabelBranding.svelte';
</script>

<svelte:head>
	<title>MT5 Algo Trading SaaS</title>
</svelte:head>

<!-- Apply white-label branding if custom domain detected -->
<WhiteLabelBranding />

<slot />
