"use server";

import { db } from "@/db";
import { tenantDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, assertOrgOwnsTenant, str } from "./helpers";
import { revalidatePath } from "next/cache";

const MAX_BYTES = 3 * 1024 * 1024; // 3MB per file — keeps Postgres row size sane for a DB-stored file.

export type UploadState = { error?: string } | null;

export async function uploadTenantDocument(
  tenantId: string,
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  const session = await requireOrg();
  await assertOrgOwnsTenant(session.orgId, tenantId);

  const file = formData.get("file") as File | null;
  const type = (str(formData, "type") || "other") as any;
  if (!file || file.size === 0) {
    return { error: "Choose a file first." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That file is too large — please keep documents under 3MB." };
  }
  if (!/^image\/|^application\/pdf$/.test(file.type)) {
    return { error: "Only images and PDFs are supported." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataBase64 = buffer.toString("base64");

  await db.insert(tenantDocuments).values({
    id: id("doc"),
    orgId: session.orgId,
    tenantId,
    type,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    dataBase64,
  });

  revalidatePath(`/tenants/${tenantId}`);
  return null;
}

export async function deleteTenantDocument(documentId: string, tenantId: string) {
  const session = await requireOrg();
  await assertOrgOwnsTenant(session.orgId, tenantId);
  const doc = await db.query.tenantDocuments.findFirst({ where: eq(tenantDocuments.id, documentId) });
  if (!doc || doc.orgId !== session.orgId) return;
  await db.delete(tenantDocuments).where(eq(tenantDocuments.id, documentId));
  revalidatePath(`/tenants/${tenantId}`);
}
