import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL!;
const ANON = process.env.VITE_SUPABASE_ANON_KEY!;

// Cache clients to avoid multiple instances warning
const clientCache = new Map<string, SupabaseClient>();

async function clientAs(email: string): Promise<SupabaseClient> {
  if (clientCache.has(email)) return clientCache.get(email)!;

  const client = createClient(URL, ANON, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: `qa-test-${email}`, // unique key per user
    },
  });
  const { error } = await client.auth.signInWithPassword({
    email,
    password: "QATestPass123!",
  });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  clientCache.set(email, client);
  return client;
}

afterAll(async () => {
  // Sign out all cached clients
  for (const client of clientCache.values()) {
    await client.auth.signOut();
  }
  clientCache.clear();
});


describe("T-2 RLS Proof — Admin Cannot Read WL Private Tickets", () => {
  it("🔴 BLOCKER: admin gets 0 non-escalated rows from wl_client_tickets", async () => {
    const admin = await clientAs("qa-admin@24hv-test.com");
    const { data, error } = await admin.from("wl_client_tickets").select("*");

    expect(error).toBeNull();
    const nonEscalated = (data ?? []).filter((t) => !t.is_escalated_to_24h);
    expect(nonEscalated).toHaveLength(0);
  });

  it("🔴 BLOCKER: admin gets 0 rows from wl_client_ticket_replies", async () => {
    const admin = await clientAs("qa-admin@24hv-test.com");
    const { data, error } = await admin
      .from("wl_client_ticket_replies")
      .select("*");

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("✅ WL partner can read their own tickets", async () => {
    const partner = await clientAs("qa-wl-owner@24hv-test.com");
    const { error } = await partner.from("wl_client_tickets").select("*");
    expect(error).toBeNull();
  });

  it("✅ WL client can read their own tickets", async () => {
    const client = await clientAs("qa-wl-client1@24hv-test.com");
    const { error } = await client.from("wl_client_tickets").select("*");
    expect(error).toBeNull();
  });

  it("✅ Agent cannot read wl_client_tickets", async () => {
    const agent = await clientAs("qa-agent@24hv-test.com");
    const { data, error } = await agent.from("wl_client_tickets").select("*");
    // Either error (permission denied) or empty array - both mean no access
    const hasNoAccess = error !== null || (data ?? []).length === 0;
    expect(hasNoAccess).toBe(true);
  });

  it("✅ Direct client cannot read wl_client_tickets", async () => {
    const client = await clientAs("qa-client@24hv-test.com");
    const { data, error } = await client.from("wl_client_tickets").select("*");
    const hasNoAccess = error !== null || (data ?? []).length === 0;
    expect(hasNoAccess).toBe(true);
  });
});

describe("WL Feedback Messages — Admin Excluded", () => {
  it("✅ Admin cannot read wl_partner_feedback_messages", async () => {
    const admin = await clientAs("qa-admin@24hv-test.com");
    const { data, error } = await admin
      .from("wl_partner_feedback_messages")
      .select("*");
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

describe("Staff Queue Isolation", () => {
  it("✅ Agent cannot read billing queue tickets", async () => {
    const agent = await clientAs("qa-agent@24hv-test.com");
    const { data, error } = await agent
      .from("support_tickets")
      .select("*")
      .eq("work_queue", "billing");
    const hasNoAccess = error !== null || (data ?? []).length === 0;
    expect(hasNoAccess).toBe(true);
  });

  it("✅ Billing cannot read agent queue tickets", async () => {
    const billing = await clientAs("qa-billing@24hv-test.com");
    const { data, error } = await billing
      .from("support_tickets")
      .select("*")
      .eq("work_queue", "agent");
    const hasNoAccess = error !== null || (data ?? []).length === 0;
    expect(hasNoAccess).toBe(true);
  });
});

describe("WL Partner Members — Team Isolation", () => {
  // Partner A: f89712de (qa-wl-owner + qa-wl-manager as active members)
  // Partner B: ca311d23 (qa-wl-partner-b as active member)

  it("✅ WL owner can read their own partner's members", async () => {
    const owner = await clientAs("qa-wl-owner@24hv-test.com");
    const { data, error } = await owner
      .from("wl_partner_members")
      .select("*");
    expect(error).toBeNull();
    // Should see Partner A rows only (owner + manager = 2)
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    // All rows must belong to Partner A
    const partnerIds = [...new Set((data ?? []).map((r: any) => r.partner_id))];
    expect(partnerIds).toEqual(["f89712de-c646-499f-9308-c8c03d00f229"]);
  });

  it("🔴 BLOCKER: WL owner cannot read Partner B's members", async () => {
    const owner = await clientAs("qa-wl-owner@24hv-test.com");
    const { data, error } = await owner
      .from("wl_partner_members")
      .select("*")
      .eq("partner_id", "ca311d23-d8be-4d8d-a65f-65b0fdf8e1a1");
    const hasNoAccess = error !== null || (data ?? []).length === 0;
    expect(hasNoAccess).toBe(true);
  });

  it("✅ Active team member can read their own partner's members", async () => {
    const manager = await clientAs("qa-wl-manager@24hv-test.com");
    const { data, error } = await manager
      .from("wl_partner_members")
      .select("*");
    expect(error).toBeNull();
    // Manager is active member of Partner A — should see Partner A rows
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
    const partnerIds = [...new Set((data ?? []).map((r: any) => r.partner_id))];
    expect(partnerIds).toEqual(["f89712de-c646-499f-9308-c8c03d00f229"]);
  });

  it("🔴 BLOCKER: Direct client cannot read wl_partner_members", async () => {
    const client = await clientAs("qa-client@24hv-test.com");
    const { data, error } = await client
      .from("wl_partner_members")
      .select("*");
    const hasNoAccess = error !== null || (data ?? []).length === 0;
    expect(hasNoAccess).toBe(true);
  });

  it("🔴 BLOCKER: Agent cannot read wl_partner_members", async () => {
    const agent = await clientAs("qa-agent@24hv-test.com");
    const { data, error } = await agent
      .from("wl_partner_members")
      .select("*");
    const hasNoAccess = error !== null || (data ?? []).length === 0;
    expect(hasNoAccess).toBe(true);
  });
});

describe("Notifications — RLS Isolation", () => {

  it("✅ Admin can read their own notifications", async () => {
    const admin = await clientAs("qa-admin@24hv-test.com");
    const { data, error } = await admin
      .from("notifications")
      .select("id, user_id, title, type")
      .limit(5);
    expect(error).toBeNull();
    // All rows must belong to admin
    const userIds = [...new Set((data ?? []).map((r: any) => r.user_id))];
    if (userIds.length > 0) {
      // Every notification must be the admin's own
      expect(userIds.every((id) => id === "c09ba27c-367f-46fd-8471-d823a99752fe")).toBe(true);
    }
  });

  it("🔴 BLOCKER: Agent cannot read admin notifications", async () => {
    const agent = await clientAs("qa-agent@24hv-test.com");
    const { data, error } = await agent
      .from("notifications")
      .select("id, user_id")
      .eq("user_id", "c09ba27c-367f-46fd-8471-d823a99752fe"); // admin's user_id
    const hasNoAccess = error !== null || (data ?? []).length === 0;
    expect(hasNoAccess).toBe(true);
  });

  it("🔴 BLOCKER: WL partner cannot read admin notifications", async () => {
    const wlOwner = await clientAs("qa-wl-owner@24hv-test.com");
    const { data, error } = await wlOwner
      .from("notifications")
      .select("id, user_id")
      .eq("user_id", "c09ba27c-367f-46fd-8471-d823a99752fe"); // admin's user_id
    const hasNoAccess = error !== null || (data ?? []).length === 0;
    expect(hasNoAccess).toBe(true);
  });

  it("🔴 BLOCKER: Direct client cannot read other users' notifications", async () => {
    const client = await clientAs("qa-client@24hv-test.com");
    const { data, error } = await client
      .from("notifications")
      .select("id, user_id")
      .eq("user_id", "c09ba27c-367f-46fd-8471-d823a99752fe"); // admin's user_id
    const hasNoAccess = error !== null || (data ?? []).length === 0;
    expect(hasNoAccess).toBe(true);
  });

  it("✅ User can mark their own notification as read", async () => {
    const admin = await clientAs("qa-admin@24hv-test.com");
    // Get an unread notification
    const { data: unread } = await admin
      .from("notifications")
      .select("id")
      .eq("is_read", false)
      .limit(1)
      .maybeSingle();
    if (!unread) return; // no unread notifications to test with

    const { error } = await admin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", unread.id);
    expect(error).toBeNull();

    // Reset it back
    await admin.from("notifications").update({ is_read: false }).eq("id", unread.id);
  });

});
