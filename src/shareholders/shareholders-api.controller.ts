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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ShareholdersService } from './shareholders.service';
import { PublishShareholderDto } from './dto/publish-shareholder.dto';
import { LikeDto } from './dto/like.dto';
import { Shareholder } from './entities/shareholder.entity';
import {
  OptionalSessionGuard,
  SessionGuard,
} from '../session/session.guard';
import { UserId } from '../session/user-id.decorator';

@ApiTags('Акционеры')
@Controller('api/shareholders')
export class ShareholdersApiController {
  constructor(private readonly shareholdersService: ShareholdersService) {}

  @Get()
  @UseGuards(OptionalSessionGuard)
  @ApiQuery({ name: 'minShare', required: false, type: Number })
  async list(
    @UserId() currentUserId: number | null,
    @Query('minShare') minShare?: string,
  ) {
    const parsedMinShare = minShare ? Number(minShare) : undefined;
    const shareholders =
      await this.shareholdersService.findPublished(parsedMinShare);

    return shareholders.map((s) => this.toApiView(s, currentUserId));
  }

  @Get('feed')
  @UseGuards(OptionalSessionGuard)
  async feed(@UserId() currentUserId: number | null) {
    const shareholder = await this.shareholdersService.findFeedCard();
    if (!shareholder) throw new NotFoundException();
    return this.toApiView(shareholder, currentUserId);
  }

  @Get('feed/:id')
  @UseGuards(OptionalSessionGuard)
  @ApiQuery({ name: 'next', required: false, enum: ['true', 'false'] })
  async feedById(
    @UserId() currentUserId: number | null,
    @Param('id', ParseIntPipe) id: number,
    @Query('next') next?: string,
  ) {
    const shareholder =
      next === 'true'
        ? await this.shareholdersService.findFeedCard(id)
        : await this.shareholdersService.findById(id);
    if (!shareholder) throw new NotFoundException();
    return this.toApiView(shareholder, currentUserId);
  }

  @Get('draft')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('sessionId')
  async draft(@UserId() currentUserId: number) {
    const draft =
      await this.shareholdersService.findDraftByCreator(currentUserId);
    if (!draft) throw new NotFoundException();
    return this.toApiView(draft, currentUserId);
  }

  @Post()
  @UseGuards(SessionGuard)
  @ApiCookieAuth('sessionId')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fullName'],
      properties: {
        fullName: { type: 'string' },
        image: { type: 'string', format: 'binary' },
        video: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
  )
  async create(
    @UserId() currentUserId: number,
    @Body('fullName') fullName: string,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
  ) {
    const draft = await this.shareholdersService.createDraftWithFiles(
      fullName,
      currentUserId,
      files?.image?.[0],
      files?.video?.[0],
    );
    return this.toApiView(draft, currentUserId);
  }

  @Put(':id/publish')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('sessionId')
  async publish(
    @UserId() currentUserId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PublishShareholderDto,
  ) {
    const published = await this.shareholdersService.publish(
      id,
      dto,
      currentUserId,
    );
    return this.toApiView(published, currentUserId);
  }

  @Delete(':id')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('sessionId')
  async remove(
    @UserId() currentUserId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.shareholdersService.softDeleteOwn(
      id,
      currentUserId,
    );
  }

  @Post(':id/like')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  @ApiCookieAuth('sessionId')
  async like(
    @UserId() currentUserId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LikeDto,
  ): Promise<void> {
    await this.shareholdersService.toggleLike(
      id,
      currentUserId,
      dto.value,
    );
  }

  private toApiView(s: Shareholder, currentUserId: number | null) {
    return {
      id: s.id,
      fullName: s.fullName,
      shortDescription: s.shortDescription ?? null,
      imageUrl: this.shareholdersService.resolveMediaUrl(s.imageUrl ?? null),
      videoUrl: this.shareholdersService.resolveMediaUrl(s.videoUrl ?? null),
      ownershipShare: s.ownershipShare ?? 0,
      preferredShare: s.preferredShare ?? 0,
      likesCount: s.likesCount ?? s.likes?.length ?? 0,
      isMine:
        currentUserId !== null && s.creator?.id === currentUserId ? 1 : 0,
    };
  }
}
