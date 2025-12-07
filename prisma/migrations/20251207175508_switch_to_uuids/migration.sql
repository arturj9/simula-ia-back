/*
  Warnings:

  - The primary key for the `disciplines` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `exam_attempts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `exam_questions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `exams` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `questions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `student_answers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "exam_attempts" DROP CONSTRAINT "exam_attempts_exam_id_fkey";

-- DropForeignKey
ALTER TABLE "exam_attempts" DROP CONSTRAINT "exam_attempts_student_id_fkey";

-- DropForeignKey
ALTER TABLE "exam_questions" DROP CONSTRAINT "exam_questions_exam_id_fkey";

-- DropForeignKey
ALTER TABLE "exam_questions" DROP CONSTRAINT "exam_questions_question_id_fkey";

-- DropForeignKey
ALTER TABLE "exams" DROP CONSTRAINT "exams_creator_id_fkey";

-- DropForeignKey
ALTER TABLE "exams" DROP CONSTRAINT "exams_discipline_id_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_creator_id_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_discipline_id_fkey";

-- DropForeignKey
ALTER TABLE "student_answers" DROP CONSTRAINT "student_answers_attempt_id_fkey";

-- DropForeignKey
ALTER TABLE "student_answers" DROP CONSTRAINT "student_answers_question_id_fkey";

-- AlterTable
ALTER TABLE "disciplines" DROP CONSTRAINT "disciplines_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "disciplines_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "disciplines_id_seq";

-- AlterTable
ALTER TABLE "exam_attempts" DROP CONSTRAINT "exam_attempts_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "student_id" SET DATA TYPE TEXT,
ALTER COLUMN "exam_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "exam_attempts_id_seq";

-- AlterTable
ALTER TABLE "exam_questions" DROP CONSTRAINT "exam_questions_pkey",
ALTER COLUMN "exam_id" SET DATA TYPE TEXT,
ALTER COLUMN "question_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("exam_id", "question_id");

-- AlterTable
ALTER TABLE "exams" DROP CONSTRAINT "exams_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "creator_id" SET DATA TYPE TEXT,
ALTER COLUMN "discipline_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "exams_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "exams_id_seq";

-- AlterTable
ALTER TABLE "questions" DROP CONSTRAINT "questions_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "discipline_id" SET DATA TYPE TEXT,
ALTER COLUMN "creator_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "questions_id_seq";

-- AlterTable
ALTER TABLE "student_answers" DROP CONSTRAINT "student_answers_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "attempt_id" SET DATA TYPE TEXT,
ALTER COLUMN "question_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "student_answers_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "student_answers_id_seq";

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "users_id_seq";

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "disciplines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "disciplines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
