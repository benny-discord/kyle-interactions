const { InteractionType, InteractionResponseType, RouteBases, Routes } = require('discord-api-types/v9');
const { verify } = require('./verify.js');
const config = require('../config/config.json');
const ms = require('./ms.js');

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
			
			case 'timeout':
				if (interaction.member?.roles.some(x => config.staffRoleIDs.includes(x)) || interaction.member.permissions && (BigInt(interaction.member.permissions) & 0x00000008n) == 0x00000008n) {
					const options = interaction.data.options,
						user = options.find(x => x.name == 'user').value,
						time = options.find(x => x.name == 'time').value,
						reason = options.find(x => x.name == 'reason')?.value;
					
					let muteDuration = ms(time);
					if (muteDuration > 2419200000) return respond({
						type: InteractionResponseType.ChannelMessageWithSource,
						data: {
							flags: 1 << 6,
							content: 'Time must be between 1 minute and 28 days'
						}
					});
					if (muteDuration == 0) muteDuration = null;

					const res = await makeAPIRequest(
						Routes.guildMember(interaction.guild_id, user),
						'PATCH',
						{
							communication_disabled_until: muteDuration ? new Date(Date.now() + muteDuration) : null,
						},
						reason ? {
							'X-Audit-Log-Reason': reason.substring(0, 512)
						} : undefined
					);
					if (!res.ok) return respond({
						type: InteractionResponseType.ChannelMessageWithSource,
						data: {
							flags: 1 << 6,
							content: 'Failed to timeout user',
						}
					});
					console.log(`time: ${time}: mute duration: ${muteDuration}, com disabled until: ${muteDuration ? new Date(Date.now() + muteDuration) : null}`);
					console.log(`msmd: ${muteDuration && ms(muteDuration)}`);
					return respond({
						type: InteractionResponseType.ChannelMessageWithSource,
						data: {
							flags: 1 << 6,
							content: muteDuration !== null ? `User <@${user}> has been timed out for ${ms(muteDuration)}.` : `User <@${user}> has ended time out.`
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

			case "status":
				const userFriendly = (code) => {
					switch (code) {
						case 0:
							return "Logged in"
						case 1:
						case 4:
						case 6:
						case 7:
							return "Logging in"
						case 9:
							return "Queued"
						case 5:
							return "Disconnected"
						default:
							return "Reconnecting"
					}
				}

				const json = await fetch('https://api.benny.sh/status').then(r => r.json()).catch(() => null);
				if (!json || json.status !== 200) return respond({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags: 1 << 6,
						content: 'Status failed to fetch',
					}
				});

				const { data } = json,

				const embed = {
					title: 'Benny Status',
					url: 'https://benny.sh/status',
					url: 'https://benny.sh/status',
					description: data.map(k => `**Shard ${k.id.toString()}**:\nStatus: ${userFriendly(k.status)}\nPing: ${k.ping.toString()}\nUptime: ${ms(k.uptime)}`).join('\n\n'),
					color: data.find(x => x.status !== 0) ? 0x77fc8f : 0xf5bc42
					
				};
				
				return respond({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags: 1 << 6,
						embeds: [embed],
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

async function makeAPIRequest(url, method = 'GET', body, additionalHeaders = {}) {
	const headers = {
		...additionalHeaders,
		'Authorization': `Bot ${botToken}`,
	}
	if (body !== undefined) { headers['Content-Type'] = 'application/json'; }
	return await fetch(`${RouteBases.api}${url}`, {
		method,
		headers: headers,
		body: body ? JSON.stringify(body) : undefined,
	}).catch(() => ({ ok: false }))
}