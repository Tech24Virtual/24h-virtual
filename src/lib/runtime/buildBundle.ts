/**
 * Wave 2 Batch D/G — Pure runtime bundle shape helper.
 *
 * Used by both the edge function (logically) and the iframe runtime page
 * (consumes the response). Pure so it can be unit tested without Supabase.
 */
import type { ScriptTree } from "@/types/scriptDocument";

export type BundleVersion = "published" | "draft";

export interface RawScriptDocument {
  id: string;
  campaign_id: string;
  current_version_id: string | null;
  tree: ScriptTree;
}

export interface RawVersion {
  id: string;
  document_id: string;
  version_number: number;
  tree: ScriptTree;
  published_at: string;
}

export interface RuntimeBundle {
  campaignId: string;
  documentId: string;
  version: BundleVersion;
  versionNumber: number | null;
  publishedAt: string | null;
  tree: ScriptTree;
  scenarios: unknown[];
  faqs: unknown[];
  policies: unknown[];
}

export interface BuildBundleArgs {
  campaignId: string;
  doc: RawScriptDocument;
  version: BundleVersion;
  publishedVersion?: RawVersion | null;
  scenarios?: unknown[];
  faqs?: unknown[];
  policies?: unknown[];
}

export type BuildBundleResult =
  | { ok: true; bundle: RuntimeBundle }
  | { ok: false; error: string; status: 404 | 409 };

export function buildRuntimeBundle(args: BuildBundleArgs): BuildBundleResult {
  const {
    campaignId,
    doc,
    version,
    publishedVersion,
    scenarios = [],
    faqs = [],
    policies = [],
  } = args;

  if (version === "draft") {
    return {
      ok: true,
      bundle: {
        campaignId,
        documentId: doc.id,
        version,
        versionNumber: null,
        publishedAt: null,
        tree: doc.tree,
        scenarios,
        faqs,
        policies,
      },
    };
  }

  // published
  if (!doc.current_version_id) {
    return {
      ok: false,
      error: "This campaign has no published script version yet",
      status: 409,
    };
  }
  if (!publishedVersion) {
    return { ok: false, error: "Version not found", status: 404 };
  }
  if (publishedVersion.document_id !== doc.id) {
    return { ok: false, error: "Version does not belong to this document", status: 404 };
  }

  return {
    ok: true,
    bundle: {
      campaignId,
      documentId: doc.id,
      version,
      versionNumber: publishedVersion.version_number,
      publishedAt: publishedVersion.published_at,
      tree: publishedVersion.tree,
      scenarios,
      faqs,
      policies,
    },
  };
}
