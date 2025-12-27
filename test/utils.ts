import { PrismaService } from '../src/prisma/prisma.service';
export async function cleanDatabase(prisma: PrismaService) {
  await prisma.exam.deleteMany();
  await prisma.question.deleteMany();
  await prisma.discipline.deleteMany();
  await prisma.user.deleteMany();
}
