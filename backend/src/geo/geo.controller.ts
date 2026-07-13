import { Controller, Get, Query } from '@nestjs/common';
import { GeoService } from './geo.service';

// Public on purpose: the postcode box appears on the homepage hero and the
// public search, before anyone has an account. Proxied through our own API
// rather than called from the browser so it stays same-origin and we keep the
// option to cache or rate-limit it later.
@Controller('geo')
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  // Type-ahead: "M1 1" -> ["M1 1AA", "M1 1AB", …]
  @Get('postcodes')
  async autocomplete(@Query('q') q?: string) {
    const postcodes = await this.geo.autocomplete(q ?? '');
    return { postcodes };
  }

  // "Use my location": device coordinates -> nearest real postcode.
  @Get('reverse')
  async reverse(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    const found = await this.geo.reverse(latitude, longitude);
    return found ?? { postcode: null };
  }
}
