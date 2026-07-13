import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ProsService } from './pros.service';
import { OptionalCustomerGuard } from '../customer-auth/optional-customer.guard';
import type { CustomerUser } from '../customer-auth/current-customer.decorator';

// Public professional search + profiles. Anyone may browse and read reviews —
// that is the top of the funnel, and it lets profiles be indexed. Contact
// details are the thing worth an account, so they are only returned to a
// signed-in customer.
@Controller('pros')
@UseGuards(OptionalCustomerGuard)
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
    // Browse results never carried contact details, so they are safe as-is.
    return this.pros.browse({
      categorySlug: category || undefined,
      postcode: postcode || undefined,
      radiusMiles,
    });
  }

  @Get(':publicId')
  profile(@Param('publicId') publicId: string, @Req() req: Request) {
    const customer = (req as Request & { customer?: CustomerUser }).customer;
    return this.pros.profile(publicId, { includeContact: !!customer });
  }
}
