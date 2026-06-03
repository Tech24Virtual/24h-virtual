/**
 * Variation pools for Discoverability Engine page generation.
 *
 * Each section pulls one fragment per page using a deterministic seed
 * (sha256 of template_id|location_id|keyword_id|audience_id) so a re-run
 * of the same combination produces identical output, but different
 * combinations get different wording.
 */

export type VariationCluster =
  | "core-service"
  | "receptionist"
  | "industry-specific"
  | "overflow"
  | "booking"
  | "intake"
  | "language"
  | "default";

interface PoolMap {
  problem: string[];
  solution: string[];
  features: string[];
  localOverview: string[];
}

const corePool: PoolMap = {
  problem: [
    "Missed calls in {city} translate directly into missed revenue. When the phone rings during a meeting, after hours, or on a busy lunch rush, your team has to choose between the customer in front of them and the one on the line.",
    "Most {city} businesses lose between 20 and 40 percent of inbound calls during peak hours. Voicemail rarely closes the gap because callers prefer to try a competitor rather than wait for a callback.",
    "Hiring an in-house receptionist for a {city} office costs more than most growing teams can justify, especially once benefits, turnover, and after-hours coverage enter the picture.",
    "After hours calls in {city} usually go straight to voicemail. The next morning your team starts the day chasing missed leads instead of working the warm pipeline.",
    "Voicemail and generic auto-attendants frustrate the {city} buyers who pick up the phone in the first place. They want a real person who can answer a question or book time on a calendar."
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

const industryPool: PoolMap = {
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

const overflowPool: PoolMap = {
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

const bookingPool: PoolMap = {
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

const intakePool: PoolMap = {
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

const languagePool: PoolMap = {
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

const POOLS: Record<VariationCluster, PoolMap> = {
  "core-service": corePool,
  receptionist: corePool,
  "industry-specific": industryPool,
  overflow: overflowPool,
  booking: bookingPool,
  intake: intakePool,
  language: languagePool,
  default: corePool
};

export function getPool(cluster: string | null | undefined): PoolMap {
  if (!cluster) return POOLS.default;
  return POOLS[cluster as VariationCluster] ?? POOLS.default;
}

/**
 * Pick a fragment from a pool deterministically using a numeric seed.
 * Same seed + same pool => same fragment.
 */
export function pickFromPool(pool: string[], seed: number): string {
  if (pool.length === 0) return "";
  const idx = Math.abs(seed) % pool.length;
  return pool[idx];
}
