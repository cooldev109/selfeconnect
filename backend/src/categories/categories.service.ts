import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

type Row = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
};

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private shape(c: Row) {
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description ?? null,
      sortOrder: c.sortOrder,
      active: c.active,
    };
  }

  // Public: only active categories, for registration and search dropdowns.
  async listActive() {
    const cats = await this.prisma.serviceCategory.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return cats.map((c) => this.shape(c));
  }

  // Admin: all categories with usage counts.
  async listAll() {
    const cats = await this.prisma.serviceCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { jobs: true, professionals: true } } },
    });
    return cats.map((c) => ({
      ...this.shape(c),
      jobCount: c._count.jobs,
      professionalCount: c._count.professionals,
    }));
  }

  async create(dto: CreateCategoryDto) {
    const exists = await this.prisma.serviceCategory.findUnique({
      where: { slug: dto.slug },
    });
    if (exists) throw new ConflictException('slug_taken');
    const c = await this.prisma.serviceCategory.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
    return this.shape(c);
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.serviceCategory.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('category_not_found');
    if (dto.slug && dto.slug !== existing.slug) {
      const dup = await this.prisma.serviceCategory.findUnique({
        where: { slug: dto.slug },
      });
      if (dup) throw new ConflictException('slug_taken');
    }
    const c = await this.prisma.serviceCategory.update({
      where: { id },
      data: dto,
    });
    return this.shape(c);
  }

  // Hard-delete only when unused; otherwise the admin should deactivate it
  // (PATCH active=false) so existing jobs/professionals keep their category.
  async remove(id: string) {
    const existing = await this.prisma.serviceCategory.findUnique({
      where: { id },
      include: { _count: { select: { jobs: true, professionals: true } } },
    });
    if (!existing) throw new NotFoundException('category_not_found');
    if (existing._count.jobs > 0 || existing._count.professionals > 0) {
      throw new ConflictException('category_in_use');
    }
    await this.prisma.serviceCategory.delete({ where: { id } });
    return { ok: true };
  }
}
