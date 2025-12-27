import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase } from './utils';

describe('Jornada do Usuário (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let jwtToken: string;
  let disciplineId: string;
  let questionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await cleanDatabase(prisma);

    const discipline = await prisma.discipline.create({
      data: {
        name: 'História E2E',
        description: 'Disciplina de teste',
      },
    });
    disciplineId = discipline.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  const professorData = {
    name: 'Prof Journey',
    email: 'prof_journey@test.com',
    password: '123',
    role: 'PROFESSOR',
  };

  it('1. Deve registrar e logar', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send(professorData)
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: professorData.email, password: professorData.password })
      .expect(200);

    jwtToken = res.body.accessToken;
    expect(jwtToken).toBeDefined();
  });

  it('2. Deve criar uma questão', async () => {
    const res = await request(app.getHttpServer())
      .post('/questions')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        statement: 'Quem descobriu o Brasil?',
        difficulty: 'EASY',
        type: 'OBJECTIVE',
        disciplineId: disciplineId,
        correctAnswer: 'Cabral',
        alternatives: [{ text: 'Colombo' }, { text: 'Cabral' }],
      })
      .expect(201);

    questionId = res.body.id;
    expect(questionId).toBeDefined();
  });

  it('3. Deve criar uma prova com a questão', async () => {
    const res = await request(app.getHttpServer())
      .post('/exams')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        title: 'Prova de História',
        description: 'Teste E2E',
        visibility: 'PRIVATE',
        questionIds: [questionId],
      })
      .expect(201);

    expect(res.body.title).toBe('Prova de História');
  });

  it('4. Deve listar minhas provas', async () => {
    const res = await request(app.getHttpServer())
      .get('/exams/me')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const prova = res.body.data.find(
      (p: any) => p.title === 'Prova de História',
    );
    expect(prova).toBeDefined();
  });
});
