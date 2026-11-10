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
		adapter: adapter({
			fallback: '404.html',
			strict: true
		})
	}
};

export default config;
