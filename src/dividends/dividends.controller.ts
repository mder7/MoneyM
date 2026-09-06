import { Body, Controller, Get, Param, Post, Render } from '@nestjs/common';
import { DividendsService } from './dividends.service';

@Controller('dividends')
export class DividendsController {
  constructor(private readonly dividendsService: DividendsService) {}

  // Главная страница со списком акционеров
  @Get()
  @Render('main')
  getShareholders() {
    return {
      title: 'Акционеры компании',
      name: 'BMSTU',
      data: {
        current_date: new Date().toLocaleDateString(),
        shareholders: this.dividendsService.findAll(),
      },
    };
  }

  // Страница конкретного акционера
  @Get('shareholder/:id')
  @Render('shareholder')
  getShareholder(@Param('id') id: string) {
    const shareholder = this.dividendsService.findById(Number(id));
    return {
      title: shareholder ? shareholder.title : 'Не найдено',
      data: {
        id,
        current_date: new Date().toLocaleDateString(),
        shareholder: shareholder,
      },
    };
  }

  // Поиск акционера по ФИО через POST-форму
  @Post()
  @Render('main')
  async searchShareholders(@Body() body: { query?: string }) {
    const query = body?.query || '';
    return {
      title: 'Акционеры компании',
      name: 'BMSTU',
      data: {
        current_date: new Date().toLocaleDateString(),
        shareholders: this.dividendsService.search(query),
        query,
      },
    };
  }
}