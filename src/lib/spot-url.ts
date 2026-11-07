import { assetUrl } from './asset-url';

export const spotUrl = (id: string) => assetUrl(`/spots/${id.toLowerCase()}/`);
export const spotMapUrl = (id: string) => `${assetUrl('/')}?view=map&spot=${encodeURIComponent(id)}`;
