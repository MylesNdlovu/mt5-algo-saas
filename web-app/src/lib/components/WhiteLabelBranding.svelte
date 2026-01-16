<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	// Access white-label branding from page data
	$: whiteLabel = $page.data.whiteLabel;

	// Apply dynamic branding
	onMount(() => {
		if (whiteLabel) {
			// Apply custom brand color as CSS variable
			document.documentElement.style.setProperty('--brand-color', whiteLabel.brandColor);

			// Update page title
			if (whiteLabel.brandName) {
				const currentTitle = document.title;
				const defaultBrand = 'SCALPERIUM';
				document.title = currentTitle.replace(defaultBrand, whiteLabel.brandName.toUpperCase());
			}

			// Update favicon if custom one provided
			if (whiteLabel.favicon) {
				const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
				if (favicon) {
					favicon.href = whiteLabel.favicon;
				}
			}
		}
	});
</script>

<svelte:head>
	{#if whiteLabel?.favicon}
		<link rel="icon" href={whiteLabel.favicon} />
	{/if}
</svelte:head>

<!-- This component doesn't render anything visible, it just applies branding -->
