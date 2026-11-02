import { describe, expect, it } from 'vitest';
import records from '../../public/data/bridge-inspection-maintenance/records.json';
import { bridgeHistoryKey } from './bridgeHistory';

describe('bridge directory history identity', () => {
  it.each(['民權橋', '長安橋'])('keeps the published %s histories in their own districts', name => {
    const sameName = records.filter(record => record.bridgeNameNormalized === name);
    expect(sameName).toHaveLength(2);
    expect(new Set(sameName.map(bridgeHistoryKey)).size).toBe(2);
    for (const selected of sameName) {
      const history = records.filter(record => bridgeHistoryKey(record) === bridgeHistoryKey(selected));
      expect(history).toEqual([selected]);
    }
  });

  it('keeps authorities separate while grouping records for the same source identity', () => {
    const record = { bridgeNameNormalized: 'bridge', district: 'district', authority: 'authority' };
    expect(bridgeHistoryKey({ ...record })).toBe(bridgeHistoryKey(record));
    expect(bridgeHistoryKey({ ...record, authority: 'other' })).not.toBe(bridgeHistoryKey(record));
  });
});
