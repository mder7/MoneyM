import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Render,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ShareholdersService } from './shareholders.service';
import { Shareholder } from './entities/shareholder.entity';

// авторизации в проекте нет — все действия выполняются от лица одного пользователя
const CURRENT_USER_ID = 1;

// заглушки на случай пустых imageUrl/videoUrl — берём уже существующий файл из MinIO
const DEFAULT_IMAGE = '/img/default.jpg';
const DEFAULT_VIDEO = '/video/default.mp4';

@Controller('shareholders')
export class ShareholdersController {
  constructor(private readonly shareholdersService: ShareholdersService) {}

  // Лента — стартовая страница (первый опубликованный акционер)
  // GET /shareholders
  @Get()
  @Render('feed')
  async getDefaultFeed() {
    const shareholder = await this.shareholdersService.findFeedCard();
    return this.buildFeedView(shareholder);
  }

  // Плитка карточек — список опубликованных, фильтр по мин. доле владения
  // GET /shareholders/tiles?minShare=20
  @Get('tiles')
  @Render('tiles')
  async getTiles(@Query('minShare') minShare?: string) {
    const parsedMinShare = minShare ? Number(minShare) : undefined;
    const shareholders =
      await this.shareholdersService.findPublished(parsedMinShare);

    return {
      title: 'Акционеры компании',
      data: {
        shareholders: shareholders.map((s) => this.buildCardView(s)),
        minShare: minShare ?? '',
      },
    };
  }

  // Страница "добавление" — черновик текущего пользователя, если есть
  // GET /shareholders/add
  @Get('add')
  @Render('add')
  async getAddPage() {
    const draft =
      await this.shareholdersService.findDraftByCreator(CURRENT_USER_ID);

    return {
      title: 'Добавление акционера',
      data: { draft: draft ? this.buildCardView(draft) : null },
    };
  }

  // Лента — конкретный акционер по id, либо следующий по кругу (?next=true)
  // GET /shareholders/feed/:id?next=true
  @Get('feed/:id')
  @Render('feed')
  async getFeed(
    @Param('id', ParseIntPipe) id: number,
    @Query('next') next?: string,
  ) {
    const shareholder =
      next === 'true'
        ? await this.shareholdersService.findFeedCard(id)
        : await this.shareholdersService.findById(id);

    return this.buildFeedView(shareholder);
  }

  // POST добавить/обновить черновик (кнопка "Далее"), ORM
  // Фото/видео в этой лабе реально не загружаются — подставляем заглушку
  @Post()
  async create(
    @Body('fullName') fullName: string,
    @Res() res: Response,
  ) {
    await this.shareholdersService.createDraft({
      fullName,
      creatorId: CURRENT_USER_ID,
      imageUrl: DEFAULT_IMAGE,
      videoUrl: DEFAULT_VIDEO,
    });
    res.redirect('/shareholders/add');
  }

  // POST опубликовать (кнопка "Опубликовать"), ORM
  @Post(':id/publish')
  async publish(
    @Param('id', ParseIntPipe) id: number,
    @Body('shortDescription') shortDescription: string,
    @Body('ownershipShare') ownershipShareRaw: string,
    @Body('preferredShare') preferredShareRaw: string,
    @Res() res: Response,
  ) {
    await this.shareholdersService.publish(id, {
      shortDescription,
      ownershipShare: parseFloat(ownershipShareRaw),
      preferredShare: parseFloat(preferredShareRaw),
    });
    res.redirect('/shareholders/tiles');
  }

  // POST удалить — SQL UPDATE через курсор, без ORM (кнопка на Плитке)
  @Post(':id/delete')
  async remove(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    await this.shareholdersService.deleteByCursor(id);
    res.redirect('/shareholders/tiles');
  }

  // единая view-модель для feed/tiles/add — поля называются так,
  // как их ждут уже готовые .hbs-шаблоны (title, imageKey, videoKey и т.д.)
  private buildCardView(shareholder: Shareholder) {
    const likesCount = shareholder.likesCount ?? shareholder.likes?.length ?? 0;

    return {
      id: shareholder.id,
      title: shareholder.fullName,
      description: shareholder.shortDescription,
      ownershipShare: shareholder.ownershipShare,
      preferredShare: shareholder.preferredShare,
      imageKey: shareholder.imageUrl || DEFAULT_IMAGE,
      videoKey: shareholder.videoUrl || DEFAULT_VIDEO,
      likes: shareholder.likes ?? [],
      likesCount,
    };
  }

  // подсчёт лайков делаем здесь, в контроллере — по замечанию преподавателя
  private buildFeedView(shareholder?: Shareholder | null) {
    return {
      title: shareholder ? shareholder.fullName : 'Не найдено',
      data: {
        shareholder: shareholder ? this.buildCardView(shareholder) : null,
        likesCount: shareholder
          ? (shareholder.likesCount ?? shareholder.likes?.length ?? 0)
          : 0,
      },
    };
  }
}