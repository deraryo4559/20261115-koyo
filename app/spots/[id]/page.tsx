import { spots, spotById } from '../../../src/data';
import SpotAlbum from '../../../src/components/SpotAlbum';
import { assetUrl } from '../../../src/lib/asset-url';

export const dynamicParams = false;
export function generateStaticParams() {
  return spots.map((spot) => ({ id: spot.id.toLowerCase() }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const spot = spotById[(await params).id.toUpperCase()];
  return { title: spot ? `${spot.name}の秋の写真 ｜ 紅葉ドライブ地図` : '紅葉ドライブ地図' };
}

export default async function SpotPage({ params }: Props) {
  const spot = spotById[(await params).id.toUpperCase()];
  if (!spot) return <main className="content-width"><h1>スポットが見つかりません</h1><a href={assetUrl('/')}>スポット一覧へ</a></main>;
  const siblings = spots.filter((item) => item.routeId === spot.routeId);
  const index = siblings.findIndex((item) => item.id === spot.id);
  const adjacent = (item: typeof spot | undefined) => item ? { id: item.id, name: item.name } : null;
  return <SpotAlbum spot={spot} previous={adjacent(siblings[index - 1])} next={adjacent(siblings[index + 1])} />;
}
