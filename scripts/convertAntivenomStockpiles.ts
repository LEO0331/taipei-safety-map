import { readFile } from 'node:fs/promises';
import { decodeCsvBuffer, parseCsv, writeJson } from './shared.ts';
const [header = [], ...rows] = parseCsv(decodeCsvBuffer(await readFile('data/raw/antivenom-stockpile-locations/records.csv')));
const columns = header.map(value => value.trim()); const index = (name: string) => columns.indexOf(name);
const fields = ['\u7e23\u5e02', '\u7269\u8cc7\u5206\u985e', '\u55ae\u4f4d\u540d\u7a31', '\u9023\u7d61\u96fb\u8a71', '\u5730\u5740'].map(index);
if (fields.some(value => value < 0)) throw new Error('Unexpected antivenom CSV schema');
const records = rows.filter(row => row.some(Boolean)).map((row, rowIndex) => { const value = (field: number) => (row[field] ?? '').trim(); return { id: String(rowIndex + 1), city: value(fields[0]), materialCategory: value(fields[1]), facilityName: value(fields[2]), phone: value(fields[3]), address: value(fields[4]), latitude: null, longitude: null, geocodingStatus: 'not_provided', originalValues: Object.fromEntries(columns.map((name, columnIndex) => [name, value(columnIndex)])) }; });
await writeJson('public/data/antivenom-stockpiles/records.json', records); console.log(`Converted ${records.length} antivenom records.`);
