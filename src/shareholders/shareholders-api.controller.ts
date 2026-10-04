import {
  Body,
  Controller,
  Delete,
  Get,
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

  @Get()
  async list(@Query('minShare') minShare?: string) {
    const parsedMinShare = minShare ? Number(minShare) : undefined;
    const currentUserId = CurrentUser.getInstance().id;
    const shareholders =
      await this.shareholdersService.findPublished(parsedMinShare);

    return shareholders.map((s) => this.toApiView(s, currentUserId));
  }

  @Get('feed')
  async feed(@Query('afterId') afterId?: string) {
    const currentUserId = CurrentUser.getInstance().id;
    const parsedAfterId = afterId ? Number(afterId) : undefined;
    const shareholder =
      await this.shareholdersService.findFeedCard(parsedAfterId);

    return shareholder ? this.toApiView(shareholder, currentUserId) : null;
  }

  @Get('draft')
  async draft() {
    const currentUserId = CurrentUser.getInstance().id;
    const draft =
      await this.shareholdersService.findDraftByCreator(currentUserId);

    return draft ? this.toApiView(draft, currentUserId) : null;
  }

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

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const currentUserId = CurrentUser.getInstance().id;
    await this.shareholdersService.softDeleteOwn(id, currentUserId);
    return { success: true };
  }

  @Post(':id/like')
  async like(@Param('id', ParseIntPipe) id: number, @Body() dto: LikeDto) {
    const currentUserId = CurrentUser.getInstance().id;
    await this.shareholdersService.toggleLike(id, currentUserId, dto.value);
    return { success: true };
  }

  private toApiView(shareholder: Shareholder, currentUserId: number) {
    return {
      id: shareholder.id,
      fullName: shareholder.fullName,
      shortDescription: shareholder.shortDescription,
      status: shareholder.status,
      imageUrl: this.shareholdersService.resolveMediaUrl(shareholder.imageUrl),
      videoUrl: this.shareholdersService.resolveMediaUrl(shareholder.videoUrl),
      ownershipShare: shareholder.ownershipShare,
      preferredShare: shareholder.preferredShare,
      likesCount: shareholder.likesCount ?? shareholder.likes?.length ?? 0,
      isMine: shareholder.creator?.id === currentUserId ? 1 : 0,
    };
  }
}