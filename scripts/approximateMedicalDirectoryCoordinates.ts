import { readFile } from 'node:fs/promises';
import { writeJson } from './shared.ts';

const centroids: Record<string, [number, number]> = {
  '\u4e2d\u6b63\u5340': [25.0324, 121.5199], '\u5927\u540c\u5340': [25.0634, 121.513], '\u4e2d\u5c71\u5340': [25.0642, 121.5335], '\u677e\u5c71\u5340': [25.0497, 121.5778], '\u5927\u5b89\u5340': [25.0268, 121.543], '\u842c\u83ef\u5340': [25.033, 121.497], '\u4fe1\u7fa9\u5340': [25.033, 121.5668], '\u58eb\u6797\u5340': [25.095, 121.5246], '\u5317\u6295\u5340': [25.131, 121.501], '\u5167\u6e56\u5340': [25.0837, 121.5924], '\u5357\u6e2f\u5340': [25.0327, 121.6112], '\u6587\u5c71\u5340': [24.9886, 121.5736],
};
for (const name of ['surgical-medical-institutions', 'antivenom-stockpiles', 'diabetes-health-institutions']) {
  const path = `public/data/${name}/records.json`; const records = JSON.parse(await readFile(path, 'utf8')) as Array<{ address: string; [key: string]: unknown }>;
  await writeJson(`public/data/${name}/approximate-district-records.json`, records.map(record => { const district = Object.keys(centroids).find(value => record.address.includes(value)) ?? ''; const point = centroids[district]; return { ...record, districtName: district, latitude: point?.[0] ?? null, longitude: point?.[1] ?? null, coordinateStatus: point ? 'district_centroid_approximate' : 'unresolved', coordinateDisclaimer: point ? 'Approximate district centroid derived from the source address; not an institution location.' : 'No safely derived location.' }; }));
}
