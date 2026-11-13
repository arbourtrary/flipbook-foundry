// Dev-only: internal review tools, not part of the published site.
import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

export const prerender = dev;

export function load() {
	if (!dev) error(404);
}
