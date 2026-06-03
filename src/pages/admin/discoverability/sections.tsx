/**
 * Phase 2 — Discoverability admin sections.
 *
 * Each section is now a real CRUD surface backed by canonical disc_* tables.
 * No second content/SEO/keyword engine introduced; all data lives in the
 * canonical Discoverability substrate.
 */
import { SimpleCrudTable, type CrudField } from "@/components/admin/SimpleCrudTable";
import { GeneratedPagesTable } from "./GeneratedPagesTable";
import { SitemapControlsPanel } from "./SitemapControlsPanel";

const templateFields: CrudField[] = [
  { key: "name", label: "Name", required: true, hideInList: false },
  { key: "page_type", label: "Page Type", required: true, placeholder: "service-location, audience-service, etc." },
  { key: "slug_pattern", label: "Slug Pattern", required: true, placeholder: "/{service}/{city}" },
  { key: "status", label: "Status", placeholder: "draft | active", defaultValue: "draft" },
  { key: "title_template", label: "Title Template", type: "textarea" },
  { key: "meta_title_template", label: "Meta Title Template", type: "textarea", hideInList: true },
  { key: "meta_description_template", label: "Meta Description Template", type: "textarea", hideInList: true },
  { key: "h1_template", label: "H1 Template", type: "textarea", hideInList: true },
  { key: "hero_template", label: "Hero Body Template", type: "textarea", hideInList: true },
  { key: "direct_answer_template", label: "Direct Answer (AEO)", type: "textarea", hideInList: true },
  { key: "problem_section_template", label: "Problem Section", type: "textarea", hideInList: true },
  { key: "solution_section_template", label: "Solution Section", type: "textarea", hideInList: true },
  { key: "feature_section_template", label: "Feature Section", type: "textarea", hideInList: true },
  { key: "cta_template", label: "CTA Template", type: "textarea", hideInList: true },
  { key: "min_word_count", label: "Min Word Count", type: "number", defaultValue: 400, hideInList: true },
  { key: "min_faq_count", label: "Min FAQ Count", type: "number", defaultValue: 3, hideInList: true },
  { key: "quality_threshold", label: "Quality Threshold", type: "number", defaultValue: 70, hideInList: true },
];

const locationFields: CrudField[] = [
  { key: "city", label: "City", required: true },
  { key: "city_slug", label: "City Slug", required: true, placeholder: "new-york" },
  { key: "state_or_province", label: "State / Province" },
  { key: "state_or_province_slug", label: "State Slug", hideInList: true },
  { key: "state_or_province_abbr", label: "State Abbr", hideInList: true },
  { key: "country", label: "Country", required: true, defaultValue: "US" },
  { key: "country_slug", label: "Country Slug", required: true, defaultValue: "us", hideInList: true },
  { key: "metro", label: "Metro", hideInList: true },
  { key: "region", label: "Region", hideInList: true },
  { key: "priority_score", label: "Priority Score", type: "number", defaultValue: 50 },
  { key: "active", label: "Active", type: "boolean", defaultValue: true },
  { key: "custom_city_intro", label: "Custom Intro", type: "textarea", hideInList: true },
  { key: "local_challenge", label: "Local Challenge", type: "textarea", hideInList: true },
  { key: "local_benefit", label: "Local Benefit", type: "textarea", hideInList: true },
];

const keywordFields: CrudField[] = [
  { key: "keyword", label: "Keyword", required: true },
  { key: "keyword_slug", label: "Keyword Slug", required: true },
  { key: "topic_cluster", label: "Topic Cluster" },
  { key: "search_intent", label: "Search Intent", placeholder: "informational | transactional | commercial" },
  { key: "primary_cta_type", label: "Primary CTA", hideInList: true },
  { key: "default_direct_answer", label: "Default Direct Answer", type: "textarea", hideInList: true },
  { key: "default_problem_angle", label: "Default Problem Angle", type: "textarea", hideInList: true },
  { key: "default_solution_angle", label: "Default Solution Angle", type: "textarea", hideInList: true },
  { key: "priority_score", label: "Priority", type: "number", defaultValue: 50 },
  { key: "active", label: "Active", type: "boolean", defaultValue: true },
];

const audienceFields: CrudField[] = [
  { key: "audience_name", label: "Name", required: true },
  { key: "audience_slug", label: "Slug", required: true },
  { key: "audience_type", label: "Type", defaultValue: "industry" },
  { key: "messaging_angle", label: "Messaging Angle", type: "textarea" },
  { key: "default_cta", label: "Default CTA", hideInList: true },
  { key: "description", label: "Description", type: "textarea", hideInList: true },
  { key: "active", label: "Active", type: "boolean", defaultValue: true },
];

const faqSetFields: CrudField[] = [
  { key: "name", label: "Set Name", required: true },
  { key: "topic_cluster", label: "Topic Cluster" },
  { key: "audience", label: "Audience" },
  { key: "status", label: "Status", defaultValue: "draft" },
];

const linkSetFields: CrudField[] = [
  { key: "name", label: "Set Name", required: true },
  { key: "link_group_type", label: "Group Type", defaultValue: "cluster", placeholder: "pillar | cluster | geographic | breadcrumb" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "active", label: "Active", type: "boolean", defaultValue: true },
];

export const TemplatesSection = () => (
  <SimpleCrudTable
    table="disc_templates"
    title="Templates"
    description="Reusable page templates with placeholder-driven slugs, titles, meta, hero, body, and CTA patterns."
    fields={templateFields}
    orderBy={{ column: "name" }}
  />
);

export const LocationsSection = () => (
  <SimpleCrudTable
    table="disc_locations"
    title="Locations"
    description="Cities, regions, and countries with priority scores and custom local content overrides."
    fields={locationFields}
    orderBy={{ column: "priority_score", ascending: false }}
  />
);

export const KeywordsSection = () => (
  <SimpleCrudTable
    table="disc_keywords"
    title="Keywords"
    description="Discoverability keyword library, intent, and default CTAs. Pairs with the Growth Hub Keyword Tracker."
    fields={keywordFields}
    orderBy={{ column: "priority_score", ascending: false }}
  />
);

export const AudiencesSection = () => (
  <SimpleCrudTable
    table="disc_audiences"
    title="Audiences"
    description="Industries, personas, and use cases with messaging angles and default CTAs."
    fields={audienceFields}
    orderBy={{ column: "audience_name" }}
  />
);

export const FaqLibrarySection = () => (
  <div className="space-y-8">
    <SimpleCrudTable
      table="disc_faq_sets"
      title="FAQ Sets"
      description="Reusable FAQ groups by topic cluster and audience. Generated pages cite a set; the set's FAQs are emitted as FAQPage schema."
      fields={faqSetFields}
      orderBy={{ column: "name" }}
    />
    <SimpleCrudTable
      table="disc_faqs"
      title="FAQs"
      description="Individual questions belonging to a set. Use the FAQ Set ID from the table above."
      fields={[
        { key: "faq_set_id", label: "FAQ Set ID", required: true, placeholder: "uuid of a FAQ Set" },
        { key: "question", label: "Question", required: true },
        { key: "answer_short", label: "Short Answer", type: "textarea" },
        { key: "answer_full", label: "Full Answer", type: "textarea", hideInList: true },
        { key: "display_order", label: "Order", type: "number", defaultValue: 0 },
        { key: "active", label: "Active", type: "boolean", defaultValue: true },
      ]}
      orderBy={{ column: "display_order" }}
    />
  </div>
);

export const InternalLinksSection = () => (
  <div className="space-y-8">
    <SimpleCrudTable
      table="disc_internal_link_sets"
      title="Link Sets"
      description="Pillar, cluster, geographic, and breadcrumb link sets used across generated pages."
      fields={linkSetFields}
      orderBy={{ column: "name" }}
    />
    <SimpleCrudTable
      table="disc_internal_link_items"
      title="Link Items"
      description="Anchor text and target URL for each link in a set."
      fields={[
        { key: "link_set_id", label: "Link Set ID", required: true, placeholder: "uuid of a Link Set" },
        { key: "anchor_text", label: "Anchor Text", required: true },
        { key: "target_url", label: "Target URL", required: true },
        { key: "target_type", label: "Target Type", defaultValue: "pillar" },
        { key: "display_order", label: "Order", type: "number", defaultValue: 0 },
        { key: "active", label: "Active", type: "boolean", defaultValue: true },
      ]}
      orderBy={{ column: "display_order" }}
    />
  </div>
);

export const GeneratedPagesSection = () => (
  <div className="space-y-4">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Generated Pages</h1>
      <p className="text-muted-foreground text-sm mt-1">Review, edit, approve, and publish every generated page.</p>
    </div>
    <GeneratedPagesTable />
  </div>
);

export const PublishQueueSection = () => (
  <div className="space-y-4">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Publish Queue</h1>
      <p className="text-muted-foreground text-sm mt-1">Pages approved and ready to go live.</p>
    </div>
    <GeneratedPagesTable
      initialFilter={{ readiness: "approved", publish: "draft" }}
      showBatchButton={false}
      emptyMessage="No pages currently approved and waiting to publish."
    />
  </div>
);

export const QualityReviewSection = () => (
  <div className="space-y-4">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Quality Review</h1>
      <p className="text-muted-foreground text-sm mt-1">Pages flagged for low quality or rewrite.</p>
    </div>
    <GeneratedPagesTable
      initialFilter={{ readiness: "needs_rewrite" }}
      showBatchButton={false}
      emptyMessage="Nothing flagged for rewrite. Use the quality filter to spot low score pages."
    />
  </div>
);

export const SitemapControlsSection = () => <SitemapControlsPanel />;
