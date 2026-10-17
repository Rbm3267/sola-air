<script lang="ts">
	// Without this the site never loaded the tokens package, so every
	// var(--sola-*) in a compiled .sola component silently used its light-mode
	// fallback and dark mode could not work.
	// Imported by relative path, not by package name. A bare specifier here
	// resolves through the local workspace symlink but not in a clean CI
	// install, which failed the production build twice.
	import '../../../packages/tokens/src/tokens.css';
	import '../app.css';
	import 'virtual:uno.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { theme } from '$lib/stores/theme.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	let { children } = $props();

	// Canonical and og:url name the page being viewed. They used to be the
	// homepage on every route, which told crawlers that /docs, /components and
	// every other page was a duplicate of the home page.
	const ORIGIN = 'https://sola-air.dev';
	const pageUrl = $derived(ORIGIN + page.url.pathname);

	onMount(() => {
		// The static defaults in app.html were for crawlers that don't run this app.
		document.querySelectorAll('[data-default-meta]').forEach((el) => el.remove());
		theme.init();
		injectAnalytics();
		injectSpeedInsights();
	});
</script>

<svelte:head>
	<title>Sola AIR — Ambient Intent Runtime</title>
	<meta name="google-site-verification" content="WcTmhJBtVJPU0tzzt4XiIY4AfSDAywCA6RTgfowxVcw" />
	<meta name="description" content="A small reactive runtime and compiler. You write .sola components and they compile to plain DOM calls, with no virtual DOM." />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Sola AIR" />
	<meta property="og:title" content="Sola AIR — Ambient Intent Runtime" />
	<meta property="og:description" content="A small reactive runtime and compiler. You write .sola components and they compile to plain DOM calls, with no virtual DOM." />
	<meta property="og:url" content={pageUrl} />
	<meta property="og:image" content="{ORIGIN}/og-image.jpg" />
	<meta name="twitter:card" content="summary_large_image" />
	<link rel="canonical" href={pageUrl} />
</svelte:head>

<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-slate-900 focus:text-white focus:text-sm focus:font-semibold focus:shadow-lg"
>
	Skip to content
</a>

<div class="min-h-screen flex flex-col w-full transition-colors duration-200">
	{@render children()}
	<SiteFooter />
</div>

