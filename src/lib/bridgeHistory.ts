type BridgeIdentity = { bridgeNameNormalized: string; district: string; authority: string };

/** Keep detail selection aligned with the directory's existing source-record groups. */
export function bridgeHistoryKey(record: BridgeIdentity): string {
  return `${record.bridgeNameNormalized}|${record.district}|${record.authority}`;
}
