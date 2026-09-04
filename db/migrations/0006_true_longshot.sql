ALTER TABLE "tenants" ADD COLUMN "security_deposit" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "deposit_returned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "deposit_returned_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "deposit_returned_on" date;