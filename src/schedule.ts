import { BennyStatusResponse, Shard } from "./types";

export async function handleScheduled() {
	const data = <BennyStatusResponse | null>await fetch('https://api.benny.sh/status').then(r => r.json()).catch(() => null);
	if (data) {
		if (data.status == 200) {
			const shards = <Shard[]>data.data
			if (!shards.find(x => x.status != 0)) {
				const sum = shards.reduce((p, v) => p + v.guilds, 0);
				const date = new Date();
				await GRAPH_STORAGE.put(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`, '', {
					metadata: { value: sum }, expirationTtl: 5259600
				});
			}
		}
	}
}