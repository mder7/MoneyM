import { Controller, Get, Param, Query, Render } from '@nestjs/common';
import { DividendsService } from './dividends.service';
import { Shareholder } from './shareholder.interface';

@Controller('dividends')
export class DividendsController {
  constructor(private readonly dividendsService: DividendsService) {}

  // Лента — стартовая страница (первый опубликованный акционер)
  // GET /dividends
  @Get()
  @Render('feed')
  getDefaultFeed() {
    const [first] = this.dividendsService.findPublished();
    return this.buildFeedView(first);
  }

  // Плитка карточек — список всех опубликованных акционеров
  // GET /dividends/tiles?minShare=20
  @Get('tiles')
  @Render('tiles')
  getTiles(@Query('minShare') minShare?: string) {
    const parsedMinShare = minShare ? Number(minShare) : undefined;
    const shareholders = this.dividendsService.findPublished(parsedMinShare);

    return {
      title: 'Акционеры компании',
      data: {
        shareholders,
        minShare: minShare ?? '',
      },
    };
  }

  // Страница "добавление" — показывает единственный черновик
  // GET /dividends/add
  @Get('add')
  @Render('add')
  getAddPage() {
    const draft = this.dividendsService.findDraft();
    return {
      title: 'Добавление акционера',
      data: { draft },
    };
  }

  // Лента — конкретный акционер по id, либо следующий (?next=true)
  // GET /dividends/feed/:id?next=true
  @Get('feed/:id')
  @Render('feed')
  getFeed(@Param('id') id: string, @Query('next') next?: string) {
    const numericId = Number(id);
    const shareholder =
      next === 'true'
        ? this.dividendsService.findNextAfter(numericId)
        : this.dividendsService.findById(numericId);

    return this.buildFeedView(shareholder);
  }

  private buildFeedView(shareholder?: Shareholder) {
    return {
      title: shareholder ? shareholder.title : 'Не найдено',
      data: {
        shareholder,
        likesCount: shareholder ? this.dividendsService.likesCount(shareholder) : 0,
      },
    };
  }
}