import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Shareholder, ShareholderStatus } from './entities/shareholder.entity';
import { CreateShareholderDto } from './dto/create-shareholder.dto';
import { PublishShareholderDto } from './dto/publish-shareholder.dto';

@Injectable()
export class ShareholdersService {
  constructor(
    @InjectRepository(Shareholder)
    private readonly shareholdersRepository: Repository<Shareholder>,
    private readonly dataSource: DataSource,
  ) {}

  // Плитка: опубликованные, с опциональным фильтром по мин. доле владения, ORM
  async findPublished(minShare?: number): Promise<Shareholder[]> {
    const qb = this.shareholdersRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.likes', 'likes')
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
      relations: { likes: true },
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
  async publish(id: number, dto: PublishShareholderDto): Promise<Shareholder> {
    const shareholder = await this.shareholdersRepository.findOne({
      where: { id },
    });

    if (!shareholder || shareholder.status !== ShareholderStatus.DRAFT) {
      throw new NotFoundException('Черновик не найден');
    }

    shareholder.shortDescription = dto.shortDescription;
    shareholder.ownershipShare = dto.ownershipShare;
    shareholder.preferredShare = dto.preferredShare;
    shareholder.status = ShareholderStatus.PUBLISHED;
    shareholder.formedAt = new Date();

    return this.shareholdersRepository.save(shareholder);
  }

  // POST удалить: логическое удаление ЧЕРЕЗ SQL UPDATE (курсор), БЕЗ ORM
  async deleteByCursor(id: number): Promise<void> {
    await this.dataSource.query(
      `UPDATE shareholders SET status = $1 WHERE id = $2 AND status = $3`,
      [ShareholderStatus.DELETED, id, ShareholderStatus.PUBLISHED],
    );
  }
}