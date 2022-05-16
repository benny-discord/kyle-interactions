import { Router } from 'itty-router';
import graph from './routes/graph.js';
import interaction from './routes/interactions.js';
import scheduled from './routes/schedule.js';

const errorHandler = (err: Error): Response => {
	console.error(err);
	return new Response(JSON.stringify({ status: 500, message: 'An unexpected error occured.' }), { headers: { 'Content-Type': 'application/json' }, status: 500 });
}

const router = Router()
	.get('/', () => Response.redirect('https://benny.sh'))
	.get('/graph', graph)
	.post('/interactions', interaction)
	.all('*', () => new Response('Not Found', { status: 404 }));

export default {
	fetch: (...args: any) => router
		//@ts-ignore
		.handle(...args)
		.catch(errorHandler),
	scheduled: scheduled
}