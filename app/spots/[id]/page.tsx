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
  return <SpotAlbum spot={{ id: spot.id, name: spot.name, photos: spot.photos }} />;
}
