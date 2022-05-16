import type { APIApplicationCommandInteractionDataStringOption, APIApplicationCommandInteractionDataUserOption, APIChatInputApplicationCommandGuildInteraction, APIEmbed, APIInteraction, APIInteractionResponse, RESTGetAPIGuildRolesResult } from "discord-api-types/v10";
import type { BennyStatusResponse, BennyTranslationStatus, reqEnv, Shard } from "../types";
import { InteractionType, InteractionResponseType, RouteBases, Routes } from 'discord-api-types/v10'
import { verify } from '../utils/verify';
import { formatToString, parseToNumber } from '../utils/ms';
import * as config from '../../config/config.json';

export default async function (request: Request, env: reqEnv): Promise<Response> {
	if (!request.headers.get('X-Signature-Ed25519') || !request.headers.get('X-Signature-Timestamp')) return new Response('Unauthenticated', { status: 401 });
	if (!await verify(request, env.publicKey)) return new Response('Unauthenticated', { status: 401 })

	const interaction = <APIInteraction>await request.json()

	if (interaction.type === InteractionType.Ping) return respond({
		type: InteractionResponseType.Pong
	})

	if (interaction.type !== InteractionType.ApplicationCommand) return respond({
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			content: 'Invalid interaction type',
			flags: 64,
		}
	});

	switch (interaction.data.name) {
		case 'translation-status':
			const json = <BennyTranslationStatus>await fetch('https://api.benny.sh/translations/info').then(r => r.json()).catch(() => null);
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

			const embed = <APIEmbed>{
				title: `Translation Status - ${total} total`,
				description: Object.keys(data).sort().map(k => `**${k.toUpperCase()}**: ${data[k]}/${total} (${Math.round(data[k] / total * 1000) / 10}%)${data[k] === total ? ' <:verified:703946320670621716>' : ''}`).join('\n'),
				color: 0x77fc8f
			};
			return respond({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
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
			if (interaction.member?.roles.some(x => config.staffRoleIDs.includes(x)) || interaction.member!.permissions && (BigInt(interaction.member!.permissions) & 0x00000008n) == 0x00000008n) {
				let method = interaction.member!.roles.includes(config.supportRoleID) ? 'DELETE' : 'PUT';
				const res = await makeAPIRequest(Routes.guildMemberRole(config.mainGuildID, interaction.member!.user.id, config.supportRoleID), method);
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
			if (interaction.member?.roles.some(x => config.staffRoleIDs.includes(x)) || interaction.member!.permissions && (BigInt(interaction.member!.permissions) & 0x00000008n) == 0x00000008n) {
				const res = await makeAPIRequest(Routes.guildRoles(config.mainGuildID), env.botToken);
				if (!res.ok) return respond({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags: 1 << 6,
						content: 'Failed to fetch roles',
					}
				});
				const roles = <RESTGetAPIGuildRolesResult>await res.json(),
					everyone = roles.find(x => x.id === config.mainGuildID)!,
					everyoneHasSendMessages = (BigInt(everyone.permissions) & 0x00000800n) == 0x00000800n;

				let newValue = everyoneHasSendMessages ? BigInt(everyone.permissions) - 0x00000800n : BigInt(everyone.permissions) + 0x00000800n;
				const patchRes = await makeAPIRequest(Routes.guildRole(config.mainGuildID, config.mainGuildID), env.botToken, 'PATCH', {
					permissions: newValue.toString()
				});
				if (!patchRes.ok) return respond({
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
			if (interaction.member?.roles.some(x => config.staffRoleIDs.includes(x)) || interaction.member!.permissions && (BigInt(interaction.member!.permissions) & 0x00000008n) == 0x00000008n) {
				const options = (interaction as APIChatInputApplicationCommandGuildInteraction).data.options!,
					user = (options.find(x => x.name == 'user') as APIApplicationCommandInteractionDataUserOption).value,
					time = (options.find(x => x.name == 'time') as APIApplicationCommandInteractionDataStringOption).value,
					reason = (options.find(x => x.name == 'reason') as APIApplicationCommandInteractionDataStringOption | undefined)?.value;

				let muteDuration = parseToNumber(time);
				if (muteDuration == 0) muteDuration = null;
				if (muteDuration && muteDuration > 2419200000) return respond({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags: 1 << 6,
						content: 'Time must be between 1 minute and 28 days'
					}
				});


				const res = await makeAPIRequest(
					Routes.guildMember(interaction.guild_id!, user),
					env.botToken,
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
				return respond({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags: 1 << 6,
						content: muteDuration !== null ? `User <@${user}> has been timed out for ${formatToString(muteDuration)}.` : `User <@${user}> has ended time out.`
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
			const res = <BennyStatusResponse>await fetch('https://api.benny.sh/status').then(r => r.json()).catch(() => null);
			if (res?.status !== 200) return respond({ type: InteractionResponseType.ChannelMessageWithSource, data: { flags: 1 << 6, content: 'Status failed to fetch' } });

			const { data: statusData } = res;
			if (statusData === undefined) {
				return respond({ type: InteractionResponseType.ChannelMessageWithSource, data: { flags: 1 << 6, content: 'Status failed to fetch' } });
			}

			const statusEmbed = <APIEmbed>{
				title: `Benny Status (${statusData.filter(x => x.status == 0).length}/${statusData.length})`,
				url: 'https://benny.sh/status',
				fields: statusData.map(k => ({
					name: `**Shard ${k.id.toString()}**`,
					value: `Status: ${shardStatus(k)}${k.status == 0 ? `\nPing: ${k.ping.toString()}\nUptime: ${formatToString(k.uptime)}` : ''}`,
					inline: true
				})),
				color: statusData.find(x => x.status !== 0) ? 0xf5bc42 : 0x77fc8f
			};

			return respond({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					embeds: [statusEmbed],
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

const respond = (response: APIInteractionResponse) => new Response(JSON.stringify(response), { headers: { 'content-type': 'application/json' } });

async function makeAPIRequest(url: string, token: string, method: string = 'GET', body?: any, additionalHeaders?: { [key: string]: string }) {
	if (!additionalHeaders) additionalHeaders = {};
	const headers = <{ [key: string]: string }>{
		...additionalHeaders,
		'Authorization': `Bot ${token}`,
	}
	if (body !== undefined) { headers['Content-Type'] = 'application/json'; }
	return await fetch(`${RouteBases.api}${url}`, {
		method,
		headers: headers,
		body: body ? JSON.stringify(body) : undefined,
	});
}

const shardStatus = (shard: Shard) => {
	switch (shard.status) {
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