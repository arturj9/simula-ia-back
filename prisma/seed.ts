import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { Pool } from 'pg';
import { env } from 'prisma/config';

const url = env('DATABASE_URL');

const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('🌱 Iniciando Seed Tecnológico...');

  // 1. LIMPEZA (Ordem correta para evitar erros de chave estrangeira)
  await prisma.examQuestion.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.question.deleteMany();
  await prisma.discipline.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Banco limpo.');

  // 2. CRIAR DISCIPLINAS DE TI
  const backend = await prisma.discipline.create({
    data: {
      name: 'Backend Development',
      description: 'Node.js, NestJS, APIs e Arquitetura',
    },
  });
  const frontend = await prisma.discipline.create({
    data: {
      name: 'Frontend Engineering',
      description: 'React, Next.js, CSS e UX',
    },
  });
  const devops = await prisma.discipline.create({
    data: { name: 'DevOps & Cloud', description: 'Docker, Kubernetes e CI/CD' },
  });
  const ia = await prisma.discipline.create({
    data: {
      name: 'Inteligência Artificial',
      description: 'LLMs, Python e Machine Learning',
    },
  });

  console.log('💻 Disciplinas Tech criadas.');

  // 3. CRIAR USUÁRIOS
  const passwordHash = await bcrypt.hash('123456', 10);

  // Professor (Tech Lead)
  const professor = await prisma.user.create({
    data: {
      name: 'Tech Lead Admin',
      email: 'admin@tech.com', // Login: admin@tech.com
      passwordHash,
      role: 'PROFESSOR',
    },
  });

  // Aluno (Junior Dev)
  const student = await prisma.user.create({
    data: {
      name: 'Dev Junior',
      email: 'dev@tech.com', // Login: dev@tech.com
      passwordHash,
      role: 'STUDENT',
    },
  });

  console.log('busts Usuários criados (Senha: 123456).');

  // 4. CRIAR QUESTÕES TÉCNICAS

  // Questão de Backend (NestJS)
  const qNest = await prisma.question.create({
    data: {
      statement:
        'No NestJS, qual decorator é usado para definir que uma classe é um Controller?',
      difficulty: 'EASY',
      type: 'OBJECTIVE',
      correctAnswer: '@Controller()',
      alternatives: [
        { text: '@Injectable()' },
        { text: '@Controller()' },
        { text: '@Module()' },
        { text: '@Service()' },
      ],
      disciplineId: backend.id,
      creatorId: professor.id,
    },
  });

  // Questão de DevOps (Docker)
  const qDocker = await prisma.question.create({
    data: {
      statement:
        'Qual comando é utilizado para listar os containers em execução no Docker?',
      difficulty: 'MEDIUM',
      type: 'OBJECTIVE',
      correctAnswer: 'docker ps',
      alternatives: [
        { text: 'docker run' },
        { text: 'docker build' },
        { text: 'docker ps' },
        { text: 'docker images' },
      ],
      disciplineId: devops.id,
      creatorId: professor.id,
    },
  });

  // Questão de IA (Conceito)
  const qAi = await prisma.question.create({
    data: {
      statement: 'O que significa a sigla LLM no contexto de IA Generativa?',
      difficulty: 'HARD',
      type: 'OBJECTIVE',
      correctAnswer: 'Large Language Model',
      alternatives: [
        { text: 'Low Level Machine' },
        { text: 'Large Language Model' },
        { text: 'Learning Logic Mechanism' },
      ],
      disciplineId: ia.id,
      creatorId: professor.id,
    },
  });

  console.log('❓ Questões Tech criadas.');

  // 5. CRIAR UM SIMULADO (EXAM)
  const exam = await prisma.exam.create({
    data: {
      title: 'Simulado Fullstack Senior',
      description: 'Avaliação de conhecimentos gerais em arquitetura e deploy.',
      visibility: 'PUBLIC',
      creatorId: professor.id,
      disciplineId: backend.id, // Vinculado a backend como principal
    },
  });

  // Vincular as questões na prova
  await prisma.examQuestion.createMany({
    data: [
      { examId: exam.id, questionId: qNest.id, order: 1 },
      { examId: exam.id, questionId: qDocker.id, order: 2 },
    ],
  });

  console.log('🚀 Simulado Fullstack criado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
