export type ShareholderStatus = 'draft' | 'published' | 'deleted';

export interface Shareholder {
  id: number;
  title: string;
  description: string;
  ownershipShare: number;
  preferredShare: number; // доля привилегированных акций, %
  status: ShareholderStatus;
  likes: number[];
  imageKey: string;
  videoKey: string;
}