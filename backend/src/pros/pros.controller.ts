import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ProsService } from './pros.service';
import { CustomerAuthGuard } from '../customer-auth/customer-auth.guard';

// Customer-facing professional search. Requires a customer session.
@Controller('pros')
@UseGuards(CustomerAuthGuard)
export class ProsController {
  constructor(private readonly pros: ProsService) {}

  @Get()
  browse(
    @Query('category') category?: string,
    @Query('postcode') postcode?: string,
    @Query('radius') radius?: string,
  ) {
    let radiusMiles: number | undefined;
    if (radius !== undefined) {
      const n = parseInt(radius, 10);
      if (!Number.isNaN(n)) radiusMiles = Math.min(Math.max(n, 1), 100);
    }
    return this.pros.browse({
      categorySlug: category || undefined,
      postcode: postcode || undefined,
      radiusMiles,
    });
  }

  @Get(':publicId')
  profile(@Param('publicId') publicId: string) {
    return this.pros.profile(publicId);
  }
}
