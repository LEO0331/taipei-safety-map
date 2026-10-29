import { Component, type ReactNode } from 'react';

/** A stale/offline optional chunk must always leave a working route back. */
export default class ExplorerBoundary extends Component<{
  language: 'zh' | 'en'; onBack: () => void; children: ReactNode;
}, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    const zh = this.props.language === 'zh';
    return <main className="explorer-loading" role="alert">
      <h2>{zh ? '暫時無法載入探索導覽' : 'Explorer could not load'}</h2>
      <p>{zh ? '請返回儀表板，使用原有分類導覽。' : 'Return to the dashboard to use the existing category navigation.'}</p>
      <button type="button" autoFocus onClick={this.props.onBack}>{zh ? '返回儀表板' : 'Return to Dashboard'}</button>
    </main>;
  }
}
