import type { KickoffItem } from "@/lib/types";

export const DEFAULT_KICKOFF_ITEMS: KickoffItem[] = [
  { category: "Brand Assets", item: "Logo files (SVG, PNG — dark & light variants)", required: true, provided: false },
  { category: "Brand Assets", item: "Brand guidelines or style guide", required: true, provided: false },
  { category: "Brand Assets", item: "Typography files or font specifications", required: false, provided: false },
  { category: "Brand Assets", item: "Product photography (high-res)", required: true, provided: false },
  { category: "Brand Assets", item: "Lifestyle imagery (high-res)", required: false, provided: false },
  { category: "Brand Assets", item: "Brand voice and messaging document", required: false, provided: false },
  { category: "Platform Access", item: "Shopify admin access (Staff or Collaborator)", required: true, provided: false },
  { category: "Platform Access", item: "Domain registrar access (for DNS)", required: false, provided: false },
  { category: "Platform Access", item: "Current theme files (if custom)", required: false, provided: false },
  { category: "Marketing Access", item: "Meta Business Manager (admin access)", required: true, provided: false },
  { category: "Marketing Access", item: "Google Analytics 4 (admin access)", required: true, provided: false },
  { category: "Marketing Access", item: "Google Ads (if applicable)", required: false, provided: false },
  { category: "Marketing Access", item: "Klaviyo or current ESP (admin access)", required: true, provided: false },
  { category: "Marketing Access", item: "TikTok for Business (if applicable)", required: false, provided: false },
  { category: "Marketing Access", item: "Amazon Seller Central (if applicable)", required: false, provided: false },
  { category: "Product & Commercial", item: "Full product catalog / SKU list with pricing", required: true, provided: false },
  { category: "Product & Commercial", item: "Cost of goods per SKU", required: false, provided: false },
  { category: "Product & Commercial", item: "Revenue, AOV, and conversion data (last 90 days)", required: true, provided: false },
  { category: "Product & Commercial", item: "Inventory system access or current export", required: false, provided: false },
  { category: "People & Process", item: "Primary point of contact (name, email, phone)", required: true, provided: false },
  { category: "People & Process", item: "Decision maker (if different from primary contact)", required: false, provided: false },
  { category: "People & Process", item: "Preferred communication channel (Slack / email / Notion)", required: true, provided: false },
  { category: "People & Process", item: "Kickoff call scheduled", required: true, provided: false },
];

export const KICKOFF_CATEGORIES = [
  "Brand Assets",
  "Platform Access",
  "Marketing Access",
  "Product & Commercial",
  "People & Process",
] as const;

export type KickoffCategory = (typeof KICKOFF_CATEGORIES)[number];
