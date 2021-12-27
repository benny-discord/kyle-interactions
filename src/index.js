const { handleRequest } = require('./bot.js');

addEventListener('fetch', event => {
	event.respondWith(handleRequest(event.request));
})