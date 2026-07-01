import { readdir, readFile, stat } from 'node:fs/promises';
import { countBy } from '../src/lib/safetyData.ts';
import type {
  FireDepartmentDonationInKindSummary,
  FireDepartmentDonationItemCategory,
  FireDepartmentDonationPurposeCategory,
} from '../src/types.ts';
import { convertFireDepartmentDonationInKindRow, readCsv, writeJson } from './shared.ts';

const rawDir = 'data/raw/fire-department-donation-in-kind-records';
const status = await readFile(`${rawDir}/fetch-status.json`, 'utf8')
  .then((value) => JSON.parse(value) as { resources?: Array<{ name: string; format: string; path: string; unsupported?: boolean }> })
  .catch(() => null);
const csvResources = status?.resources?.filter((item) => item.format.toLowerCase() === 'csv') ?? [];
const localCsvResources = csvResources.length
  ? csvResources
  : (await readdir(rawDir)).filter((name) => name.endsWith('.csv')).map((name) => ({ name, format: 'csv', path: `${rawDir}/${name}` }));
const unsupportedResources = status?.resources?.filter((item) => item.unsupported).map((item) => item.name) ?? [];
const resourceRows = await Promise.all(
  localCsvResources.map(async (resource) => ({
    resource,
    rows: await readCsv(resource.path),
  })),
);
const records = resourceRows.flatMap(({ resource, rows }) =>
  rows.map((row, index) => convertFireDepartmentDonationInKindRow(row, index, resource.name)),
);
const years = records.flatMap((record) => (record.year ? [record.year] : []));
const dates = records.flatMap((record) => (record.donationDate ? [record.donationDate] : []));
const sortedYears = [...years].sort((a, b) => a - b);
const sortedDates = [...dates].sort();
const summary: FireDepartmentDonationInKindSummary = {
  totalRecords: records.length,
  minYear: sortedYears[0],
  maxYear: sortedYears.at(-1),
  latestYear: sortedYears.at(-1),
  minDonationDate: sortedDates[0],
  maxDonationDate: sortedDates.at(-1),
  uniqueDonorCount: Object.keys(countBy(records, (record) => record.donorNameNormalized)).length,
  uniqueDonatedItemCount: Object.keys(countBy(records, (record) => record.donatedItemNormalized)).length,
  uniqueDonationPurposeCount: Object.keys(countBy(records, (record) => record.donationPurposeNormalized)).length,
  recordsWithDonationDate: records.filter((record) => record.donationDate).length,
  recordsWithDonorName: records.filter((record) => record.donorName).length,
  recordsWithDonatedItem: records.filter((record) => record.donatedItem).length,
  recordsWithDonationPurpose: records.filter((record) => record.donationPurpose).length,
  byYear: Object.entries(countBy(records, (record) => (record.year ? String(record.year) : undefined))).map(([year, recordCount]) => {
    const matching = records.filter((record) => record.year === Number(year));
    return {
      year: Number(year),
      recordCount,
      uniqueDonorCount: Object.keys(countBy(matching, (record) => record.donorNameNormalized)).length,
      uniqueDonatedItemCount: Object.keys(countBy(matching, (record) => record.donatedItemNormalized)).length,
    };
  }).sort((a, b) => a.year - b.year),
  byMonth: Object.entries(countBy(records, (record) => record.donationMonthKey))
    .map(([donationMonthKey, recordCount]) => ({ donationMonthKey, recordCount }))
    .sort((a, b) => a.donationMonthKey.localeCompare(b.donationMonthKey)),
  byDonor: Object.entries(countBy(records, (record) => record.donorNameNormalized)).map(([donorName, recordCount]) => {
    const donorYears = records.filter((record) => record.donorNameNormalized === donorName).flatMap((record) => (record.year ? [record.year] : [])).sort((a, b) => a - b);
    return { donorName, recordCount, firstYear: donorYears[0], latestYear: donorYears.at(-1) };
  }).sort((a, b) => b.recordCount - a.recordCount),
  byDonatedItemCategory: Object.entries(countBy(records, (record) => record.donatedItemCategory))
    .map(([donatedItemCategory, count]) => ({ donatedItemCategory: donatedItemCategory as FireDepartmentDonationItemCategory, count }))
    .sort((a, b) => b.count - a.count),
  byDonationPurposeCategory: Object.entries(countBy(records, (record) => record.donationPurposeCategory))
    .map(([donationPurposeCategory, count]) => ({ donationPurposeCategory: donationPurposeCategory as FireDepartmentDonationPurposeCategory, count }))
    .sort((a, b) => b.count - a.count),
  topDonatedItems: Object.entries(countBy(records, (record) => record.donatedItemNormalized))
    .map(([donatedItem, count]) => ({ donatedItem, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30),
  topDonationPurposes: Object.entries(countBy(records, (record) => record.donationPurposeNormalized))
    .map(([donationPurpose, count]) => ({ donationPurpose, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30),
  resourceBreakdown: resourceRows.map(({ resource, rows }) => ({ resourceName: resource.name, recordCount: rows.length })),
  dataQuality: {
    missingDateCount: records.filter((record) => !record.donationDate).length,
    missingDonorNameCount: records.filter((record) => !record.donorName).length,
    missingDonatedItemCount: records.filter((record) => !record.donatedItem).length,
    missingDonationPurposeCount: records.filter((record) => !record.donationPurpose).length,
    unsupportedResourceCount: unsupportedResources.length,
  },
};
const latest = records.filter((record) => record.year === summary.latestYear);

await writeJson('public/data/fire-department-donation-in-kind-records.json', records);
await writeJson('public/data/fire-department-donation-in-kind-summary.json', summary);
await writeJson('public/data/fire-department-donation-in-kind-latest.json', latest);
await writeJson('public/data/fire-department-donation-in-kind-conversion.json', {
  inputRows: resourceRows.reduce((sum, item) => sum + item.rows.length, 0),
  outputRows: records.length,
  resources: await Promise.all(localCsvResources.map(async (resource) => ({ ...resource, fileSize: (await stat(resource.path)).size }))),
  unsupportedResources,
  invalidYearExamples: records.filter((record) => !record.year).slice(0, 20).map((record) => record.yearRaw ?? record.resourceName ?? ''),
  invalidDateExamples: records.filter((record) => record.year && record.month && record.day && !record.donationDate).slice(0, 20).map((record) => `${record.yearRaw}-${record.monthRaw}-${record.dayRaw}`),
  duplicateDonorNames: Object.entries(countBy(records, (record) => record.donorNameNormalized)).filter(([, count]) => count > 1).slice(0, 20).map(([key]) => key),
  duplicateFallbackKeys: Object.entries(countBy(records, (record) => [record.year, record.month, record.day, record.donorNameNormalized, record.donatedItemNormalized, record.donationPurposeNormalized].join('|')))
    .filter(([, count]) => count > 1)
    .slice(0, 20)
    .map(([key]) => key),
});

console.log(`Converted ${records.length} fire donation rows.`);
