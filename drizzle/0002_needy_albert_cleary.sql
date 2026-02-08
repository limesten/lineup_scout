CREATE TABLE "youtube_cache" (
	"artist_name" text PRIMARY KEY NOT NULL,
	"results" jsonb NOT NULL,
	"cached_at" timestamp with time zone DEFAULT now() NOT NULL
);
