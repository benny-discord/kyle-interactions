import { handleRequest } from './bot.js';
import { handleScheduled } from './schedule.js';

addEventListener('fetch', (event) => {
	const f = <FetchEvent>event;
	f.respondWith(handleRequest(f.request));
})

addEventListener('scheduled', (event) => {
	const s = <ScheduledEvent>event;
	s.waitUntil(handleScheduled());
})