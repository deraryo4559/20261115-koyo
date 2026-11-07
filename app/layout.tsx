import RouteRoulette from '../src/components/RouteRoulette';
import type { ReactNode } from 'react';
import { assetUrl } from '../src/lib/asset-url';
import '../src/styles/global.css';

export const metadata = {
  title: '紅葉ドライブ地図',
  icons: { icon: assetUrl('/favicon.svg') },
  description: '箱根・芦ノ湖・御殿場、山梨、秩父・多摩。25の紅葉スポットを写真と地図から選ぶ。',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ja"><body>{children}<RouteRoulette /></body></html>;
}
