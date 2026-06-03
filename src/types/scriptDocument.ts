/**
 * Wave 2 Batch A — Script Document types
 *
 * Mirrors the `campaign_script_documents` and
 * `campaign_script_document_versions` tables. The `tree` field is a free-form
 * JSON document the Script Builder UI (Batch B) will render and mutate.
 */

export type ScriptDocumentStatus = "draft" | "published" | "archived";

export type CampaignTenantKind =
  | "internal"
  | "wl_partner"
  | "wl_client"
  | "client_lead";

/** A single node in the script tree (greeting, question, branch, end, etc). */
export interface ScriptNode {
  id: string;
  type: string;
  title?: string;
  body?: string;
  metadata?: Record<string, unknown>;
}

/** Directed edge between two nodes; optional condition for branching. */
export interface ScriptEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  condition?: string;
}

/** Named intent/disposition the runtime can resolve. */
export interface ScriptIntent {
  id: string;
  name: string;
  disposition?: string;
  routing?: string;
}

export interface ScriptTree {
  nodes: ScriptNode[];
  edges: ScriptEdge[];
  intents: ScriptIntent[];
}

export interface ScriptDocument {
  id: string;
  campaign_id: string;
  tenant_kind: CampaignTenantKind;
  wl_partner_id: string | null;
  wl_client_id: string | null;
  client_lead_id: string | null;
  title: string;
  status: ScriptDocumentStatus;
  current_version_id: string | null;
  tree: ScriptTree;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface ScriptVersion {
  id: string;
  document_id: string;
  version_number: number;
  tree: ScriptTree;
  notes: string | null;
  published_at: string;
  published_by: string | null;
}

export const EMPTY_TREE: ScriptTree = {
  nodes: [],
  edges: [],
  intents: [],
};
