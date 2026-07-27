import { readFile } from 'node:fs/promises';
import { decodeCsvBuffer, parseCsv, writeJson } from './shared.ts';

const source = decodeCsvBuffer(await readFile('data/raw/lpg-facilities-and-gas-retailers/records.csv'));
const [header = [], ...rows] = parseCsv(source);
const columns = header.map((value) => value.replace(/^\uFEFF/, '').trim());
const column = (name: string) => columns.indexOf(name);
const fields = {
  sequence: column('項次'),
  name: column('場所名稱'),
  postcode: column('郵遞區號'),
  cityCode: column('縣市別代碼'),
  address: column('場所地址'),
  purpose: column('用途名稱'),
};
if (Object.values(fields).some((index) => index < 0)) {
  throw new Error(`Unexpected LPG CSV schema: ${columns.join(', ')}`);
}

const districts = ['松山區', '信義區', '大安區', '中山區', '中正區', '大同區', '萬華區', '文山區', '南港區', '內湖區', '士林區', '北投區'];
const getDistrict = (address: string) => districts.find((district) => address.includes(district)) ?? '';
const value = (row: string[], index: number) => (row[index] ?? '').trim();
const category = (purpose: string) => {
  if (purpose.includes('分裝')) return 'filling';
  if (purpose.includes('儲存')) return 'storage';
  if (purpose.includes('驗瓶')) return 'cylinder_inspection';
  if (purpose.includes('瓦斯')) return 'gas_retailer';
  return 'other';
};

const records = rows
  .filter((row) => row.some((cell) => cell.trim()))
  .map((row, index) => {
    const address = value(row, fields.address);
    const purpose = value(row, fields.purpose);
    return {
      id: `lpg-${value(row, fields.sequence) || index + 1}`,
      sourceSequenceNumber: value(row, fields.sequence),
      name: value(row, fields.name),
      postcode: value(row, fields.postcode),
      cityCode: value(row, fields.cityCode),
      address,
      districtName: getDistrict(address),
      purpose,
      category: category(purpose),
      originalValues: Object.fromEntries(columns.map((name, columnIndex) => [name, value(row, columnIndex)])),
    };
  });

const duplicateKeys = new Set<string>();
const uniqueRecords = records.filter((record) => {
  const key = `${record.name}|${record.address}|${record.purpose}`;
  if (duplicateKeys.has(key)) return false;
  duplicateKeys.add(key);
  return true;
});

await writeJson('public/data/lpg-facilities-and-gas-retailers/records.json', uniqueRecords);
await writeJson('public/data/lpg-facilities-and-gas-retailers/conversion-report.json', {
  inputRows: records.length,
  outputRows: uniqueRecords.length,
  exactDuplicateRows: records.length - uniqueRecords.length,
  unmappedPurposeValues: [...new Set(uniqueRecords.filter((record) => record.category === 'other').map((record) => record.purpose))],
  recordsWithoutRecognisedDistrict: uniqueRecords.filter((record) => !record.districtName).length,
  sourceColumns: columns,
});
