import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Shareholder, ShareholderStatus } from './entities/shareholder.entity';
import { Like } from '../likes/entities/like.entity';
import { CreateShareholderDto } from './dto/create-shareholder.dto';
import { PublishShareholderDto } from './dto/publish-shareholder.dto';
import { MinioService } from '../minio/minio.service';

@Injectable()
export class ShareholdersService {
  constructor(
    @InjectRepository(Shareholder)
    private readonly shareholdersRepository: Repository<Shareholder>,
    @InjectRepository(Like)
    private readonly likesRepository: Repository<Like>,
    private readonly dataSource: DataSource,
    private readonly minioService: MinioService,
  ) {}

  resolveMediaUrl(value: string | null): string | null {
    if (!value) return null;
    if (value.startsWith('http') || value.startsWith('/')) return value;
    return this.minioService.getPublicUrl(value);
  }

  // Плитка: опубликованные, с опциональным фильтром по мин. доле владения, ORM
  async findPublished(minShare?: number): Promise<Shareholder[]> {
    const qb = this.shareholdersRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.likes', 'likes')
      .leftJoinAndSelect('s.creator', 'creator')
      .where('s.status = :status', { status: ShareholderStatus.PUBLISHED })
      .orderBy('s.id', 'ASC');

    if (minShare !== undefined && !Number.isNaN(minShare)) {
      qb.andWhere('s.ownership_share >= :minShare', { minShare });
    }

    return this.attachLikesCount(await qb.getMany());
  }

  // Один конкретный опубликованный акционер по id (переход с Плитки), ORM
  async findById(id: number): Promise<Shareholder | null> {
    const shareholder = await this.shareholdersRepository.findOne({
      where: { id, status: ShareholderStatus.PUBLISHED },
      relations: { likes: true, creator: true },
    });

    return shareholder ? this.attachLikesCount([shareholder])[0] : null;
  }

  // Лента: ОДНА карточка "по кругу" — один запрос с LIMIT 1,
  // без выгрузки всей таблицы и перебора в массиве.
  // afterId не задан — первая опубликованная (стартовая страница Ленты).
  async findFeedCard(afterId?: number): Promise<Shareholder | null> {
    const qb = this.shareholdersRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.likes', 'likes')
      .leftJoinAndSelect('s.creator', 'creator')
      .where('s.status = :status', { status: ShareholderStatus.PUBLISHED });

    if (afterId) {
      qb.andWhere('s.id > :afterId', { afterId });
    }

    qb.orderBy('s.id', 'ASC').take(1);

    let card = await qb.getOne();

    // конец ленты — заходим на новый круг ещё одним точечным запросом
    if (!card && afterId) {
      card = await this.shareholdersRepository
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.likes', 'likes')
        .leftJoinAndSelect('s.creator', 'creator')
        .where('s.status = :status', { status: ShareholderStatus.PUBLISHED })
        .orderBy('s.id', 'ASC')
        .take(1)
        .getOne();
    }

    return card ? this.attachLikesCount([card])[0] : null;
  }

  private attachLikesCount<T extends Shareholder>(shareholders: T[]): T[] {
    return shareholders.map((shareholder) => {
      const likes = shareholder.likes ?? [];
      return Object.assign(shareholder, { likesCount: likes.length });
    });
  }

  // GET Добавление: текущий черновик пользователя (если есть), ORM
  async findDraftByCreator(creatorId: number): Promise<Shareholder | null> {
    return this.shareholdersRepository.findOne({
      where: { creator: { id: creatorId }, status: ShareholderStatus.DRAFT },
      relations: { creator: true },
    });
  }

  // POST добавить: создать/обновить черновик по кнопке "Далее", ORM
  async createDraft(dto: CreateShareholderDto): Promise<Shareholder> {
    const existingDraft = await this.findDraftByCreator(dto.creatorId);

    if (existingDraft) {
      // по заданию: у пользователя не может быть больше одного черновика
      existingDraft.fullName = dto.fullName;
      existingDraft.imageUrl = dto.imageUrl ?? existingDraft.imageUrl;
      existingDraft.videoUrl = dto.videoUrl ?? existingDraft.videoUrl;
      return this.shareholdersRepository.save(existingDraft);
    }

    const draft = this.shareholdersRepository.create({
      fullName: dto.fullName,
      imageUrl: dto.imageUrl,
      videoUrl: dto.videoUrl,
      status: ShareholderStatus.DRAFT,
      creator: { id: dto.creatorId } as Shareholder['creator'],
    });

    return this.shareholdersRepository.save(draft);
  }

  // POST опубликовать: заполнить краткую инф. + 2 поля темы, ORM
  async createDraftWithFiles(
    fullName: string,
    creatorId: number,
    imageFile?: Express.Multer.File,
    videoFile?: Express.Multer.File,
  ): Promise<Shareholder> {
    const existingDraft = await this.findDraftByCreator(creatorId);

    const imageFileName = imageFile
      ? await this.minioService.upload(imageFile)
      : undefined;
    const videoFileName = videoFile
      ? await this.minioService.upload(videoFile)
      : undefined;

    if (existingDraft) {
      existingDraft.fullName = fullName;
      if (imageFileName) existingDraft.imageUrl = imageFileName;
      if (videoFileName) existingDraft.videoUrl = videoFileName;
      return this.shareholdersRepository.save(existingDraft);
    }

    const draft = this.shareholdersRepository.create({
      fullName,
      imageUrl: imageFileName,
      videoUrl: videoFileName,
      status: ShareholderStatus.DRAFT,
      creator: { id: creatorId } as Shareholder['creator'],
    });

    return this.shareholdersRepository.save(draft);
  }

  async publish(
    id: number,
    dto: PublishShareholderDto,
    currentUserId?: number,
  ): Promise<Shareholder> {
    const shareholder = await this.shareholdersRepository.findOne({
      where: { id },
      relations: { creator: true },
    });

    if (!shareholder || shareholder.status !== ShareholderStatus.DRAFT) {
      throw new NotFoundException('Черновик не найден');
    }

    if (currentUserId !== undefined && shareholder.creator.id !== currentUserId) {
      throw new ForbiddenException('Это не ваш черновик');
    }

    shareholder.shortDescription = dto.shortDescription;
    shareholder.ownershipShare = dto.ownershipShare;
    shareholder.preferredShare = dto.preferredShare;
    shareholder.status = ShareholderStatus.PUBLISHED;
    shareholder.formedAt = new Date();

    return this.shareholdersRepository.save(shareholder);
  }

  async softDeleteOwn(id: number, currentUserId: number): Promise<void> {
    const shareholder = await this.shareholdersRepository.findOne({
      where: { id },
      relations: { creator: true },
    });

    if (!shareholder) {
      throw new NotFoundException('Акционер не найден');
    }
    if (shareholder.creator.id !== currentUserId) {
      throw new ForbiddenException('Можно удалять только свои записи');
    }
    if (shareholder.status === ShareholderStatus.DELETED) {
      throw new BadRequestException('Уже удалено');
    }

    shareholder.status = ShareholderStatus.DELETED;
    shareholder.completedAt = new Date();
    await this.shareholdersRepository.save(shareholder);
  }

  // POST удалить: логическое удаление ЧЕРЕЗ SQL UPDATE (курсор), БЕЗ ORM
  async deleteByCursor(id: number): Promise<void> {
    await this.dataSource.query(
      `UPDATE shareholders SET status = $1 WHERE id = $2 AND status = $3`,
      [ShareholderStatus.DELETED, id, ShareholderStatus.PUBLISHED],
    );
  }

  async toggleLike(
    shareholderId: number,
    userId: number,
    value: 0 | 1,
  ): Promise<void> {
    const existing = await this.likesRepository.findOne({
      where: {
        shareholder: { id: shareholderId },
        user: { id: userId },
      },
    });

    if (value === 1) {
      if (!existing) {
        const like = this.likesRepository.create({
          shareholder: { id: shareholderId } as Like['shareholder'],
          user: { id: userId } as Like['user'],
        });
        await this.likesRepository.save(like);
      }
      return;
    }

    if (existing) {
      await this.likesRepository.remove(existing);
    }
  }
}