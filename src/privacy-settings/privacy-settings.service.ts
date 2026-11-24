import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundError } from '../common/errors/domain-error';
import { SharingSchedulesService } from '../sharing-schedules';
import type { User } from '../users';
import { UpdatePrivacySettingsDto } from './dto/privacy-settings.dto';
import { PrivacySettings } from './entities/privacy-settings.entity';

@Injectable()
export class PrivacySettingsService {
  constructor(
    @InjectRepository(PrivacySettings) private readonly settings: Repository<PrivacySettings>,
    private readonly schedules: SharingSchedulesService,
  ) {}

  createDefaults(user: User): Promise<PrivacySettings> {
    return this.settings.save(this.settings.create({ user, selectedMembers: [] }));
  }

  /** Null when the user never had settings; visibility treats that as "share with nobody". */
  findByUserId(userId: string): Promise<PrivacySettings | null> {
    return this.settings.findOne({ where: { user: { id: userId } }, relations: ['schedules'] });
  }

  async getByUserId(userId: string): Promise<PrivacySettings> {
    const found = await this.findByUserId(userId);
    if (!found) throw new NotFoundError('PRIVACY_SETTINGS_NOT_FOUND', 'Privacy settings not found');
    return found;
  }

  /** Replaces the settings and their schedules in one transaction. */
  async update(userId: string, dto: UpdatePrivacySettingsDto): Promise<PrivacySettings> {
    const { schedules, ...fields } = dto;
    const existing = await this.findByUserId(userId);
    const settings = existing ?? this.settings.create({ user: { id: userId } as User });
    Object.assign(settings, fields);

    return this.settings.manager.transaction(async (manager) => {
      if (existing) await this.schedules.deleteForSettings(existing.id, manager);
      settings.schedules = this.schedules.buildForSettings(userId, schedules);
      return manager.save(settings);
    });
  }
}
