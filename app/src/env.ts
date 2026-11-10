// SvelteKit 3 only passes the server the environment variables declared here.
// Reading an undeclared one (as `$env/dynamic/private` used to allow) gives
// undefined, which is how every model-backed feature went offline on the live
// site after the upgrade, even with the key set in Vercel.
import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	GEMINI_API_KEY: {
		// Optional on purpose: without it the assistant, Studio's AI field and the
		// Generate tab say they are offline, and the build and previews still work.
		schema: (value) => value || undefined,
		description: 'API key for the model behind the assistant, Studio and Generate. Read when the app starts.'
	}
});
