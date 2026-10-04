import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ShareholdersService } from './shareholders.service';
import { PublishShareholderDto } from './dto/publish-shareholder.dto';
import { LikeDto } from './dto/like.dto';
import { CurrentUser } from './current-user';
import { Shareholder } from './entities/shareholder.entity';

@Controller('api/shareholders')
export class ShareholdersApiController {
  constructor(private readonly shareholdersService: ShareholdersService) {}

  // GET /api/shareholders?minShare=20 — только опубликованные, с признаком isMine
  @Get()
  async list(@Query('minShare') minShare?: string) {
    const parsedMinShare = minShare ? Number(minShare) : undefined;
    const currentUserId = CurrentUser.getInstance().id;
    const shareholders =
      await this.shareholdersService.findPublished(parsedMinShare);

    return shareholders.map((s) => this.toApiView(s, currentUserId));
  }

  // GET /api/shareholders/feed — лента без id (первая опубликованная)
  @Get('feed')
  async feed() {
    const currentUserId = CurrentUser.getInstance().id;
    const shareholder = await this.shareholdersService.findFeedCard();
    if (!shareholder) throw new NotFoundException();
    return this.toApiView(shareholder, currentUserId);
  }

  // GET /api/shareholders/feed/:id — конкретная карточка
  // GET /api/shareholders/feed/:id?next=true — следующая по кругу после id
  @Get('feed/:id')
  async feedById(
    @Param('id', ParseIntPipe) id: number,
    @Query('next') next?: string,
  ) {
    const currentUserId = CurrentUser.getInstance().id;
    const shareholder =
      next === 'true'
        ? await this.shareholdersService.findFeedCard(id)
        : await this.shareholdersService.findById(id);
    if (!shareholder) throw new NotFoundException();
    return this.toApiView(shareholder, currentUserId);
  }

  // GET /api/shareholders/draft — черновик текущего пользователя, id не указывается
  @Get('draft')
  async draft() {
    const currentUserId = CurrentUser.getInstance().id;
    const draft =
      await this.shareholdersService.findDraftByCreator(currentUserId);
    if (!draft) throw new NotFoundException();
    return this.toApiView(draft, currentUserId);
  }

  // POST /api/shareholders — добавление + файлы изображения и видео
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
  )
  async create(
    @Body('fullName') fullName: string,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
  ) {
    const currentUserId = CurrentUser.getInstance().id;
    const draft = await this.shareholdersService.createDraftWithFiles(
      fullName,
      currentUserId,
      files?.image?.[0],
      files?.video?.[0],
    );
    return this.toApiView(draft, currentUserId);
  }

  // PUT /api/shareholders/:id/publish — публикация (смена статуса)
  @Put(':id/publish')
  async publish(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PublishShareholderDto,
  ) {
    const currentUserId = CurrentUser.getInstance().id;
    const published = await this.shareholdersService.publish(
      id,
      dto,
      currentUserId,
    );
    return this.toApiView(published, currentUserId);
  }

  // DELETE /api/shareholders/:id — soft delete своей записи, тело ответа пустое
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.shareholdersService.softDeleteOwn(
      id,
      CurrentUser.getInstance().id,
    );
  }

  // POST /api/shareholders/:id/like — value: 0 снять, 1 поставить, тело ответа пустое
  @Post(':id/like')
  @HttpCode(200)
  async like(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LikeDto,
  ): Promise<void> {
    await this.shareholdersService.toggleLike(
      id,
      CurrentUser.getInstance().id,
      dto.value,
    );
  }

  // Сериализатор: набор полей всегда одинаковый, пустые значения идут как null.
  // Статус, создатель, модератор и даты клиенту не нужны и не отдаются.
  private toApiView(s: Shareholder, currentUserId: number) {
    return {
      id: s.id,
      fullName: s.fullName,
      shortDescription: s.shortDescription ?? null,
      imageUrl: this.shareholdersService.resolveMediaUrl(s.imageUrl ?? null),
      videoUrl: this.shareholdersService.resolveMediaUrl(s.videoUrl ?? null),
      ownershipShare: s.ownershipShare ?? 0,
      preferredShare: s.preferredShare ?? 0,
      likesCount: s.likesCount ?? s.likes?.length ?? 0,
      isMine: s.creator?.id === currentUserId ? 1 : 0,
    };
  }
}
