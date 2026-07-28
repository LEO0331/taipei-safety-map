import { mkdir, writeFile } from 'node:fs/promises';

const directory = 'data/raw/electrical-equipment-inspection-maintenance-businesses';
const url = 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=e4c89f39-0ab3-4473-9bab-42a3d7e0def4';

await mkdir(directory, { recursive: true });
const response = await fetch(url);
if (!response.ok) throw new Error(`Download failed: ${response.status}`);
await writeFile(`${directory}/records.csv`, new Uint8Array(await response.arrayBuffer()));
