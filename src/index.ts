import { handleRequest } from './bot.js';

addEventListener('fetch', (event) => {
	const f = <FetchEvent>event;
	f.respondWith(handleRequest(f.request));
})