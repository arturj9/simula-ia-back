import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase } from './utils'; // Importamos nosso helper

describe('AuthModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  const userData = {
    name: 'Auth User',
    email: 'auth@test.com',
    password: 'strongPassword123',
    role: 'STUDENT',
  };

  it('/auth/signup (POST) - Deve criar conta', () => {
    return request(app.getHttpServer())
      .post('/auth/signup')
      .send(userData)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.email).toBe(userData.email);
      });
  });

  it('/auth/signin (POST) - Deve retornar token', () => {
    return request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: userData.email, password: userData.password })
      .expect(200)
      .expect((res) => {
        expect(res.body.accessToken).toBeDefined();
      });
  });
});
