'use client';
import { Component, type ReactNode } from 'react';

export default class MapErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="map-loading" role="alert"><p>地図を読み込めませんでした。下の写真一覧からも場所を選べます。</p><button type="button" className="text-button" onClick={this.props.onRetry}>ページを再読み込み</button></div> : this.props.children;
  }
}
