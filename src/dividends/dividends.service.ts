import { Injectable } from '@nestjs/common';
import { Shareholder } from './shareholder.interface';

@Injectable()
export class DividendsService {
  private shareholders: Shareholder[] = [
    {
      id: 1,
      title: 'Иванов Иван Иванович',
      description: 'Крупнейший частный акционер компании, входит в совет директоров с 2019 года.',
      ownershipShare: 35,
      sharesCount: 1200,
      status: 'published',
      likes: [101, 102, 103],
      imageKey: 'http://localhost:9000/dividends/shareholder-ivanov.jpg',
      videoKey: 'http://localhost:9000/dividends/shareholder-ivanov.mp4',
    },
    {
      id: 2,
      title: 'Петрова Мария Сергеевна',
      description: 'Частный инвестор, увеличивает пакет акций третий год подряд.',
      ownershipShare: 20,
      sharesCount: 700,
      status: 'published',
      likes: [101],
      imageKey: 'http://localhost:9000/dividends/shareholder-petrova.jpeg',
      videoKey: 'http://localhost:9000/dividends/shareholder-petrova.mp4',
    },
    {
      id: 3,
      title: 'ООО "Инвест Групп"',
      description: 'Институциональный инвестор с портфелем в нескольких отраслях.',
      ownershipShare: 45,
      sharesCount: 1600,
      status: 'published',
      likes: [101, 102, 103, 104, 105],
      imageKey: 'http://localhost:9000/dividends/shareholder-investgroup.jpg',
      videoKey: 'http://localhost:9000/dividends/shareholder-investgroup.mp4',
    },
    {
      id: 4,
      title: 'Смирнов Дмитрий Александрович',
      description: 'Акционер с долгосрочной стратегией удержания пакета акций.',
      ownershipShare: 15,
      sharesCount: 500,
      status: 'published',
      likes: [201, 202],
      imageKey: 'http://localhost:9000/dividends/shareholder-smirnov.JPG',
      videoKey: 'http://localhost:9000/dividends/shareholder-smirnov.mp4',
    },
    {
      id: 5,
      title: 'АО "Северный Капитал"',
      description: 'Инвестиционный фонд, специализирующийся на промышленных активах.',
      ownershipShare: 25,
      sharesCount: 900,
      status: 'published',
      likes: [301, 302, 303],
      imageKey: 'http://localhost:9000/dividends/shareholder-severny.jpeg',
      videoKey: 'http://localhost:9000/dividends/shareholder-severny.mp4',
    },
    {
      id: 6,
      title: 'Сидоров Артём Павлович',
      description: 'Новый акционер, присоединился в этом квартале.',
      ownershipShare: 10,
      sharesCount: 300,
      status: 'draft',
      likes: [],
      imageKey: 'http://localhost:9000/dividends/shareholder-sidorov.jpg',
      videoKey: 'http://localhost:9000/dividends/shareholder-sidorov.mp4',
    },
    {
      id: 7,
      title: 'Кузнецова Ольга Дмитриевна',
      description: 'Вышла из состава акционеров, доля продана.',
      ownershipShare: 0,
      sharesCount: 0,
      status: 'deleted',
      likes: [12],
      imageKey: 'http://localhost:9000/dividends/shareholder-kuznetsova.jpg',
      videoKey: 'http://localhost:9000/dividends/shareholder-kuznetsova.mp4',
    },
  ];

  // Список опубликованных акционеров (для плитки), с опциональной фильтрацией по доле владения
  findPublished(minShare?: number): Shareholder[] {
    return this.shareholders
      .filter((s) => s.status === 'published')
      .filter((s) => (minShare != null ? s.ownershipShare >= minShare : true));
  }

  // Один акционер по id — для ленты (учитывает только опубликованных)
  findById(id: number): Shareholder | undefined {
    return this.shareholders.find((s) => s.id === id && s.status === 'published');
  }

  // Следующий опубликованный акционер после указанного id — для кнопки "следующий"
  findNextAfter(id: number): Shareholder | undefined {
    const published = this.findPublished();
    const currentIndex = published.findIndex((s) => s.id === id);
    if (currentIndex === -1 || currentIndex === published.length - 1) {
      return published[0]; // зацикливаем на первый, если дальше пусто
    }
    return published[currentIndex + 1];
  }

  // Единственный черновик — для страницы "добавление"
  findDraft(): Shareholder | undefined {
    return this.shareholders.find((s) => s.status === 'draft');
  }

  likesCount(shareholder: Shareholder): number {
    return shareholder.likes.length;
  }
}