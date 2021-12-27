const { InteractionType, InteractionResponseType } = require('discord-api-types/v9')

export async function handleRequest(request) {
	if (!request.headers.get('X-Signature-Ed25519') || !request.headers.get('X-Signature-Timestamp')) return Response.redirect('https://benny.sh')
	if (!await verify(request)) return new Response('', { status: 401 })

	const interaction = await request.json()

	if (interaction.type === InteractionType.Ping) return respond({
		type: InteractionResponseType.Pong
	})

	return respond({
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			content: 'h',
		}
	})
}

const respond = (response) => new Response(JSON.stringify(response), { headers: { 'content-type': 'application/json' } })