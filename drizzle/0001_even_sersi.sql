CREATE TABLE "classes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "classes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" varchar(1000) NOT NULL,
	"subjectId" integer NOT NULL,
	"teacherId" varchar(100) NOT NULL,
	"capacity" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"bannerUrl" varchar(500) NOT NULL,
	"bannerCldPubId" varchar(255) NOT NULL,
	"inviteCode" varchar(50),
	"schedules" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_subjectId_subjects_id_fk" FOREIGN KEY ("subjectId") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;