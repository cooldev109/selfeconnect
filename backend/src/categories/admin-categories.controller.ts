import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

// Admin-only management of service categories.
@Controller('admin/categories')
@UseGuards(AuthGuard, AdminGuard)
export class AdminCategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  all() {
    return this.categories.listAll();
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categories.remove(id);
  }
}
