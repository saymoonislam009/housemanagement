ALTER TABLE "monthly_adjustments" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "move_out_date" date;--> statement-breakpoint
ALTER TABLE "monthly_adjustments" ADD CONSTRAINT "monthly_adjustments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;