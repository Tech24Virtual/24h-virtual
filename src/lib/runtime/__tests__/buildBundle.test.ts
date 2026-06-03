import { describe, it, expect } from "vitest";
import { buildRuntimeBundle, type RawScriptDocument, type RawVersion } from "../buildBundle";
import { EMPTY_TREE } from "@/types/scriptDocument";

const doc: RawScriptDocument = {
  id: "doc-1",
  campaign_id: "camp-1",
  current_version_id: "v-1",
  tree: { ...EMPTY_TREE, nodes: [{ id: "n1", type: "greeting", body: "draft hello" }] },
};

const publishedVersion: RawVersion = {
  id: "v-1",
  document_id: "doc-1",
  version_number: 3,
  tree: { ...EMPTY_TREE, nodes: [{ id: "n1", type: "greeting", body: "published hello" }] },
  published_at: "2025-01-01T00:00:00Z",
};

describe("buildRuntimeBundle", () => {
  it("returns the draft tree when version=draft", () => {
    const r = buildRuntimeBundle({ campaignId: "camp-1", doc, version: "draft" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bundle.tree.nodes[0].body).toBe("draft hello");
      expect(r.bundle.versionNumber).toBeNull();
    }
  });

  it("returns the published snapshot when version=published", () => {
    const r = buildRuntimeBundle({
      campaignId: "camp-1",
      doc,
      version: "published",
      publishedVersion,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bundle.tree.nodes[0].body).toBe("published hello");
      expect(r.bundle.versionNumber).toBe(3);
      expect(r.bundle.publishedAt).toBe("2025-01-01T00:00:00Z");
    }
  });

  it("errors 409 when no current_version_id is set", () => {
    const r = buildRuntimeBundle({
      campaignId: "camp-1",
      doc: { ...doc, current_version_id: null },
      version: "published",
    });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.status).toBe(409);
  });

  it("errors 404 if the published version row is missing", () => {
    const r = buildRuntimeBundle({
      campaignId: "camp-1",
      doc,
      version: "published",
      publishedVersion: null,
    });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.status).toBe(404);
  });

  it("errors 404 if the version belongs to a different document", () => {
    const r = buildRuntimeBundle({
      campaignId: "camp-1",
      doc,
      version: "published",
      publishedVersion: { ...publishedVersion, document_id: "doc-other" },
    });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.status).toBe(404);
  });

  it("passes through scenarios, faqs, policies", () => {
    const r = buildRuntimeBundle({
      campaignId: "camp-1",
      doc,
      version: "published",
      publishedVersion,
      scenarios: [{ id: "s1" }],
      faqs: [{ id: "f1" }],
      policies: [{ id: "p1" }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bundle.scenarios).toHaveLength(1);
      expect(r.bundle.faqs).toHaveLength(1);
      expect(r.bundle.policies).toHaveLength(1);
    }
  });
});
