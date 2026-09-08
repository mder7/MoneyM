export type ShareholderStatus = 'draft' | 'published' | 'deleted';

export interface Shareholder {
  id: number;
  title: string;             // ФИО / название акционера
  description: string;       // короткое описание (для ленты, "ещё")
  ownershipShare: number;    // доля владения, % — поле 1 по теме
  sharesCount: number;       // количество акций — поле 2 по теме
  status: ShareholderStatus; // черновик / опубликован / удалён
  likes: number[];           // массив ID пользователей, поставивших лайк
  imageKey: string;          // имя файла изображения в Minio (латиница)
  videoKey: string;          // имя видео-файла в Minio (латиница)
}