import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../admin/admin.guard';

@Module({
  imports: [AuthModule],
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesService, AdminGuard],
  exports: [CategoriesService],
})
export class CategoriesModule {}
