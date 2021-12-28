const { InteractionType, InteractionResponseType, RouteBases, Routes } = require('discord-api-types/v9');
const { verify } = require('./verify.js');
const config = require('../config/config.json')

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
			case 'support':
				if (interaction.guild_id !== config.mainGuildID) return respond({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags: 1 << 6,
						content: 'This command is only available in the main server'
					}
				});
				if (interaction.member?.roles.some(x => config.staffRoleIDs.includes(x)) || interaction.member.permissions && (BigInt(interaction.member.permissions) & 0x00000008n) == 0x00000008n) {
					let method = interaction.member.roles.includes(config.supportRoleID) ? 'DELETE' : 'PUT';
					const res = await makeAPIRequest(Routes.guildMemberRole(config.mainGuildID, interaction.member.user.id, config.supportRoleID), method);
					if (res.status !== 204) return respond({
						type: InteractionResponseType.ChannelMessageWithSource,
						data: {
							flags: 1 << 6,
							content: 'Failed to update support role',
						}
					});
					return respond({
						type: InteractionResponseType.ChannelMessageWithSource,
						data: {
							flags: 1 << 6,
							content: `Support role ${method === 'PUT' ? 'added' : 'removed'}`
						}
					});
				}
				return respond({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags: 1 << 6,
						content: 'This command is only available to staff',
					}
				});

			case 'lock':
				if (interaction.member?.roles.some(x => config.staffRoleIDs.includes(x)) || interaction.member.permissions && (BigInt(interaction.member.permissions) & 0x00000008n) == 0x00000008n) {
					const res = await makeAPIRequest(Routes.guildRoles(config.mainGuildID));
					if (!res.ok) return respond({
						type: InteractionResponseType.ChannelMessageWithSource,
						data: {
							flags: 1 << 6,
							content: 'Failed to fetch roles',
						}
					});
					const roles = await res.json(),
						everyone = roles.find(x => x.id === config.mainGuildID),
						everyoneHasSendMessages = (BigInt(everyone.permissions) & 0x00000800n) == 0x00000800n;

					let newValue = everyoneHasSendMessages ? BigInt(everyone.permissions) - 0x00000800n : BigInt(everyone.permissions) + 0x00000800n;
					const res2 = await makeAPIRequest(Routes.guildRole(config.mainGuildID, config.mainGuildID), 'PATCH', {
						permissions: newValue.toString()
					});
					if (!res2.ok) return respond({
						type: InteractionResponseType.ChannelMessageWithSource,
						data: {
							flags: 1 << 6,
							content: 'Failed to update role',
						}
					});
					return respond({
						type: InteractionResponseType.ChannelMessageWithSource,
						data: {
							flags: 1 << 6,
							content: `Everyone role permissions updated to ${everyoneHasSendMessages ? 'deny' : 'allow'} sending messages`
						}
					});
				}
				return respond({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags: 1 << 6,
						content: 'This command is only available to staff',
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

const respond = (response) => new Response(JSON.stringify(response), { headers: { 'content-type': 'application/json' } });

async function makeAPIRequest(url, method = 'GET', body) {
	const headers = {
		'Authorization': `Bot ${botToken}`,
	}
	if (body !== undefined) { headers['Content-Type'] = 'application/json'; }
	return await fetch(`${RouteBases.api}${url}`, {
		method,
		headers: headers,
		body: body ? JSON.stringify(body) : undefined,
	}).catch(() => ({ ok: false }))
}