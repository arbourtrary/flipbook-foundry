import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		typescript: {
			// React bindings live in .tsx alongside the Svelte app.
			config: (c) => {
				c.compilerOptions.jsx = 'react-jsx';
				c.include.push('../src/**/*.tsx');
				return c;
			}
		},
		// The site imports the packages from source, exactly as users import them.
		alias: {
			'flipbook-foundry': 'packages/engine/src',
			'@flipbook-foundry/stick': 'packages/stick',
			$rig: 'packages/rig'
		},
		// GitHub Pages serves the site under /<repo>; BASE_PATH is set in the deploy workflow.
		paths: { base: process.env.BASE_PATH ?? '' },
		adapter: adapter({
			fallback: '404.html',
			strict: true
		})
	}
};

export default config;
