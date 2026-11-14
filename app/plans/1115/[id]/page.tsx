import { planAlbums, planAlbumById } from '../../../../src/lib/plan-albums';
import SpotAlbum from '../../../../src/components/SpotAlbum';
import { assetUrl } from '../../../../src/lib/asset-url';

export const dynamicParams = false;
export function generateStaticParams() {
  return planAlbums.map((place) => ({ id: place.id }));
}

type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const place = planAlbumById[(await params).id];
  return { title: place ? `${place.name}の写真 ｜ 紅葉ドライブ地図` : '紅葉ドライブ地図' };
}
export default async function PlanAlbumPage({ params }: Props) {
  const place = planAlbumById[(await params).id];
  if (!place) return <main className="content-width"><h1>スポットが見つかりません</h1><a href={assetUrl('/')}>地図へ</a></main>;
  return <SpotAlbum spot={place} />;
}
