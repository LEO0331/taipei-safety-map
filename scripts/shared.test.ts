import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  convertAedRow,
  convertBicycleTheftRow,
  convertEmergencyShelterRow,
  convertEvacuationGateRow,
  convertFireHydrantRow,
  convertMedicalFacilityRow,
  convertMotorcycleTheftRow,
  convertPoliceCctvInstallationLocationRow,
  convertShelterRow,
  convertTrafficCctvRow,
  convertNaturalDisasterSuspensionRow,
  parseIncidentTimeBand,
  decodeCsvBuffer,
  classifyNaturalDisasterType,
  classifySuspensionMessage,
  normalizeDistrictCode,
  parseCameraLocationCode,
  parseDisasterApplicability,
  parseHydrantArea,
  parseNumberField,
  parseServedVillages,
  parseSourceBoolean,
  parseCsv,
  readCsv,
} from './shared';

describe('CSV script helpers', () => {
  it('parses quoted CSV fields with embedded commas and newlines', () => {
    expect(parseCsv('行政區,地址\n中正區,"臺北市,測試路"\n大安區,"跨\n行"')).toEqual([
      ['行政區', '地址'],
      ['中正區', '臺北市,測試路'],
      ['大安區', '跨\n行'],
    ]);
  });

  it('decodes UTF-8 BOM CSV buffers without leaking the BOM into headers', () => {
    const buffer = new Uint8Array([0xef, 0xbb, 0xbf, ...Buffer.from('行政區\n中正區', 'utf8')]);

    expect(decodeCsvBuffer(buffer)).toBe('行政區\n中正區');
  });

  it('falls back to Big5 when a CSV is not valid UTF-8', () => {
    const buffer = new Uint8Array([0xbd, 0x73, 0xb8, 0xb9]);

    expect(decodeCsvBuffer(buffer)).toBe('編號');
  });

  it('reads CSV files into normalized row objects', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'taipei-safety-map-'));
    const path = join(directory, 'sample.csv');
    await writeFile(path, '\uFEFF行政區,地址\n中正區,臺北市中正區\n');

    await expect(readCsv(path)).resolves.toEqual([{ 行政區: '中正區', 地址: '臺北市中正區' }]);
  });

  it('accepts shelter coordinate headers with uppercase X and Y', () => {
    expect(
      convertShelterRow(
        {
          項次: '1',
          行政區: '大同區',
          地址: '臺北市大同區承德路二段235號',
          容納人數: '1,581',
          座標X: '121.518527',
          座標Y: '25.061274',
        },
        0,
      ),
    ).toMatchObject({
      capacity: 1581,
      coordinateStatus: 'valid',
      longitude: 121.518527,
      latitude: 25.061274,
    });
  });

  it('maps AED district codes and validates coordinates', () => {
    expect(
      convertAedRow(
        {
          場所名稱: '測試 AED',
          場所地址: '和平東路1段162號',
          行政區域代碼: '63000030',
          緯度: '25.02603',
          經度: '121.528283',
        },
        0,
      ),
    ).toMatchObject({
      district: '大安區',
      coordinateStatus: 'valid',
      layer: 'aed_location',
    });
  });

  it('normalizes evacuation gate fields and validates coordinates', () => {
    expect(
      convertEvacuationGateRow(
        {
          Riverside_Park: '-',
          Name: '景1,育英',
          Description: '文山區育英街底',
          Longitude: '121.5369669',
          Latitude: '24.98947221',
        },
        0,
      ),
    ).toEqual({
      id: 'evacuation-gate-1',
      layer: 'evacuation_gate',
      riversidePark: undefined,
      gateName: '景1,育英',
      description: '文山區育英街底',
      longitude: 121.5369669,
      latitude: 24.98947221,
      coordinateStatus: 'valid',
      source: '臺北市疏散門資訊',
    });

    expect(
      convertEvacuationGateRow(
        { Riverside_Park: '河濱公園', Name: '測試', Longitude: '120', Latitude: '24' },
        1,
      ).coordinateStatus,
    ).toBe('outlier');
  });

  it('normalizes decimal district codes', () => {
    expect(normalizeDistrictCode('63000050.0')).toBe('63000050');
    expect(normalizeDistrictCode(' nan ')).toBeUndefined();
  });

  it('converts hospitals and clinics into medical facilities', () => {
    expect(
      convertMedicalFacilityRow(
        {
          行政區域代碼: '63000050',
          機構名稱: '測試醫院\t臺北市中正區測試路1號\t121.51\t25.04',
          地址: '臺北市中正區測試路1號',
          經度: '121.51',
          緯度: '25.04',
        },
        0,
        'hospital',
      ),
    ).toMatchObject({
      id: 'medical-hospital-1',
      layer: 'medical_facility',
      facilityType: 'hospital',
      facilityName: '測試醫院',
      medicalCategory: '醫院',
      districtCode: '63000050',
      district: '中正區',
      coordinateStatus: 'valid',
    });

    expect(
      convertMedicalFacilityRow(
        {
          縣市別代碼: '63000',
          分類: '診所',
          機構名稱: '測試診所',
          行政區: '63000030.0',
          地址: '臺北市大安區測試路2號',
          經度: '121.52',
          緯度: '25.03',
        },
        0,
        'clinic',
      ),
    ).toMatchObject({
      id: 'medical-clinic-1',
      facilityType: 'clinic',
      districtCode: '63000030',
      district: '大安區',
      cityCode: '63000',
      coordinateStatus: 'valid',
    });
  });

  it('parses and converts fire hydrant rows', () => {
    expect(parseHydrantArea('新北市三重區二重里')).toMatchObject({
      city: '新北市',
      district: '三重區',
      village: '二重里',
      areaScope: 'new_taipei_official_scope',
      isNewTaipei: true,
    });

    expect(
      convertFireHydrantRow(
        {
          序號: '1',
          圖號: '3448A',
          編號: '1',
          WPID: 'WPH65002000023',
          '97X座標': '298313.375',
          '97Y座標': '2772832.341',
          WGS84經度: '121.4788752',
          WGS84緯度: '25.06292077',
          型式: '地下式消防栓',
          所在地區: '新北市三重區二重里',
        },
        0,
      ),
    ).toMatchObject({
      id: 'fire-hydrant-WPH65002000023',
      layer: 'fire_hydrant',
      sourceSequenceNumber: 1,
      hydrantType: 'underground',
      city: '新北市',
      district: '三重區',
      village: '二重里',
      coordinateStatus: 'valid',
      sourceAgency: '臺北自來水事業處',
    });

    expect(convertFireHydrantRow({ WGS84經度: 'x', WGS84緯度: '25', 型式: '地上式消防栓' }, 1)).toMatchObject({
      coordinateStatus: 'unparsed',
      hydrantType: 'above_ground',
    });
  });

  it('parses and converts emergency shelter rows without coordinates', () => {
    expect(parseDisasterApplicability('Y')).toBe('yes');
    expect(parseDisasterApplicability('N')).toBe('no');
    expect(parseDisasterApplicability('備用')).toBe('backup');
    expect(parseDisasterApplicability('老舊聚落')).toBe('old_settlement');
    expect(parseSourceBoolean('Y')).toBe(true);
    expect(parseSourceBoolean('N')).toBe(false);
    expect(parseServedVillages('板溪里、網溪里，螢圃里;林興里')).toEqual(['板溪里', '網溪里', '螢圃里', '林興里']);
    expect(parseNumberField('1,234')).toBe(1234);

    expect(
      convertEmergencyShelterRow(
        {
          收容所編號: 'SA100-0002',
          名稱: '臺北市立螢橋國民中學',
          縣市: '臺北市',
          郵遞區號: '100',
          鄉鎮: '',
          村里: '林興里',
          門牌地址: '臺北市中正區汀州路三段四號',
          類型: '學校',
          水災: 'Y',
          震災: '備用',
          土石流: 'N',
          海嘯: '老舊聚落',
          救濟支站: 'Y',
          無障礙設施: 'Y',
          室內: 'Y',
          室外: 'N',
          服務里別: '板溪里、網溪里',
          容納人數: '52',
          '收容所面積（平方公尺）': '209',
          聯絡人姓名: '公開姓名',
          聯絡人連絡電話: '02-0000',
          管理人姓名: '管理者',
          管理人連絡電話: '02-1111',
          備考: '測試',
        },
        0,
      ),
    ).toMatchObject({
      id: 'emergency-shelter-SA100-0002',
      layer: 'emergency_shelter',
      shelterType: 'school',
      district: '中正區',
      floodStatus: 'yes',
      earthquakeStatus: 'backup',
      tsunamiStatus: 'old_settlement',
      isReliefStation: true,
      hasOutdoorSpace: false,
      servedVillages: ['板溪里', '網溪里'],
      capacityPeople: 52,
      shelterAreaSqm: 209,
      contactPersonName: '公開姓名',
      locationPrecision: 'address_only',
    });
  });

  it('parses and converts traffic CCTV rows', () => {
    expect(parseCameraLocationCode('001-市民快承德')).toEqual({
      cameraLocationCodeRaw: '001-市民快承德',
      cameraLocationCode: '001',
      locationDescription: '市民快承德',
    });

    expect(
      convertTrafficCctvRow(
        {
          流水號: '1',
          縣市: '臺北市',
          攝影機編號: '001-市民快承德',
          WGSX: '121.5169',
          WGSY: '25.04855',
        },
        0,
      ),
    ).toMatchObject({
      id: 'traffic-cctv-1',
      layer: 'traffic_cctv',
      sourceSequenceNumber: 1,
      city: '臺北市',
      cameraLocationCode: '001',
      locationDescription: '市民快承德',
      longitude: 121.5169,
      latitude: 25.04855,
      coordinateStatus: 'valid',
      sourceAgency: '臺北市政府交通局交通管制工程處',
    });

    expect(convertTrafficCctvRow({ WGSX: 'x', WGSY: '25' }, 1).coordinateStatus).toBe('unparsed');
    expect(convertTrafficCctvRow({ WGSX: '120', WGSY: '25' }, 2).coordinateStatus).toBe('outlier');
  });

  it('converts natural disaster suspension rows and preserves raw messages', () => {
    expect(classifyNaturalDisasterType('1020豪雨')).toBe('heavy_rain');
    expect(classifyNaturalDisasterType('九二一大地震')).toBe('earthquake');
    expect(classifyNaturalDisasterType('海嘯警報')).toBe('tsunami_warning');
    expect(classifySuspensionMessage('未達停止辦公及上課標準。')).toMatchObject({
      decisionCategory: 'standard_not_met',
      workSuspensionStatus: 'standard_not_met',
    });
    expect(
      convertNaturalDisasterSuspensionRow(
        {
          民國年: '87',
          月: '10',
          日: '16',
          天然災害名稱: '瑞伯颱風',
          臺北市停止上班上課情形: '10月16日停止辦公上課。',
        },
        0,
      ),
    ).toMatchObject({
      date: '1998-10-16',
      disasterType: 'typhoon',
      decisionCategory: 'citywide_full_suspension',
      suspensionMessageRaw: '10月16日停止辦公上課。',
    });
  });

  it('converts bicycle theft rows without exact coordinates', () => {
    expect(parseIncidentTimeBand('23~01')).toMatchObject({
      incidentTimeBand: '23~01',
      crossesMidnight: true,
      timeOfDayCategory: 'cross_midnight',
    });

    const record = convertBicycleTheftRow(
        {
          編號: '1',
          案類: '自行車竊盜',
          發生日期: '1040101',
          發生時段: '16~18',
          發生地點: '台北市大安區住安里四維路124巷1~30號',
        },
        0,
      );
    expect(record).toMatchObject({
      date: '2015-01-01',
      district: '大安區',
      village: '住安里',
      roadName: '四維路',
      hasAddressRange: true,
      addressRangeText: '1~30號',
      locationPrecision: 'road_or_segment_level',
    });
    expect(record).not.toHaveProperty('latitude');
    expect(record).not.toHaveProperty('longitude');
  });

  it('converts motorcycle theft rows without exact coordinates', () => {
    const record = convertMotorcycleTheftRow(
      {
        編號: '1',
        案類: '機車竊盜',
        發生日期: '1070101',
        發生時段: '02-04',
        發生地點: '臺北市中山區新生北路3段31 - 60號',
      },
      0,
    );
    expect(record).toMatchObject({
      date: '2018-01-01',
      incidentTimeBand: '02~04',
      district: '中山區',
      roadName: '新生北路3段',
      hasAddressRange: true,
      addressRangeText: '31-60號',
      caseType: 'motorcycle_theft',
      locationPrecision: 'road_or_segment_level',
    });
    expect(record).not.toHaveProperty('latitude');
    expect(record).not.toHaveProperty('longitude');
  });

  it('converts police CCTV rows without exact coordinates', () => {
    const record = convertPoliceCctvInstallationLocationRow(
      {
        縣市別代碼: '10001',
        編號: 'LAAA001-01',
        所屬單位: '大同分局 寧夏路派出所',
        安裝地址: '民生西路231號',
        攝影方向: '西',
      },
      0,
    );
    expect(record).toMatchObject({
      safetyLayer: 'police_cctv_installation_location',
      cityCountyCode: '10001',
      sourceSequenceNumber: 'LAAA001-01',
      policeUnit: '大同分局 寧夏路派出所',
      district: '大同區',
      roadName: '民生西路',
      hasInstallationAddress: true,
      hasCameraDirection: true,
      hasParsedDistrict: true,
      hasParsedRoadName: true,
      locationPrecision: 'address_only',
    });
    expect(record).not.toHaveProperty('latitude');
    expect(record).not.toHaveProperty('longitude');
  });
});
