import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Executa antes de todos os testes
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService); // Pega o serviço do Prisma
    await app.init();
  });

  // Limpa o banco antes de começar (para não dar erro de email duplicado)
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  const testUser = {
    name: 'E2E User',
    email: 'e2e@test.com',
    password: 'password123',
    role: 'STUDENT',
  };

  it('/auth/signup (POST) - Deve criar um usuário', () => {
    return request(app.getHttpServer())
      .post('/auth/signup')
      .send(testUser)
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(typeof res.body.id).toBe('string'); // Verifica se é UUID
        expect(res.body.email).toBe(testUser.email);
        expect(res.body.passwordHash).toBeUndefined(); // Não pode retornar senha
      });
  });

  it('/auth/signin (POST) - Deve retornar token JWT', async () => {
    // 1. Cria o usuário primeiro
    await request(app.getHttpServer()).post('/auth/signup').send(testUser);

    // 2. Tenta logar
    return request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200)
      .expect((res) => {
        expect(res.body.accessToken).toBeDefined();
      });
  });

  it('/auth/me (GET) - Deve retornar perfil do usuário logado', async () => {
    // 1. Cria usuário
    await request(app.getHttpServer()).post('/auth/signup').send(testUser);

    // 2. Faz login para pegar token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: testUser.email, password: testUser.password });

    const token = loginRes.body.accessToken;

    // 3. Acessa rota protegida
    return request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe(testUser.email);
        expect(res.body.id).toBeDefined();
      });
  });
});
