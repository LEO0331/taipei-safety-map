import { readFile } from 'node:fs/promises';
import { buildHistoricalFloodingSummary } from '../src/lib/historicalFlooding.ts';
import type { HistoricalFloodingRecord, HistoricalFloodingSummary } from '../src/types.ts';
import { writeJson } from './shared.ts';

async function readJson<T>(file: string, fallback: T): Promise<T> {
  return readFile(file, 'utf8').then((value) => JSON.parse(value) as T).catch(() => fallback);
}

const records = await readJson<HistoricalFloodingRecord[]>('public/data/historical-flooding-records.json', []);
const previous = await readJson<HistoricalFloodingSummary>('public/data/historical-flooding-summary.json', {
  totalRecords: 0,
  eventYearCount: 0,
  districtCount: 0,
  uniqueAddressCount: 0,
  recordsWithGeometry: 0,
  recordsWithValidGeometry: 0,
  recordsWithCentroid: 0,
  recordsWithDepth: 0,
  recordsWithArea: 0,
  byDistrict: [],
  byEventYear: [],
  byEventYearMonth: [],
  byFloodingDepthCategory: [],
  byFloodingAreaCategory: [],
  byGeometryType: [],
  topRoadNames: [],
  topAddresses: [],
  dataQuality: {
    missingEventDateCount: 0,
    invalidEventDateCount: 0,
    missingDistrictCount: 0,
    unknownDistrictCount: 0,
    missingAddressCount: 0,
    missingDepthCount: 0,
    invalidDepthCount: 0,
    missingAreaCount: 0,
    invalidAreaCount: 0,
    missingGeometryCount: 0,
    invalidGeometryCount: 0,
    duplicateFallbackKeyCount: 0,
  },
});
const summary = buildHistoricalFloodingSummary(records, previous.dataQuality);
await writeJson('public/data/historical-flooding-summary.json', summary);

const dashboard = await readJson<Record<string, unknown>>('public/data/safety-dashboard-summary.json', {});
await writeJson('public/data/safety-dashboard-summary.json', { ...dashboard, historicalFloodingSummary: summary });
const conversion = await readJson<Record<string, unknown>>('public/data/historical-flooding-conversion.json', {});
const report = await readJson<Record<string, unknown>>('public/data/conversion-report.json', {});
await writeJson('public/data/conversion-report.json', { ...report, historicalFloodingRecords: conversion });
console.log(`Built historical flooding summary for ${records.length} record(s).`);
