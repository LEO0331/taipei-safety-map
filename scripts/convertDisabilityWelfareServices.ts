import { readFile } from 'node:fs/promises';
import { decodeCsvBuffer, parseCsv, writeJson } from './shared.ts';
const [header = [], ...rows] = parseCsv(decodeCsvBuffer(await readFile('data/raw/disability-welfare-services/records.csv')));
const columns = header.map(value => value.trim()); const index = (name: string) => columns.indexOf(name);
const fields = ['\u5e74/\u5b63', '\u6838\u5b9a\u5b89\u7f6e\u670d\u52d9\u7e3d\u4eba\u6578', '\u5be6\u969b\u5b89\u7f6e\u670d\u52d9\u7e3d\u4eba\u6578', '\u672c\u671f\u670d\u52d9\u4eba\u6b21'].map(index);
if (fields.some(value => value < 0)) throw new Error('Unexpected welfare CSV schema');
const number = (value: string | undefined) => /^\d+$/.test((value ?? '').trim()) ? Number(value) : null;
const records = rows.filter(row => row.some(Boolean)).map(row => { const value = (field: number) => (row[field] ?? '').trim(); return { period: value(fields[0]), approvedCapacity: number(row[fields[1]]), actualPlacements: number(row[fields[2]]), serviceVisits: number(row[fields[3]]), originalValues: Object.fromEntries(columns.map((name, columnIndex) => [name, value(columnIndex)])) }; });
await writeJson('public/data/disability-welfare-services/records.json', records); console.log(`Converted ${records.length} welfare periods.`);
