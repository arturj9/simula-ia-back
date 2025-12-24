/*
  Warnings:

  - The primary key for the `exam_questions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `position` on the `exam_questions` table. All the data in the column will be lost.
  - You are about to drop the column `is_public` on the `exams` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[exam_id,question_id]` on the table `exam_questions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `disciplines` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `exam_questions` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `order` to the `exam_questions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `exams` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ExamVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "disciplines" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "exam_questions" DROP CONSTRAINT "exam_questions_pkey",
DROP COLUMN "position",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL,
ADD CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "exams" DROP COLUMN "is_public",
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "visibility" "ExamVisibility" NOT NULL DEFAULT 'PRIVATE';

-- CreateIndex
CREATE UNIQUE INDEX "exam_questions_exam_id_question_id_key" ON "exam_questions"("exam_id", "question_id");
