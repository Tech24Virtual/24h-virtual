/**
 * Wave 2 Batch B+ — Script tree validator.
 *
 * Pure, side-effect free. Runs every render cheaply (memoize at the call site).
 * Output is severity-tagged; the UI gates Publish on `error` items only and
 * presents `warning` / `info` as advisories.
 */
import type { ScriptTree, ScriptNode, ScriptEdge } from "@/types/scriptDocument";

export type IssueSeverity = "error" | "warning" | "info";

export type IssueCode =
  | "no_nodes"
  | "no_start"
  | "no_end"
  | "missing_intent_ref"
  | "unreferenced_intent"
  | "duplicate_intent_name"
  | "disconnected_node"
  | "branch_without_outgoing"
  | "edge_dangling"
  | "cycle"
  | "empty_body"
  | "duplicate_node_id";

export interface ScriptIssue {
  code: IssueCode;
  severity: IssueSeverity;
  message: string;
  /** Node IDs involved (for highlighting). */
  nodeIds?: string[];
  /** Edge IDs involved. */
  edgeIds?: string[];
  /** Intent IDs involved. */
  intentIds?: string[];
}

export interface ValidationReport {
  issues: ScriptIssue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  /** Convenience: set of node IDs that have at least one issue. */
  badNodeIds: Set<string>;
}

const EMPTY_REPORT: ValidationReport = {
  issues: [],
  errorCount: 0,
  warningCount: 0,
  infoCount: 0,
  badNodeIds: new Set(),
};

export function validateScriptTree(tree: ScriptTree | null | undefined): ValidationReport {
  if (!tree) return EMPTY_REPORT;

  const nodes = tree.nodes ?? [];
  const edges = tree.edges ?? [];
  const intents = tree.intents ?? [];

  const issues: ScriptIssue[] = [];

  // 1. Empty script
  if (nodes.length === 0) {
    issues.push({
      code: "no_nodes",
      severity: "error",
      message: "Script is empty. Add at least one node before publishing.",
    });
    return finalize(issues);
  }

  // 2. Duplicate node IDs (data integrity)
  const seenIds = new Map<string, number>();
  for (const n of nodes) {
    seenIds.set(n.id, (seenIds.get(n.id) ?? 0) + 1);
  }
  for (const [nodeId, count] of seenIds) {
    if (count > 1) {
      issues.push({
        code: "duplicate_node_id",
        severity: "error",
        message: `Duplicate node ID "${nodeId}" found ${count} times.`,
        nodeIds: [nodeId],
      });
    }
  }

  // 3. Start / end coverage
  const hasGreeting = nodes.some((n) => n.type === "greeting");
  const hasEnd = nodes.some((n) => n.type === "end");
  if (!hasGreeting) {
    issues.push({
      code: "no_start",
      severity: "warning",
      message: "No greeting node. The agent has no defined opening line.",
    });
  }
  if (!hasEnd) {
    issues.push({
      code: "no_end",
      severity: "warning",
      message: "No end node. The flow has no defined wrap-up step.",
    });
  }

  // 4. Empty bodies on speakable node types
  const speakable = new Set(["greeting", "say", "question", "end"]);
  for (const n of nodes) {
    if (speakable.has(n.type) && !(n.body ?? "").trim()) {
      issues.push({
        code: "empty_body",
        severity: "warning",
        message: `${labelOf(n)}: body is empty.`,
        nodeIds: [n.id],
      });
    }
  }

  // 5. Edge integrity (dangling references)
  const nodeIdSet = new Set(nodes.map((n) => n.id));
  for (const e of edges) {
    if (!nodeIdSet.has(e.from) || !nodeIdSet.has(e.to)) {
      issues.push({
        code: "edge_dangling",
        severity: "error",
        message: `Edge ${e.id} references a node that no longer exists.`,
        edgeIds: [e.id],
      });
    }
  }

  // 6. Disconnected nodes
  // A node is "connected" if it appears in any edge OR if the script has no
  // edges yet but only one node (trivially connected). For linear, edge-less
  // scripts (the Batch B default) we suppress this — they are valid drafts.
  if (edges.length > 0) {
    const touched = new Set<string>();
    for (const e of edges) {
      touched.add(e.from);
      touched.add(e.to);
    }
    for (const n of nodes) {
      if (!touched.has(n.id)) {
        issues.push({
          code: "disconnected_node",
          severity: "warning",
          message: `${labelOf(n)} is not connected to any other node.`,
          nodeIds: [n.id],
        });
      }
    }
  }

  // 7. Branch nodes must have at least one outgoing edge
  for (const n of nodes) {
    if (n.type !== "branch") continue;
    const outgoing = edges.filter((e) => e.from === n.id);
    if (outgoing.length === 0) {
      issues.push({
        code: "branch_without_outgoing",
        severity: "error",
        message: `${labelOf(n)}: branch has no outgoing edges.`,
        nodeIds: [n.id],
      });
    }
  }

  // 8. Cycle detection (DFS, ignores self-empty edge sets)
  if (edges.length > 0) {
    const cycleNodes = findCycleNodes(nodes, edges);
    if (cycleNodes.length > 0) {
      issues.push({
        code: "cycle",
        severity: "error",
        message: `Cycle detected involving ${cycleNodes.length} node(s).`,
        nodeIds: cycleNodes,
      });
    }
  }

  // 9. Intent integrity
  // a) Duplicate names (case-insensitive)
  const intentByName = new Map<string, string[]>();
  for (const it of intents) {
    const k = (it.name ?? "").trim().toLowerCase();
    if (!k) continue;
    intentByName.set(k, [...(intentByName.get(k) ?? []), it.id]);
  }
  for (const [name, ids] of intentByName) {
    if (ids.length > 1) {
      issues.push({
        code: "duplicate_intent_name",
        severity: "warning",
        message: `Duplicate intent name "${name}" used ${ids.length} times.`,
        intentIds: ids,
      });
    }
  }

  // b) Intents referenced by nodes (metadata.intentId) but not defined
  // c) Defined intents never referenced anywhere
  const definedIntentIds = new Set(intents.map((i) => i.id));
  const referencedIntentIds = new Set<string>();
  for (const n of nodes) {
    const ref = (n.metadata?.intentId ?? n.metadata?.intent_id) as string | undefined;
    if (typeof ref === "string" && ref) {
      referencedIntentIds.add(ref);
      if (!definedIntentIds.has(ref)) {
        issues.push({
          code: "missing_intent_ref",
          severity: "error",
          message: `${labelOf(n)} references intent "${ref}" which is not defined.`,
          nodeIds: [n.id],
          intentIds: [ref],
        });
      }
    }
  }
  for (const it of intents) {
    if (!referencedIntentIds.has(it.id)) {
      issues.push({
        code: "unreferenced_intent",
        severity: "info",
        message: `Intent "${it.name || it.id}" is defined but never referenced.`,
        intentIds: [it.id],
      });
    }
  }

  return finalize(issues);
}

function finalize(issues: ScriptIssue[]): ValidationReport {
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  const badNodeIds = new Set<string>();
  for (const i of issues) {
    if (i.severity === "error") errorCount++;
    else if (i.severity === "warning") warningCount++;
    else infoCount++;
    i.nodeIds?.forEach((id) => badNodeIds.add(id));
  }
  return { issues, errorCount, warningCount, infoCount, badNodeIds };
}

function labelOf(n: ScriptNode): string {
  return n.title?.trim() || `${capitalize(n.type)} (${n.id.slice(0, 6)})`;
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * Returns node IDs participating in a cycle. Empty array if the graph is a DAG.
 * Tarjan-lite via iterative DFS color marking.
 */
function findCycleNodes(nodes: ScriptNode[], edges: ScriptEdge[]): string[] {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    if (adj.has(e.from) && adj.has(e.to)) {
      adj.get(e.from)!.push(e.to);
    }
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const n of nodes) color.set(n.id, WHITE);

  const inCycle = new Set<string>();

  for (const start of nodes) {
    if (color.get(start.id) !== WHITE) continue;
    const stack: { node: string; idx: number; path: string[] }[] = [
      { node: start.id, idx: 0, path: [start.id] },
    ];
    color.set(start.id, GRAY);

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const children = adj.get(top.node) ?? [];
      if (top.idx >= children.length) {
        color.set(top.node, BLACK);
        stack.pop();
        continue;
      }
      const next = children[top.idx++];
      const c = color.get(next);
      if (c === GRAY) {
        // Cycle found; mark every node on the current path from `next` onward.
        const startIdx = top.path.indexOf(next);
        if (startIdx !== -1) {
          for (let i = startIdx; i < top.path.length; i++) inCycle.add(top.path[i]);
          inCycle.add(next);
        } else {
          inCycle.add(next);
          inCycle.add(top.node);
        }
      } else if (c === WHITE) {
        color.set(next, GRAY);
        stack.push({ node: next, idx: 0, path: [...top.path, next] });
      }
    }
  }

  return [...inCycle];
}
