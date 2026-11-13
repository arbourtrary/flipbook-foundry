import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// Dev-only: /lab check-in picks are saved to lab/picks.json so they can be
// read back between iterations.
function labPicks(): Plugin {
	const file = join(process.cwd(), 'lab/picks.json');
	return {
		name: 'flipbook-lab-picks',
		apply: 'serve',
		configureServer(server) {
			server.middlewares.use('/__lab/picks', async (req, res) => {
				if (req.method === 'POST') {
					let body = '';
					for await (const chunk of req) body += chunk;
					await mkdir(join(process.cwd(), 'lab'), { recursive: true });
					const data = JSON.parse(body);
					data.savedAt = new Date().toISOString();
					await writeFile(file, JSON.stringify(data, null, '\t'));
					res.setHeader('content-type', 'application/json');
					res.end('{"ok":true}');
					return;
				}
				const data = await readFile(file, 'utf8').catch(() => '{}');
				res.setHeader('content-type', 'application/json');
				res.end(data);
			});
		}
	};
}

export default defineConfig({
	plugins: [sveltekit(), labPicks()],
	// The site imports the workspace packages from source.
	server: { fs: { allow: ['packages'] } }
});
