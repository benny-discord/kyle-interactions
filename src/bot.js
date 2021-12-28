const { InteractionType, InteractionResponseType } = require('discord-api-types/v9');
const { verify } = require('./verify.js');

export async function handleRequest(request) {
	if (!request.headers.get('X-Signature-Ed25519') || !request.headers.get('X-Signature-Timestamp')) return Response.redirect('https://benny.sh')
	if (!await verify(request)) return new Response('', { status: 401 })

	const interaction = await request.json()

	if (interaction.type === InteractionType.Ping) return respond({
		type: InteractionResponseType.Pong
	})

	if (interaction.type === InteractionType.ApplicationCommand) {
		switch (interaction.data.name) {
			case 'translation-status':
				const json = await fetch('https://api.benny.sh/translations/info').then(r => r.json()).catch(() => null);
				if (!json || json.status !== 200) return respond({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags: 1 << 6,
						content: 'Translation failed to fetch',
					}
				});

				const { data } = json,
					total = data.en;
				delete data.en;

				const embed = {
					title: `Translation Status - ${total} total`,
					description: Object.keys(data).sort().map(k => `**${k.toUpperCase()}**: ${data[k]}/${total} (${Math.round(data[k] / total * 1000) / 10}%)${data[k] === total ? ' <:verified:703946320670621716>' : ''}`).join('\n'),
					color: 0x77fc8f
				};
				return respond({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags: 1 << 6,
						embeds: [embed]
					}
				});

			default:
				return respond({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags: 1 << 6,
						content: 'Unknown command',
					}
				});
		}
	}

	return respond({
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			content: 'h',
		}
	})
}

const respond = (response) => new Response(JSON.stringify(response), { headers: { 'content-type': 'application/json' } })