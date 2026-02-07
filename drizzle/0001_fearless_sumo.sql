CREATE TABLE "stage_hosts" (
	"stageId" bigint NOT NULL,
	"date" text NOT NULL,
	"stageHost" text NOT NULL,
	CONSTRAINT "stage_hosts_stageId_date_pk" PRIMARY KEY("stageId","date")
);
--> statement-breakpoint
ALTER TABLE "stage_hosts" ADD CONSTRAINT "stage_hosts_stageId_stages_id_fk" FOREIGN KEY ("stageId") REFERENCES "public"."stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" DROP COLUMN "stageHost";