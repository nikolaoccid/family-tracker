import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mailer';
import { UsersModule } from '../users';
import { Family } from './entities/family.entity';
import { FamilyMember } from './entities/family-member.entity';
import { FamiliesController } from './families.controller';
import { FamiliesService } from './families.service';

@Module({
  imports: [TypeOrmModule.forFeature([Family, FamilyMember]), MailModule, UsersModule],
  controllers: [FamiliesController],
  providers: [FamiliesService],
  exports: [FamiliesService],
})
export class FamiliesModule {}
