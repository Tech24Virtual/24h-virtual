// Shared Discoverability Engine logic used by both
// disc-generate-pages and disc-render-preview.

interface Template {
  id: string;
  page_type: string;
  slug_pattern: string;
  meta_title_template: string | null;
  meta_description_template: string | null;
  title_template: string | null;
  h1_template: string | null;
  hero_template: string | null;
  direct_answer_template: string | null;
  local_overview_template: string | null;
  problem_section_template: string | null;
  solution_section_template: string | null;
  feature_section_template: string | null;
  faq_intro_template: string | null;
  cta_template: string | null;
  breadcrumb_template: string | null;
  og_title_template: string | null;
  og_description_template: string | null;
  min_word_count: number;
  min_faq_count: number;
  quality_threshold: number;
  requires_location_specific_content: boolean;
  requires_keyword_specific_content: boolean;
  requires_audience_specific_content: boolean;
  schema_type_defaults: unknown;
  internal_link_defaults: unknown;
}

interface Location {
  id: string;
  city: string;
  city_slug: string;
  country: string;
  country_slug: string;
  state_or_province: string | null;
  state_or_province_slug: string | null;
  state_or_province_abbr: string | null;
  region: string | null;
  custom_city_intro: string | null;
  local_challenge: string | null;
  local_benefit: string | null;
  service_boundary_note: string | null;
  priority_score: number;
}

interface Keyword {
  id: string;
  keyword: string;
  keyword_plural: string | null;
  keyword_slug: string;
  topic_cluster: string | null;
  search_intent: string | null;
  product_category: string | null;
  primary_cta_type: string | null;
  default_direct_answer: string | null;
  default_problem_angle: string | null;
  default_solution_angle: string | null;
  default_feature_set: unknown;
  default_faq_set_id: string | null;
}

interface Audience {
  id: string;
  audience_name: string;
  audience_slug: string;
  audience_type: string;
  description: string | null;
  default_cta: string | null;
  messaging_angle: string | null;
  primary_needs: unknown;
}

interface FaqItem {
  question: string;
  answer_short: string | null;
  answer_full: string | null;
}

interface LinkItem {
  anchor_text: string;
  target_url: string;
  target_type: string;
  link_group_type: string;
}

export interface RenderInput {
  template: Template;
  location: Location | null;
  keyword: Keyword | null;
  audience: Audience | null;
  faqs: FaqItem[];
  links: LinkItem[];
}

export interface RenderedPage {
  page_type: string;
  slug: string;
  full_url: string;
  page_title: string;
  meta_title: string;
  meta_description: string;
  og_title: string;
  og_description: string;
  h1: string;
  breadcrumb_title: string;
  hero_content: string;
  direct_answer_content: string;
  local_overview_content: string;
  problem_section_content: string;
  solution_section_content: string;
  feature_section_content: string;
  faq_content: { question: string; answer: string }[];
  internal_links_payload: { pillar: LinkItem[]; cluster: LinkItem[]; geographic: LinkItem[] };
  schema_payload: Record<string, unknown>;
  word_count: number;
  quality_score: number;
  quality_breakdown: QualityBreakdown;
  readiness_state: "needs_review" | "needs_rewrite" | "blocked";
  source_combination_hash: string;
  fallback_pct: number;
}

export interface QualityBreakdown {
  word_count_ok: boolean;
  direct_answer_ok: boolean;
  has_h1: boolean;
  faq_count_ok: boolean;
  link_count_ok: boolean;
  has_pillar_link: boolean;
  has_cta: boolean;
  fallback_low: boolean;
  word_count: number;
  direct_answer_words: number;
  faq_count: number;
  link_count: number;
  fallback_pct: number;
}

// ---------------- Variation pools (mirrors src/data) ----------------
const corePool = {
  problem: [
    "Missed calls in {city} translate directly into missed revenue. When the phone rings during a meeting, after hours, or on a busy lunch rush, your team has to choose between the customer in front of them and the one on the line.",
    "Most {city} businesses lose between 20 and 40 percent of inbound calls during peak hours. Voicemail rarely closes the gap because callers prefer to try a competitor rather than wait for a callback.",
    "Hiring an in house receptionist for a {city} office costs more than most growing teams can justify, especially once benefits, turnover, and after hours coverage enter the picture.",
    "After hours calls in {city} usually go straight to voicemail. The next morning your team starts the day chasing missed leads instead of working the warm pipeline.",
    "Voicemail and generic auto attendants frustrate the {city} buyers who pick up the phone in the first place. They want a real person who can answer a question or book time on a calendar."
  ],
  solution: [
    "24H Virtual gives your {city} business a live, trained team that answers in your name, follows your script, and escalates only what truly needs your attention.",
    "Our agents serve as a permanent extension of your {city} team. They greet every caller in your brand voice, capture the details you care about, and route urgent calls based on rules you control.",
    "Plug 24H Virtual into your existing phone system and your {city} office gains 24/7 coverage without hiring, training, or scheduling anyone new.",
    "Every call your {city} business receives is answered by a real person trained on your services, your tone, and your routing rules. You decide what gets escalated and how.",
    "We work as a remote front desk for your {city} business. Calls are answered in seconds, messages land where you want them, and appointments are booked while the caller is still on the line."
  ],
  features: [
    "Live agents trained on your script\nCustom call routing and escalation rules\nAppointment booking inside your calendar\nDetailed message logs sent in real time\nBilingual coverage in English and Spanish\nMonthly plans with transparent pricing",
    "Round the clock answering with no missed calls\nIntake forms, lead capture, and CRM updates\nAfter hours and weekend coverage included\nCustom greeting and call flow per line\nMessage delivery by SMS, email, or Slack\nReal time dashboard for every call",
    "Trained virtual receptionists in your name\nIntelligent call routing by department or topic\nCalendar integration for instant booking\nUrgent call escalation by phone or SMS\nDetailed call notes available within minutes\nFlat monthly pricing with no per call fee",
    "Custom scripts updated by you any time\nLive answering 24 hours a day, 7 days a week\nQualified lead capture and routing\nMulti channel notifications for every call\nCall recording and quality monitoring\nSimple monthly billing with clear overages"
  ],
  localOverview: [
    "Demand for fast call response in {city} keeps climbing as small and mid sized firms compete for the same buyers. A live answering service helps {city} teams stay reachable when their core staff is busy with active work.",
    "{city} is a busy market where buyers expect a same hour response. Most local businesses do not have the headcount to cover every shift, so a virtual receptionist closes the gap without adding payroll.",
    "Service businesses across {city} face the same pattern: a flood of calls during business hours and a steady trickle after close. 24H Virtual covers both windows with the same trained team and the same script.",
    "Small businesses in {city} often run with lean teams that cannot afford a dedicated front desk. A virtual receptionist gives them the responsiveness of a larger company at a fraction of the cost."
  ]
};

const industryPool = {
  problem: [
    "{audience} teams in {city} cannot pause to answer every call. The cost of letting an inquiry slip is high, and rebooking lost leads takes far longer than answering the first time.",
    "Front desk staff at {audience} firms in {city} juggle in person clients, paperwork, and the phone all at once. The phone almost always loses.",
    "Patients, clients, and prospects who call a {audience} office in {city} expect a real person, not a voicemail prompt. When they hit voicemail they often hang up and call the next provider.",
    "Most {audience} practices in {city} lose evening and weekend opportunities because the office is closed. Competing providers with after hours coverage capture those calls instead."
  ],
  solution: [
    "Our agents are trained on the language, intake forms, and escalation rules that {audience} firms in {city} actually use. They sound like part of your team because they answer every call as your team.",
    "24H Virtual builds a custom script for your {city} {audience} office that covers triage, scheduling, intake, and after hours emergencies. Your team only handles what genuinely needs them.",
    "We staff your {city} {audience} practice with bilingual agents who can intake new clients, route urgent calls, and book directly into your calendar without ever putting the caller on hold.",
    "Our team becomes the calm, capable front desk your {city} {audience} clients expect, even when your in office staff is fully booked or unavailable."
  ],
  features: [
    "Industry trained agents for {audience} workflows\nHIPAA aware intake patterns where required\nDirect booking into your calendar of record\nUrgent triage with clear escalation paths\nBilingual coverage in English and Spanish\nFull call logs and message delivery in real time",
    "Custom intake script per service line\nAppointment booking and reminders\nUrgent call routing to on call staff\nNew client questionnaires captured by phone\nCall recording for quality and compliance\nClear monthly pricing built around your call volume",
    "Live agents who understand {audience} terminology\nCalendar booking inside your existing system\nMulti channel notifications for time sensitive calls\nNew lead capture with full contact and intent details\nReporting dashboard for every interaction\nCoverage 24 hours a day, 7 days a week"
  ],
  localOverview: [
    "{audience} demand in {city} is steady and growing. Practices that respond quickly to every inquiry capture more clients than those that rely on voicemail or a single front desk seat.",
    "Across {city}, {audience} firms compete on responsiveness as much as on price or expertise. A live answering team helps you win the booking instead of losing it to a faster competitor.",
    "Many {audience} offices in {city} run lean front desks that cannot keep up with peak call volume. A virtual receptionist absorbs that overflow without adding headcount."
  ]
};

const overflowPool = {
  problem: [
    "When call volume in {city} spikes, your in house team has to drop active work to keep up. Quality slips, hold times grow, and customers notice.",
    "Hiring extra staff to handle peak {city} call volume is expensive and slow. Most teams need help today, not in three months after training.",
    "Even strong call centers in {city} hit busy windows where every line is full. The next caller hears hold music or hangs up entirely."
  ],
  solution: [
    "24H Virtual plugs in as overflow coverage for your {city} team. We answer the calls your in house staff cannot reach, in your name and following your script.",
    "Our agents catch the spillover when your {city} office is at capacity. You decide which calls roll over and how we should handle them.",
    "We act as a 24/7 safety net for your {city} business. When primary agents are busy, our team picks up within seconds and follows the same handling rules."
  ],
  features: [
    "Overflow routing from your existing phone system\nCustom rules for which calls roll over\nLive agents in your name and brand voice\nMessage delivery to the channel of your choice\nBilingual coverage in English and Spanish\nPlans sized to your peak rather than your average",
    "Seamless rollover from your primary line\nNo missed calls during peak hours\nFull notes captured for every overflow call\nUrgent call escalation by SMS or phone\nReal time dashboard for visibility\nFlat monthly pricing with clear overage rates"
  ],
  localOverview: [
    "{city} businesses with strong inbound demand often run out of phone capacity during peak hours. An overflow partner protects every contact without disrupting your core team.",
    "Seasonal spikes in {city} can swamp even well staffed call centers. 24H Virtual scales with the spike and steps back when volume returns to normal."
  ]
};

const bookingPool = {
  problem: [
    "Every appointment a {city} business loses to voicemail is real revenue walking out the door. Most callers do not leave a message, they call the next provider on the list.",
    "Coordinating bookings by phone is slow and error prone. Your {city} team ends up trading messages with prospects instead of confirming time on the calendar."
  ],
  solution: [
    "24H Virtual books appointments for your {city} business directly into your calendar of record. Callers leave the conversation with a confirmed time, not a callback promise.",
    "Our agents handle the entire booking flow for {city} clients, from greeting and qualification to scheduling and confirmation. Your team gets a clean calendar and a full set of notes."
  ],
  features: [
    "Live booking inside your existing calendar\nQualification questions before scheduling\nAutomatic confirmation by SMS and email\nReschedule and cancellation handling\nBilingual coverage in English and Spanish\nFull call notes attached to every booking",
    "Appointment booking 24 hours a day\nIntegration with major calendar systems\nWaitlist and reschedule management\nUrgent booking escalation when needed\nDetailed reporting on booked, missed, and rescheduled appointments\nFlat monthly pricing with transparent overages"
  ],
  localOverview: [
    "Buyers in {city} expect to book in the moment they call. A live answering team that can schedule on the spot wins the booking before a competitor returns the message.",
    "{city} service providers compete heavily on calendar speed. Same hour booking is now table stakes, and a virtual receptionist makes that achievable without growing your team."
  ]
};

const intakePool = {
  problem: [
    "New leads in {city} expect a fast, human response. When inbound calls hit voicemail, lead quality drops and cost per acquisition climbs.",
    "Manual intake is slow and inconsistent. Your {city} team risks losing key details from the first conversation, which weakens the rest of the pipeline."
  ],
  solution: [
    "24H Virtual captures full intake for every new lead in {city}, including contact details, intent, urgency, and qualification answers, then routes the lead to the right person on your team.",
    "Our agents run a structured intake script for every {city} prospect so your team always works from clean, complete information."
  ],
  features: [
    "Custom intake script per campaign\nFull contact, intent, and urgency capture\nQualification logic with branching questions\nLead routing to the right team member\nReal time delivery to your CRM or inbox\nBilingual coverage in English and Spanish",
    "Live intake 24 hours a day\nClean handoff with structured notes\nIntegration with your CRM or sales tool\nUrgent lead escalation by SMS or phone\nReporting on intake quality and conversion\nFlat monthly pricing with clear overage terms"
  ],
  localOverview: [
    "Lead competition in {city} is fierce. Whoever responds first usually wins the conversation, and a live intake team makes first response a default rather than a goal.",
    "{city} buyers convert when intake feels professional and human. A trained answering service raises the floor on every first call you receive."
  ]
};

const languagePool = {
  problem: [
    "{city} has a large bilingual customer base. Forcing every caller into an English only flow excludes a meaningful share of the local market.",
    "Bilingual hiring is hard and expensive in {city}. Many businesses end up understaffed on Spanish or French support and lose the conversations that matter."
  ],
  solution: [
    "24H Virtual provides bilingual answering for your {city} business in English and Spanish, with French available on supported plans. Every caller is greeted in their preferred language.",
    "Our bilingual team serves your {city} customers without putting anyone on hold for translation. Calls are handled end to end in the caller's language of choice."
  ],
  features: [
    "Bilingual agents in English and Spanish\nFrench coverage available on supported plans\nLanguage routing by line, time, or caller choice\nFull call notes in your preferred language\nCustom script per language\nReal time message delivery in any channel"
  ],
  localOverview: [
    "Bilingual demand in {city} is steady and growing. A live answering service in two languages widens your addressable market without hiring two front desks.",
    "Many {city} customers prefer to do business in Spanish. A bilingual answering team turns that preference into a competitive advantage."
  ]
};

const POOLS: Record<string, typeof corePool> = {
  "core-service": corePool,
  receptionist: corePool,
  "industry-specific": industryPool,
  overflow: overflowPool,
  booking: bookingPool,
  intake: intakePool,
  language: languagePool,
  default: corePool
};

function getPool(cluster: string | null | undefined) {
  if (!cluster) return POOLS.default;
  return POOLS[cluster] ?? POOLS.default;
}

// Deterministic hash → number from a string. Simple FNV-1a variant.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function pickFromPool(pool: string[], seed: number): string {
  if (pool.length === 0) return "";
  return pool[Math.abs(seed) % pool.length];
}

function buildPlaceholders(input: RenderInput): Record<string, string> {
  const { location: l, keyword: k, audience: a } = input;
  const ph: Record<string, string> = {
    city: l?.city ?? "",
    city_slug: l?.city_slug ?? "",
    state_or_province: l?.state_or_province ?? "",
    state_or_province_slug: l?.state_or_province_slug ?? "",
    state_or_province_abbr: l?.state_or_province_abbr ?? "",
    country: l?.country ?? "",
    country_slug: l?.country_slug ?? "",
    region: l?.region ?? "",
    keyword: k?.keyword ?? "",
    keyword_plural: k?.keyword_plural ?? (k?.keyword ? `${k.keyword}s` : ""),
    keyword_slug: k?.keyword_slug ?? "",
    audience: a?.audience_name ?? "",
    audience_slug: a?.audience_slug ?? "",
    primary_needs: Array.isArray(a?.primary_needs)
      ? (a!.primary_needs as string[]).join(", ")
      : "",
    messaging_angle: a?.messaging_angle ?? "",
    default_direct_answer: k?.default_direct_answer ?? "",
    default_problem_angle: k?.default_problem_angle ?? "",
    default_solution_angle: k?.default_solution_angle ?? "",
    custom_city_intro: l?.custom_city_intro ?? "",
    local_challenge: l?.local_challenge ?? "",
    local_benefit: l?.local_benefit ?? "",
    service_boundary_note: l?.service_boundary_note ?? "",
    cta: a?.default_cta ?? k?.primary_cta_type ?? "Book a free consultation"
  };
  return ph;
}

function substitute(tpl: string | null | undefined, ph: Record<string, string>): string {
  if (!tpl) return "";
  return tpl.replace(/\{(\w+)\}/g, (_m, key) => {
    return ph[key] ?? "";
  });
}

function countWords(text: string): number {
  return (text.trim().match(/\b[\p{L}\p{N}']+\b/gu) || []).length;
}

function countDirectAnswerWords(text: string): number {
  return countWords(text);
}

export async function renderPage(input: RenderInput): Promise<RenderedPage> {
  const { template, location, keyword, audience, faqs, links } = input;
  const ph = buildPlaceholders(input);

  // Deterministic seed from the combination
  const hashInput = [
    template.id,
    location?.id ?? "",
    keyword?.id ?? "",
    audience?.id ?? ""
  ].join("|");
  const source_combination_hash = await sha256Hex(hashInput);
  const seed = hashStr(source_combination_hash);

  // Variation selection from pool
  const pool = getPool(keyword?.topic_cluster);
  const problem_variant = pickFromPool(pool.problem, seed);
  const solution_variant = pickFromPool(pool.solution, seed >>> 3);
  const feature_variant = pickFromPool(pool.features, seed >>> 7);
  const local_variant = pickFromPool(pool.localOverview, seed >>> 11);

  // Compose placeholders for each section. Variation pool fragments are
  // substituted with the same placeholder map so {city}/{audience} interpolate.
  const subPool = (s: string) => substitute(s, ph);

  const slug = substitute(template.slug_pattern, ph);
  const full_url = slug.startsWith("/") ? slug : `/${slug}`;

  const meta_title = substitute(template.meta_title_template, ph) || substitute(template.title_template, ph);
  const meta_description = substitute(template.meta_description_template, ph);
  const og_title = substitute(template.og_title_template, ph) || meta_title;
  const og_description = substitute(template.og_description_template, ph) || meta_description;
  const page_title = substitute(template.title_template, ph) || meta_title;
  const h1 = substitute(template.h1_template, ph);
  const breadcrumb_title = substitute(template.breadcrumb_template, ph) || (location?.city ?? keyword?.keyword ?? page_title);
  const hero_content = substitute(template.hero_template, ph);
  const direct_answer_content = substitute(template.direct_answer_template, ph);
  const cta_text = substitute(template.cta_template, ph) || ph.cta;

  // Section bodies blend template line + variation pool fragment.
  // If a template body exists, it's used as the lead sentence; the pool
  // fragment expands the section with location/audience-specific copy.
  const composedLocal = [
    substitute(template.local_overview_template, ph),
    subPool(local_variant),
    location?.custom_city_intro ?? "",
    location?.local_benefit ?? ""
  ].filter(Boolean).join("\n\n");

  const composedProblem = [
    substitute(template.problem_section_template, ph),
    subPool(problem_variant),
    location?.local_challenge ?? "",
    keyword?.default_problem_angle ?? ""
  ].filter(Boolean).join("\n\n");

  const composedSolution = [
    substitute(template.solution_section_template, ph),
    subPool(solution_variant),
    keyword?.default_solution_angle ?? ""
  ].filter(Boolean).join("\n\n");

  const composedFeatures = [
    substitute(template.feature_section_template, ph),
    subPool(feature_variant)
  ].filter(Boolean).join("\n\n");

  // FAQs (cap at min_faq_count + 3 to avoid huge pages)
  const faqCap = Math.min(faqs.length, Math.max(template.min_faq_count, 3) + 3);
  const faq_content = faqs.slice(0, faqCap).map((f) => ({
    question: substitute(f.question, ph),
    answer: substitute(f.answer_full || f.answer_short || "", ph)
  }));

  // Links: split by group type
  const pillar = links.filter((l) => l.link_group_type === "pillar" || l.target_type === "pillar").slice(0, 3);
  const cluster = links.filter((l) => l.link_group_type === "cluster" || l.target_type === "cluster").slice(0, 4);
  const geographic: LinkItem[] = location
    ? [
        {
          anchor_text: `Answering services across ${location.country}`,
          target_url: `/locations/${location.country_slug}`,
          target_type: "geographic",
          link_group_type: "geographic"
        }
      ]
    : [];

  const internal_links_payload = { pillar, cluster, geographic };

  // Schema payload (minimal, expanded in Phase 3b)
  const schemaTypes = Array.isArray(template.schema_type_defaults) ? template.schema_type_defaults : ["WebPage"];
  const schema_payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaTypes[0] ?? "WebPage",
    name: page_title,
    description: meta_description,
    url: `https://24hv.io${full_url}`,
    ...(location ? { areaServed: { "@type": "City", name: location.city } } : {}),
    ...(faq_content.length > 0
      ? {
          mainEntity: faq_content.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer }
          }))
        }
      : {})
  };

  // Word count across visible body fields
  const fullBody = [
    h1,
    hero_content,
    direct_answer_content,
    composedLocal,
    composedProblem,
    composedSolution,
    composedFeatures,
    cta_text,
    ...faq_content.map((f) => `${f.question} ${f.answer}`)
  ].join(" ");
  const word_count = countWords(fullBody);

  // Fallback percentage = how much of the body came from generic template
  // text vs location/keyword/audience-specific fields.
  const specificParts = [
    location?.custom_city_intro,
    location?.local_challenge,
    location?.local_benefit,
    keyword?.default_problem_angle,
    keyword?.default_solution_angle,
    keyword?.default_direct_answer,
    audience?.messaging_angle
  ].filter(Boolean).join(" ");
  const specific_words = countWords(specificParts);
  const fallback_pct = word_count > 0 ? Math.round(((word_count - specific_words) / word_count) * 100) : 100;

  // Quality scoring
  const direct_answer_words = countDirectAnswerWords(direct_answer_content);
  const link_count = pillar.length + cluster.length + geographic.length;

  const breakdown: QualityBreakdown = {
    word_count_ok: word_count >= template.min_word_count,
    direct_answer_ok: direct_answer_words >= 35 && direct_answer_words <= 75,
    has_h1: h1.trim().length > 0,
    faq_count_ok: faq_content.length >= template.min_faq_count,
    link_count_ok: link_count >= 3,
    has_pillar_link: pillar.length >= 1,
    has_cta: cta_text.trim().length > 0,
    fallback_low: fallback_pct < 60,
    word_count,
    direct_answer_words,
    faq_count: faq_content.length,
    link_count,
    fallback_pct
  };

  let score = 0;
  if (breakdown.word_count_ok) score += 20;
  if (breakdown.direct_answer_ok) score += 15;
  if (breakdown.has_h1) score += 10;
  if (breakdown.faq_count_ok) score += 15;
  if (breakdown.link_count_ok && breakdown.has_pillar_link) score += 15;
  if (breakdown.has_cta) score += 10;
  if (breakdown.fallback_low) score += 15;

  let readiness_state: "needs_review" | "needs_rewrite" | "blocked";
  const blocked = !breakdown.has_h1
    || !breakdown.direct_answer_ok
    || (template.requires_location_specific_content && !location)
    || (template.requires_keyword_specific_content && !keyword);
  if (blocked) {
    readiness_state = "blocked";
  } else if (score < 70 || fallback_pct > 60) {
    readiness_state = "needs_rewrite";
  } else {
    readiness_state = "needs_review";
  }

  return {
    page_type: template.page_type,
    slug,
    full_url,
    page_title,
    meta_title,
    meta_description,
    og_title,
    og_description,
    h1,
    breadcrumb_title,
    hero_content,
    direct_answer_content,
    local_overview_content: composedLocal,
    problem_section_content: composedProblem,
    solution_section_content: composedSolution,
    feature_section_content: composedFeatures,
    faq_content,
    internal_links_payload,
    schema_payload,
    word_count,
    quality_score: score,
    quality_breakdown: breakdown,
    readiness_state,
    source_combination_hash,
    fallback_pct
  };
}

export interface FetchedRefs {
  templates: Record<string, Template>;
  locations: Record<string, Location>;
  keywords: Record<string, Keyword>;
  audiences: Record<string, Audience>;
  faqsBySet: Record<string, FaqItem[]>;
  linksBySet: Record<string, LinkItem[]>;
  defaultPillarLinks: LinkItem[];
  defaultClusterLinks: LinkItem[];
}

// deno-lint-ignore no-explicit-any
export async function fetchRefs(supabase: any, opts: {
  templateIds: string[];
  locationIds: string[];
  keywordIds: string[];
  audienceIds: string[];
}): Promise<FetchedRefs> {
  const [tplRes, locRes, kwRes, audRes, setsRes, itemsRes] = await Promise.all([
    supabase.from("disc_templates").select("*").in("id", opts.templateIds),
    opts.locationIds.length > 0
      ? supabase.from("disc_locations").select("*").in("id", opts.locationIds)
      : Promise.resolve({ data: [] }),
    opts.keywordIds.length > 0
      ? supabase.from("disc_keywords").select("*").in("id", opts.keywordIds)
      : Promise.resolve({ data: [] }),
    opts.audienceIds.length > 0
      ? supabase.from("disc_audiences").select("*").in("id", opts.audienceIds)
      : Promise.resolve({ data: [] }),
    supabase.from("disc_internal_link_sets").select("*").eq("active", true),
    supabase.from("disc_internal_link_items").select("*").eq("active", true)
  ]);

  const setTypeById: Record<string, string> = {};
  for (const s of setsRes.data ?? []) setTypeById[s.id] = s.link_group_type;

  const linksBySet: Record<string, LinkItem[]> = {};
  for (const it of itemsRes.data ?? []) {
    const arr = (linksBySet[it.link_set_id] ||= []);
    arr.push({
      anchor_text: it.anchor_text,
      target_url: it.target_url,
      target_type: it.target_type,
      link_group_type: setTypeById[it.link_set_id] || it.target_type
    });
  }

  // Default pillar + cluster: gather across all active sets of each type
  const defaultPillarLinks: LinkItem[] = [];
  const defaultClusterLinks: LinkItem[] = [];
  for (const [setId, items] of Object.entries(linksBySet)) {
    const t = setTypeById[setId];
    if (t === "pillar") defaultPillarLinks.push(...items);
    else if (t === "cluster") defaultClusterLinks.push(...items);
  }

  // FAQ sets: only fetch the ones referenced by keywords
  const faqSetIds = Array.from(new Set((kwRes.data ?? []).map((k: { default_faq_set_id: string | null }) => k.default_faq_set_id).filter(Boolean)));
  const faqsBySet: Record<string, FaqItem[]> = {};
  if (faqSetIds.length > 0) {
    const faqRes = await supabase
      .from("disc_faqs")
      .select("faq_set_id, question, answer_short, answer_full, display_order")
      .eq("active", true)
      .in("faq_set_id", faqSetIds)
      .order("display_order");
    for (const f of faqRes.data ?? []) {
      const arr = (faqsBySet[f.faq_set_id] ||= []);
      arr.push({ question: f.question, answer_short: f.answer_short, answer_full: f.answer_full });
    }
  }

  const toMap = <T extends { id: string }>(arr: T[]) => Object.fromEntries(arr.map((x) => [x.id, x]));

  return {
    templates: toMap(tplRes.data ?? []),
    locations: toMap(locRes.data ?? []),
    keywords: toMap(kwRes.data ?? []),
    audiences: toMap(audRes.data ?? []),
    faqsBySet,
    linksBySet,
    defaultPillarLinks,
    defaultClusterLinks
  };
}

export function pickLinks(
  refs: FetchedRefs,
  keyword: Keyword | null
): LinkItem[] {
  // Pull faq-relevant cluster links first when possible. For now: first 4 cluster + first 3 pillar.
  const result: LinkItem[] = [];
  result.push(...refs.defaultPillarLinks.slice(0, 3));
  result.push(...refs.defaultClusterLinks.slice(0, 4));
  return result;
}

export function pickFaqs(refs: FetchedRefs, keyword: Keyword | null): FaqItem[] {
  if (keyword?.default_faq_set_id && refs.faqsBySet[keyword.default_faq_set_id]) {
    return refs.faqsBySet[keyword.default_faq_set_id];
  }
  // Fall back to any available FAQ set
  const first = Object.values(refs.faqsBySet)[0];
  return first ?? [];
}
