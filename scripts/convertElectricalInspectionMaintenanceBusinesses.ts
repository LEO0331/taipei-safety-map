import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { decodeCsvBuffer, parseCsv, writeJson } from './shared.ts';

const [header = [], ...rows] = parseCsv(decodeCsvBuffer(await readFile('data/raw/electrical-equipment-inspection-maintenance-businesses/records.csv')));
const columns = header.map((value) => value.replace(/^\uFEFF/, '').trim());
const find = (...names: string[]) => columns.findIndex((column) => names.includes(column));
const fields = { name: find('維護業名稱'), certificate: find('證號'), registration: find('營利事業統一編號'), address: find('營業地址'), person: find('負責人姓名'), status: find('狀態'), date: find('核設日期'), document: find('核設文號'), longitude: find('位置X座標(經度)', '位置X座標'), latitude: find('位置Y座標(緯度)', '位置Y座標') };
if (Object.values(fields).some((index) => index < 0)) throw new Error(`Unexpected electrical-business CSV schema: ${columns.join(', ')}`);
const districts = ['松山區', '信義區', '大安區', '中山區', '中正區', '大同區', '萬華區', '文山區', '南港區', '內湖區', '士林區', '北投區'];
const text = (row: string[], index: number) => (row[index] ?? '').trim().replace(/\s{2,}/g, ' ');
const date = (raw: string) => {
  const match = raw.match(/^(\d{3,4})[./-](\d{1,2})[./-](\d{1,2})$/) ?? raw.match(/^(\d{3,4})(\d{2})(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]) < 1911 ? Number(match[1]) + 1911 : Number(match[1]);
  const month = Number(match[2]); const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
};
const classifyStatus = (raw: string) => {
  const value = raw.trim();
  if (/^(營業中|有效|正常|核准|登記)$/.test(value)) return 'active';
  if (/停業|暫停/.test(value)) return 'suspended';
  if (/撤銷/.test(value)) return 'revoked';
  if (/註銷|廢止|取消/.test(value)) return 'cancelled';
  return 'unknown';
};
const number = (raw: string) => /^-?\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : null;
const seen = new Set<string>();
const exactDuplicates: string[] = [];
const records = rows.filter((row) => row.some((cell) => cell.trim())).flatMap((row) => {
  const originalValues = Object.fromEntries(columns.map((name, index) => [name, text(row, index)]));
  const key = JSON.stringify(originalValues);
  if (seen.has(key)) { exactDuplicates.push(key); return []; }
  seen.add(key);
  const businessName = text(row, fields.name); const certificateNumber = text(row, fields.certificate); const businessRegistrationNumber = text(row, fields.registration); const businessAddress = text(row, fields.address); const registrationStatusRaw = text(row, fields.status); const longitudeRaw = text(row, fields.longitude); const latitudeRaw = text(row, fields.latitude);
  const longitude = number(longitudeRaw); const latitude = number(latitudeRaw);
  const hasValidCoordinates = longitude !== null && latitude !== null && longitude >= 121.3 && longitude <= 121.8 && latitude >= 24.85 && latitude <= 25.3;
  const idSeed = certificateNumber || (businessRegistrationNumber && `${businessRegistrationNumber}-${businessName}`) || createHash('sha256').update(key).digest('hex').slice(0, 16);
  return [{ id: `electrical-${idSeed}`, businessName, certificateNumber, businessRegistrationNumber, businessAddress, districtName: districts.find((district) => businessAddress.includes(district)) ?? '', responsiblePersonName: text(row, fields.person), registrationStatusRaw, registrationStatus: classifyStatus(registrationStatusRaw), approvalDateRaw: text(row, fields.date), approvalDate: date(text(row, fields.date)), approvalDocumentNumber: text(row, fields.document), longitudeRaw, latitudeRaw, longitude: hasValidCoordinates ? longitude : null, latitude: hasValidCoordinates ? latitude : null, hasValidCoordinates, externalMapQuery: businessAddress || businessName, originalValues }];
});
const count = (values: string[]) => Object.entries(values.reduce<Record<string, number>>((all, value) => { if (value) all[value] = (all[value] ?? 0) + 1; return all; }, {})).filter(([, value]) => value > 1).map(([value]) => value);
const conflictingValues = (entries: Array<[string, string]>) => {
  const groups = new Map<string, Set<string>>();
  for (const [key, value] of entries) {
    if (!key || !value) continue;
    const values = groups.get(key) ?? new Set<string>();
    values.add(value); groups.set(key, values);
  }
  return [...groups].filter(([, values]) => values.size > 1).map(([key]) => key);
};
await writeJson('public/data/electrical-equipment-inspection-maintenance-businesses/records.json', records);
await writeJson('public/data/electrical-equipment-inspection-maintenance-businesses/conversion-report.json', { inputRows: rows.filter((row) => row.some((cell) => cell.trim())).length, outputRows: records.length, exactDuplicateRows: exactDuplicates.length, sourceColumns: columns, sourceStatusValues: [...new Set(records.map((record) => record.registrationStatusRaw))], missingBusinessName: records.filter((record) => !record.businessName).length, missingCertificateNumber: records.filter((record) => !record.certificateNumber).length, missingBusinessRegistrationNumber: records.filter((record) => !record.businessRegistrationNumber).length, malformedBusinessRegistrationNumber: records.filter((record) => record.businessRegistrationNumber && !/^\d{8}$/.test(record.businessRegistrationNumber)).length, missingAddress: records.filter((record) => !record.businessAddress).length, unresolvedDistrict: records.filter((record) => !record.districtName).length, unknownStatus: records.filter((record) => record.registrationStatus === 'unknown').length, missingOrMalformedApprovalDate: records.filter((record) => !record.approvalDate).length, missingApprovalDocumentNumber: records.filter((record) => !record.approvalDocumentNumber).length, invalidCoordinates: records.filter((record) => !record.hasValidCoordinates).length, possibleCoordinateReversal: records.filter((record) => { const x = number(record.longitudeRaw); const y = number(record.latitudeRaw); return x !== null && y !== null && x >= 24.85 && x <= 25.3 && y >= 121.3 && y <= 121.8; }).length, duplicateCertificateNumbers: count(records.map((record) => record.certificateNumber)), duplicateBusinessRegistrationNumbers: count(records.map((record) => record.businessRegistrationNumber)), conflictingCertificateBusinesses: conflictingValues(records.map((record) => [record.certificateNumber, record.businessName])), sameBusinessMultipleStatuses: conflictingValues(records.map((record) => [record.businessName, record.registrationStatus])), sameAddressMultipleBusinesses: conflictingValues(records.map((record) => [record.businessAddress, record.businessName])) });
