import fetch from 'node-fetch';
import commands from './commands.mjs';
import { config } from 'dotenv';
config();

(async () => {
	// console.log(process.env.clientID, process.env.botToken)
	const res = await fetch(`https://discord.com/api/v10/applications/${process.env.clientID}/commands`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bot ${process.env.botToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(commands),
	})

	console.log(res.status, res.statusText);
	if (res.status != 200 && res.status < 500) {
		console.log(JSON.stringify(await res.json(), null, 2));
	}
})()
