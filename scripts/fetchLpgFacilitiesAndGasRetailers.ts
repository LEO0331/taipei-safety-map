import { mkdir, writeFile } from 'node:fs/promises';

const directory = 'data/raw/lpg-facilities-and-gas-retailers';
const url = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=197e7700-2033-417d-9cc7-642c54731bf2';

await mkdir(directory, { recursive: true });
const response = await fetch(url);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
await writeFile(`${directory}/records.csv`, new Uint8Array(await response.arrayBuffer()));
