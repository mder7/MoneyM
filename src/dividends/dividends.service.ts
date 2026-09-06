import { Injectable } from '@nestjs/common';
import { Shareholder } from './shareholder.interface';

@Injectable()
export class DividendsService {
  private shareholders: Shareholder[] = [
    { id: 1, title: 'Иванов Иван Иванович', ownershipShare: 35, sharesCount: 1200 },
    { id: 2, title: 'Петрова Мария Сергеевна', ownershipShare: 20, sharesCount: 700 },
    { id: 3, title: 'ООО "Инвест Групп"', ownershipShare: 45, sharesCount: 1600 },
  ];

  findAll(): Shareholder[] {
    return this.shareholders;
  }

  findById(id: number): Shareholder | undefined {
    return this.shareholders.find((s) => s.id === id);
  }

  search(query: string): Shareholder[] {
    if (!query || !query.trim()) {
      return this.shareholders;
    }
    const q = query.toLowerCase();
    return this.shareholders.filter((s) => s.title.toLowerCase().includes(q));
  }
}