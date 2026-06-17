import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  buildDistrictSafetySummary,
  extractDistrictFromLocation,
  normalizeBurglaryTimePeriod,
  normalizeColumnName,
  normalizeShelterCoordinate,
  parseBurglaryDate,
  parseCapacity,
} from '../src/lib/safetyData.ts';
import type { AirRaidShelter, ResidentialBurglaryRecord } from '../src/types.ts';

export const RAW_DIR = 'data/raw/safety';
export const PUBLIC_DATA_DIR = 'public/data';
export const SHELTER_SOURCE = '北市警政APP_防空避難設備位置';
export const BURGLARY_SOURCE = '臺北市住宅竊盜點位資訊';
const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
const big5Decoder = new TextDecoder('big5', { fatal: false });

export const sources = {
  shelters: {
    name: SHELTER_SOURCE,
    pageUrl: 'https://data.taipei/dataset/detail?id=83eecdf1-3bbb-40f9-9484-b55b700c37ef',
    downloadUrl:
      'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=39ca53a1-c861-40bc-b329-fc9b28c10e01',
    rawPath: `${RAW_DIR}/air-raid-shelters.csv`,
  },
  burglaries: {
    name: BURGLARY_SOURCE,
    pageUrl: 'https://data.taipei/dataset/detail?id=68785231-d6c5-47a1-b001-77eec70bec02',
    downloadUrl:
      'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=93d9bc2d-af08-4db7-a56b-9f0a49226fa3',
    rawPath: `${RAW_DIR}/residential-burglaries.csv`,
  },
};

export async function readCsv(path: string): Promise<Record<string, string>[]> {
  const csv = decodeCsvBuffer(await readFile(path));
  const rows = parseCsv(csv);
  const [headers = [], ...records] = rows;
  const normalizedHeaders = headers.map(normalizeColumnName);
  return records
    .filter((record) => record.some((value) => value.trim()))
    .map((record) =>
      normalizedHeaders.reduce<Record<string, string>>((row, header, index) => {
        row[header] = record[index]?.trim() ?? '';
        return row;
      }, {}),
    );
}

export function decodeCsvBuffer(buffer: Uint8Array): string {
  const utf8Text = utf8Decoder.decode(buffer).replace(/^\uFEFF/, '');
  if (!utf8Text.includes('\uFFFD')) return utf8Text;
  return big5Decoder.decode(buffer).replace(/^\uFEFF/, '');
}

export function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function convertShelterRow(row: Record<string, string>, index: number): AirRaidShelter {
  const originalX = Number(row['座標x'] ?? row['座標X']);
  const originalY = Number(row['座標y'] ?? row['座標Y']);
  const coordinate = normalizeShelterCoordinate(originalX, originalY);
  return {
    id: `shelter-${row['項次'] || index + 1}`,
    itemNo: row['項次'],
    district: row['行政區'] || '未分類',
    policePrecinct: row['分局'],
    name: row['名稱'],
    village: row['里別'],
    address: row['地址'] || '',
    basementInfo: row['地下層數位址'],
    capacity: parseCapacity(row['容納人數']),
    originalX: Number.isFinite(originalX) ? originalX : undefined,
    originalY: Number.isFinite(originalY) ? originalY : undefined,
    longitude: coordinate.longitude,
    latitude: coordinate.latitude,
    coordinateStatus: coordinate.coordinateStatus,
    coordinateSystem: coordinate.coordinateSystem,
    placeName: row['場所名稱'],
    source: SHELTER_SOURCE,
  };
}

export function convertBurglaryRow(row: Record<string, string>, index: number): ResidentialBurglaryRecord {
  const parsedDate = parseBurglaryDate(row['發生日期'] ?? '');
  const locationText = row['發生地點'] ?? '';
  return {
    id: `burglary-${row['編號'] || index + 1}`,
    sourceId: row['編號'],
    caseType: row['案類'] || '住宅竊盜',
    occurredDateRaw: row['發生日期'] ?? '',
    ...parsedDate,
    timePeriodRaw: row['發生時段'],
    timePeriod: normalizeBurglaryTimePeriod(row['發生時段'] ?? ''),
    locationText,
    district: extractDistrictFromLocation(locationText),
    source: BURGLARY_SOURCE,
  };
}

export async function loadConvertedData() {
  const [shelters, burglaries] = await Promise.all([
    readJsonFile<AirRaidShelter[]>(`${PUBLIC_DATA_DIR}/air-raid-shelters.json`),
    readJsonFile<ResidentialBurglaryRecord[]>(`${PUBLIC_DATA_DIR}/residential-burglary-records.json`),
  ]);
  return { shelters, burglaries, districtSummaries: buildDistrictSafetySummary(shelters, burglaries) };
}

async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}
