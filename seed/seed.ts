import { createClient } from "@supabase/supabase-js";

// Service role client - used for auth admin operations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
    global: {
      headers: {
        // This header tells PostgREST to bypass RLS
        "x-supabase-bypass-rls": "true",
      },
    },
  },
);

const TEST_USERS = [
  { email: "qa-admin@24hv-test.com", role: "admin" },
  { email: "qa-sales@24hv-test.com", role: "sales" },
  { email: "qa-agent@24hv-test.com", role: "agent" },
  { email: "qa-supervisor@24hv-test.com", role: "supervisor" },
  { email: "qa-billing@24hv-test.com", role: "billing" },
  { email: "qa-tech@24hv-test.com", role: "tech" },
  { email: "qa-hr@24hv-test.com", role: "hr" },
  { email: "qa-client@24hv-test.com", role: "client" },
  { email: "qa-wl-owner@24hv-test.com", role: "white_label" },
  { email: "qa-wl-manager@24hv-test.com", role: "white_label" },
  { email: "qa-wl-agent@24hv-test.com", role: "white_label" },
  { email: "qa-wl-client1@24hv-test.com", role: "wl_client" },
  { email: "qa-wl-client2@24hv-test.com", role: "wl_client" },
  { email: "qa-wl-partner-b@24hv-test.com", role: "white_label" },
  { email: "qa-wl-veza@24hv-test.com", role: "white_label" },
];

async function seed() {
  console.log("🌱 Starting seed...");

  for (const u of TEST_USERS) {
    // Step 1: Get or create auth user
    let userId: string;

    const { data: existing } = await supabase.auth.admin.listUsers();
    const existingUser = existing?.users?.find((x) => x.email === u.email);

    if (existingUser) {
      userId = existingUser.id;
      console.log(`⏭️  Auth user exists: ${u.email}`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: "QATestPass123!",
        email_confirm: true,
      });

      if (error || !data.user) {
        console.error(`❌ Auth failed: ${u.email} — ${error?.message}`);
        continue;
      }

      userId = data.user.id;
      console.log(`✅ Auth created: ${u.email}`);
    }

    // Step 2: Ensure profile exists
    const { error: profileError } = await supabase.rpc(
      "seed_test_user_profile",
      {
        p_user_id: userId,
        p_full_name: `QA ${u.role}`,
      },
    );

    if (profileError) {
      console.error(
        `⚠️  Profile failed for ${u.email}: ${profileError.message}`,
      );
    } else {
      console.log(`✅ Profile created: ${u.email}`);
    }

    // Step 3: Insert role using raw SQL via rpc to bypass RLS
    const { error: roleError } = await supabase.rpc("seed_test_user_role", {
      p_user_id: userId,
      p_role: u.role,
    });

    if (roleError) {
      console.error(`❌ Role failed for ${u.email}: ${roleError.message}`);
    } else {
      console.log(`✅ Role assigned: ${u.email} → ${u.role}`);
    }

  }

  // ─────────────────────────────────────────
  // Create WL Partner records
  // ─────────────────────────────────────────
  console.log('\n🏢 Creating WL Partner records...');

  const allUsers = await supabase.auth.admin.listUsers();
  const userList = allUsers.data?.users ?? [];

  const wlOwner = userList.find(x => x.email === 'qa-wl-owner@24hv-test.com');
  const wlPartnerB = userList.find(x => x.email === 'qa-wl-partner-b@24hv-test.com');

  if (wlOwner) {
    const { error } = await supabase.rpc('seed_test_wl_partner', {
      p_user_id: wlOwner.id,
      p_slug: 'qa-test-agency',
      p_company: 'QA Test Agency',
      p_email: 'qa-wl-owner@24hv-test.com',
      p_contact_name: 'QA Owner A',
      p_color: '#6366f1'
    });
    if (error) {
      console.error(`❌ WL Partner A failed: ${error.message}`);
    } else {
      console.log('✅ WL Partner A created (qa-test-agency)');
    }
  }

  if (wlPartnerB) {
    const { error } = await supabase.rpc('seed_test_wl_partner', {
      p_user_id: wlPartnerB.id,
      p_slug: 'qa-test-agency-b',
      p_company: 'QA Test Agency B',
      p_email: 'qa-wl-partner-b@24hv-test.com',
      p_contact_name: 'QA Owner B',
      p_color: '#ef4444'
    });
    if (error) {
      console.error(`❌ WL Partner B failed: ${error.message}`);
    } else {
      console.log('✅ WL Partner B created (qa-test-agency-b)');
    }
  }

  const wlVeza = userList.find(x => x.email === 'qa-wl-veza@24hv-test.com');

  if (wlVeza) {
    const { error } = await supabase.rpc('seed_test_wl_partner', {
      p_user_id: wlVeza.id,
      p_slug: 'veza-reception',
      p_company: 'Veza Reception',
      p_email: 'qa-wl-veza@24hv-test.com',
      p_contact_name: 'QA Veza Owner',
      p_color: '#0B60B0'
    });
    if (error) {
      console.error(`❌ WL Partner Veza link failed: ${error.message}`);
    } else {
      console.log('✅ qa-wl-veza linked to existing veza-reception partner');
    }
  }

  // ─────────────────────────────────────────
  // Seed qa-client support ticket (fixed UUID for flow7 e2e tests)
  // ─────────────────────────────────────────
  console.log('\n🎫 Seeding qa-client support ticket...');

  const qaClient = userList.find(x => x.email === 'qa-client@24hv-test.com');

  if (qaClient) {
    const { error } = await supabase.from('support_tickets').upsert({
      id: 'f7000001-0000-0000-0000-000000000000',
      submitted_by: qaClient.id,
      title: 'QA Flow7 Direct Client Ticket',
      description: 'Seeded for flow7-ticket-thread e2e tests. Please ignore.',
      priority: 'medium',
      status: 'open',
      source: 'client_portal',
      submitter_name: 'QA client',
      submitter_email: 'qa-client@24hv-test.com',
    }, { onConflict: 'id' });
    if (error) {
      console.error(`❌ qa-client ticket failed: ${error.message}`);
    } else {
      console.log('✅ qa-client ticket upserted (f7000001-0000-0000-0000-000000000000)');
    }
  } else {
    console.warn('⚠️  qa-client user not found — skipping ticket seed');
  }

  console.log("🎉 Seed complete!");
}

seed().catch(console.error);
