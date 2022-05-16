export interface reqEnv {
	GRAPH_STORAGE: KVNamespace
	botToken: string
	publicKey: string
}

export interface BennyTranslationStatus {
	data: { [key: string]: number }
	status: number
}

export interface BennyStatusResponse {
	total: number | undefined
	data: Shard[] | undefined
	status: number
}

export interface Shard {
	guilds: number
	members: number
	ping: number
	uptime: number
	status: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
	id: number
}

export interface Config {
	mainGuildID: string
	staffRoleIDs: string[]
	supportRoleID: string
}

export { }