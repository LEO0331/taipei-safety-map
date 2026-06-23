import { countBy } from '../src/lib/safetyData.ts';
import type { MedicalFacilitySummary } from '../src/types.ts';
import { convertMedicalFacilityRow, readCsv, writeJson } from './shared.ts';

const hospitalPath = process.argv[2] ?? 'data/raw/medical-facilities/hospitals.csv';
const clinicPath = process.argv[3] ?? 'data/raw/medical-facilities/clinics.csv';
const [hospitalRows, clinicRows] = await Promise.all([readCsv(hospitalPath), readCsv(clinicPath)]);
const facilities = [
  ...hospitalRows.map((row, index) => convertMedicalFacilityRow(row, index, 'hospital')),
  ...clinicRows.map((row, index) => convertMedicalFacilityRow(row, index, 'clinic')),
];

const districts = [...new Set(facilities.flatMap((item) => (item.district ? [item.district] : [])))].sort();
const summary: MedicalFacilitySummary = {
  totalMedicalFacilities: facilities.length,
  hospitalCount: facilities.filter((item) => item.facilityType === 'hospital').length,
  clinicCount: facilities.filter((item) => item.facilityType === 'clinic').length,
  validCoordinateCount: facilities.filter((item) => item.coordinateStatus === 'valid').length,
  recordsWithoutDistrict: facilities.filter((item) => !item.district).length,
  byDistrict: districts.map((district) => {
    const records = facilities.filter((item) => item.district === district);
    return {
      district,
      hospitalCount: records.filter((item) => item.facilityType === 'hospital').length,
      clinicCount: records.filter((item) => item.facilityType === 'clinic').length,
      totalCount: records.length,
    };
  }),
  byFacilityType: (['hospital', 'clinic'] as const).map((facilityType) => ({
    facilityType,
    count: facilities.filter((item) => item.facilityType === facilityType).length,
  })),
  byMedicalCategory: Object.entries(countBy(facilities, (item) => item.medicalCategory)).map(
    ([medicalCategory, count]) => ({ medicalCategory, count }),
  ),
};

await writeJson('public/data/medical-facilities.json', facilities);
await writeJson('public/data/medical-facility-summary.json', summary);

console.log(`Converted ${facilities.length} medical facility rows.`);
