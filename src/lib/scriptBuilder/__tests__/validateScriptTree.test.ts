import { describe, it, expect } from "vitest";
import { validateScriptTree } from "../validateScriptTree";
import type { ScriptTree } from "@/types/scriptDocument";

const tree = (overrides: Partial<ScriptTree> = {}): ScriptTree => ({
  nodes: [],
  edges: [],
  intents: [],
  ...overrides,
});

describe("validateScriptTree", () => {
  it("flags an empty tree as a no_nodes error", () => {
    const r = validateScriptTree(tree());
    expect(r.errorCount).toBe(1);
    expect(r.issues[0].code).toBe("no_nodes");
  });

  it("returns the empty report for null tree", () => {
    const r = validateScriptTree(null);
    expect(r.issues).toHaveLength(0);
  });

  it("warns when no greeting / no end node", () => {
    const r = validateScriptTree(
      tree({ nodes: [{ id: "n1", type: "say", body: "hi" }] }),
    );
    const codes = r.issues.map((i) => i.code);
    expect(codes).toContain("no_start");
    expect(codes).toContain("no_end");
  });

  it("flags duplicate node IDs as errors", () => {
    const r = validateScriptTree(
      tree({
        nodes: [
          { id: "dup", type: "greeting", body: "a" },
          { id: "dup", type: "end", body: "b" },
        ],
      }),
    );
    expect(r.issues.some((i) => i.code === "duplicate_node_id")).toBe(true);
    expect(r.errorCount).toBeGreaterThan(0);
  });

  it("flags dangling edges as errors", () => {
    const r = validateScriptTree(
      tree({
        nodes: [
          { id: "a", type: "greeting", body: "hi" },
          { id: "b", type: "end", body: "bye" },
        ],
        edges: [{ id: "e1", from: "a", to: "ghost" }],
      }),
    );
    expect(r.issues.some((i) => i.code === "edge_dangling")).toBe(true);
  });

  it("flags branch nodes without outgoing edges", () => {
    const r = validateScriptTree(
      tree({
        nodes: [
          { id: "a", type: "greeting", body: "hi" },
          { id: "b", type: "branch", title: "Pick" },
          { id: "c", type: "end", body: "bye" },
        ],
        edges: [{ id: "e1", from: "a", to: "b" }],
      }),
    );
    expect(r.issues.some((i) => i.code === "branch_without_outgoing")).toBe(true);
  });

  it("detects cycles", () => {
    const r = validateScriptTree(
      tree({
        nodes: [
          { id: "a", type: "greeting", body: "hi" },
          { id: "b", type: "say", body: "loop" },
          { id: "c", type: "end", body: "bye" },
        ],
        edges: [
          { id: "e1", from: "a", to: "b" },
          { id: "e2", from: "b", to: "a" },
        ],
      }),
    );
    expect(r.issues.some((i) => i.code === "cycle")).toBe(true);
  });

  it("flags duplicate intent names (case-insensitive)", () => {
    const r = validateScriptTree(
      tree({
        nodes: [{ id: "a", type: "greeting", body: "hi" }, { id: "z", type: "end", body: "bye" }],
        intents: [
          { id: "i1", name: "Booking" },
          { id: "i2", name: "booking" },
        ],
      }),
    );
    expect(r.issues.some((i) => i.code === "duplicate_intent_name")).toBe(true);
  });

  it("flags missing intent references as errors", () => {
    const r = validateScriptTree(
      tree({
        nodes: [
          { id: "a", type: "greeting", body: "hi" },
          { id: "b", type: "say", body: "x", metadata: { intentId: "ghost" } },
          { id: "c", type: "end", body: "bye" },
        ],
        intents: [],
      }),
    );
    expect(r.issues.some((i) => i.code === "missing_intent_ref")).toBe(true);
    expect(r.errorCount).toBeGreaterThan(0);
  });

  it("flags unreferenced intents as info", () => {
    const r = validateScriptTree(
      tree({
        nodes: [{ id: "a", type: "greeting", body: "hi" }, { id: "z", type: "end", body: "bye" }],
        intents: [{ id: "i1", name: "Unused" }],
      }),
    );
    expect(r.issues.some((i) => i.code === "unreferenced_intent" && i.severity === "info")).toBe(true);
  });
});
