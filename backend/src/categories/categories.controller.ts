import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

// Public: the active service categories, used by professional registration and
// the customer-side search filters.
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list() {
    return this.categories.listActive();
  }
}
