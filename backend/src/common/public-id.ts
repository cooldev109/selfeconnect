import { PrismaService } from '../prisma/prisma.service';

// Unambiguous alphabet (no 0/O/1/I) — matches the short codes the UI shows.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LENGTH = 5;

function random(): string {
  const bytes = new Uint8Array(LENGTH);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export async function generateUniquePublicId(
  prisma: PrismaService,
): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const candidate = random();
    const exists = await prisma.driver.findUnique({
      where: { publicId: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  throw new Error('Could not generate unique publicId');
}
