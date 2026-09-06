export interface Shareholder {
  id: number;
  title: string;          // ФИО / название акционера
  ownershipShare: number; // доля владения, %
  sharesCount: number;    // количество акций
}