import { reqEnv } from "../types";

export default async function(_: any, env: reqEnv): Promise<Response> {
	const value = await env.GRAPH_STORAGE.list<{ value: number }>()
	const data: { [key: string]: number } = {}
	value.keys.forEach(x => data[x.name] = x.metadata!.value);

	return new Response(JSON.stringify(data))
}