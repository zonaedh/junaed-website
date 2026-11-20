/**
 * Editable page content â€” typed blocks, defaults and cached reads.
 *
 * MVP.md Â§3.3: each page is built from typed sections, edited with a form per
 * section, never free-form HTML. That is the whole point â€” the design cannot
 * break because an editor cannot reach the markup.
 *
 * Shape:
 *   pages.content is JSONB holding a flat object of string fields (plus a
 *   string[] for lists). One page key = one block type = one form.
 *
 * Why a flat object and not a nested tree: a nested block editor is a Phase 4
 * problem (posts need it, pages do not). Pages have a fixed set of slots. Flat
 * keys mean the admin form is generated, validation is one loop, and a partial
 * row still renders â€” every missing field falls back to its default.
 *
 * Split out of lib/pages.ts on purpose (B1): a "use client" form needs the
 * field definitions and types, but importing lib/pages.ts would drag `@/db`
 * and therefore `pg` into the browser bundle, which fails the build.
 *
 * The defaults below are the copy that was hardcoded in Phase 1. A fresh
 * database therefore renders exactly the site that was already reviewed.
 */






/* ------------------------------- block types ------------------------------ */

/**
 * `image` fields store a media id as a string, not a URL.
 *
 * Storing the id means replacing the file in the library updates every page
 * that uses it, and a deleted image resolves to nothing rather than a broken
 * link. The admin form renders a media picker for these instead of a text box.
 */
export type PageFieldKind = "text" | "textarea" | "longtext" | "image";

export type PageField = {
  key: string;
  label: string;
  kind: PageFieldKind;
  default: string;
  maxLength: number;
  help?: string;
};

export type PageDefinition = {
  /** Stable key in pages.key. */
  key: string;
  /** Human name for the admin list. */
  name: string;
  /** Public path, for the "view live" link. */
  path: string;
  /** Short description of what this editor controls. */
  description: string;
  fields: readonly PageField[];
};

/* --------------------------------- content -------------------------------- */

export const PAGE_DEFINITIONS: readonly PageDefinition[] = [
  {
    key: "home",
    name: "Home",
    path: "/",
    description: "Hero section, section headings and the closing call to action.",
    fields: [
      {
        key: "heroEyebrow",
        label: "Hero eyebrow",
        kind: "text",
        default: "Digital solutions for growing brands",
        maxLength: 80,
        help: "The small line above the main heading.",
      },
      {
        key: "heroHeading",
        label: "Hero heading",
        kind: "text",
        default: "Letâ€™s make your brand",
        maxLength: 120,
      },
      {
        key: "heroHighlight",
        label: "Hero highlighted words",
        kind: "text",
        default: "stand out.",
        maxLength: 60,
        help: "Rendered in violet at the end of the heading.",
      },
      {
        key: "heroParagraph",
        label: "Hero paragraph",
        kind: "textarea",
        default:
          "I help businesses build a stronger online presence through smart digital marketing, search visibility, creative design, and websites that work beautifully.",
        maxLength: 400,
      },
      {
        key: "heroPrimaryCta",
        label: "Primary button label",
        kind: "text",
        default: "Start a project",
        maxLength: 40,
      },
      {
        key: "heroSecondaryCta",
        label: "Secondary button label",
        kind: "text",
        default: "Explore my work",
        maxLength: 40,
      },
      {
        key: "heroImage",
        label: "Hero image",
        kind: "image",
        default: "",
        maxLength: 20,
        help: "Portrait or square works best. Leave empty to keep the illustrated placeholder.",
      },
      {
        key: "availabilityNote",
        label: "Availability note",
        kind: "text",
        default: "Open to new projects & collaborations",
        maxLength: 80,
      },
      {
        key: "servicesEyebrow",
        label: "Services eyebrow",
        kind: "text",
        default: "What I do",
        maxLength: 60,
      },
      {
        key: "servicesTitle",
        label: "Services heading",
        kind: "text",
        default: "Everything your brand needs to",
        maxLength: 120,
      },
      {
        key: "servicesHighlight",
        label: "Services highlighted words",
        kind: "text",
        default: "grow online.",
        maxLength: 60,
      },
      {
        key: "servicesIntro",
        label: "Services intro",
        kind: "textarea",
        default:
          "From getting discovered to making a lasting impression, I bring together the essentials to help your business move forward.",
        maxLength: 400,
      },
      {
        key: "portfolioEyebrow",
        label: "Portfolio eyebrow",
        kind: "text",
        default: "Selected work",
        maxLength: 60,
      },
      {
        key: "portfolioTitle",
        label: "Portfolio heading",
        kind: "text",
        default: "Good work speaks",
        maxLength: 120,
      },
      {
        key: "portfolioHighlight",
        label: "Portfolio highlighted words",
        kind: "text",
        default: "for itself.",
        maxLength: 60,
      },
      {
        key: "portfolioIntro",
        label: "Portfolio intro",
        kind: "textarea",
        default:
          "A glimpse of the kind of digital experiences, marketing visuals, and growth-focused work I love creating.",
        maxLength: 400,
      },
      {
        key: "aboutEyebrow",
        label: "About eyebrow",
        kind: "text",
        default: "A little about me",
        maxLength: 60,
      },
      {
        key: "aboutHeading",
        label: "About heading",
        kind: "text",
        default: "Hey, Iâ€™m Junaed.",
        maxLength: 120,
      },
      {
        key: "aboutHighlight",
        label: "About highlighted words",
        kind: "text",
        default: "work harder.",
        maxLength: 60,
      },
      {
        key: "aboutParagraph",
        label: "About paragraph",
        kind: "textarea",
        default:
          "Iâ€™m a digital marketer and creative problem-solver who enjoys helping brands make sense of the online world. My work brings together strategy, creativity, and practical execution, so businesses can build a presence theyâ€™re proud of and grow with confidence.",
        maxLength: 600,
      },
      {
        key: "ctaEyebrow",
        label: "CTA eyebrow",
        kind: "text",
        default: "Have something in mind?",
        maxLength: 60,
      },
      {
        key: "ctaHeading",
        label: "CTA heading",
        kind: "text",
        default: "Letâ€™s build something great together.",
        maxLength: 140,
      },
      {
        key: "ctaParagraph",
        label: "CTA paragraph",
        kind: "textarea",
        default:
          "Have a project, a business idea, or a challenge you want to solve? Tell me a little about it and letâ€™s see what we can make happen.",
        maxLength: 400,
      },
      {
        key: "ctaButton",
        label: "CTA button label",
        kind: "text",
        default: "Start a conversation",
        maxLength: 40,
      },
    ],
  },
  {
    key: "about",
    name: "About",
    path: "/about",
    description: "The about page heading, story paragraphs and quote.",
    fields: [
      {
        key: "eyebrow",
        label: "Eyebrow",
        kind: "text",
        default: "A little about me",
        maxLength: 60,
      },
      {
        key: "heading",
        label: "Heading",
        kind: "text",
        default: "Hey, Iâ€™m Junaed. I make digital work",
        maxLength: 140,
      },
      {
        key: "highlight",
        label: "Highlighted words",
        kind: "text",
        default: "work harder.",
        maxLength: 60,
      },
      {
        key: "story1",
        label: "Story â€” paragraph 1",
        kind: "textarea",
        default:
          "Iâ€™m a digital marketer and creative problem-solver who enjoys helping brands make sense of the online world. My work brings together strategy, creativity, and practical execution, so businesses can build a presence theyâ€™re proud of and grow with confidence.",
        maxLength: 700,
      },
      {
        key: "story2",
        label: "Story â€” paragraph 2",
        kind: "textarea",
        default:
          "I have spent most of my working life at the point where marketing meets design and engineering: campaigns that need a landing page, sites that need to rank, brands that need to look like they mean it. That overlap is where most projects quietly succeed or fail, and it is where I am most useful.",
        maxLength: 700,
      },
      {
        key: "story3",
        label: "Story â€” paragraph 3",
        kind: "textarea",
        default:
          "I work with a small number of clients at a time, on purpose. It means I can be honest about scope, direct about what will not work, and still be around when the thing launches.",
        maxLength: 700,
      },
      {
        key: "image",
        label: "About image",
        kind: "image",
        default: "",
        maxLength: 20,
        help: "Shown beside the story. Leave empty to keep the quote card.",
      },
      {
        key: "quote",
        label: "Pull quote",
        kind: "textarea",
        default:
          "Creative thinking. Clear strategy. Work that makes a difference.",
        maxLength: 240,
      },
      {
        key: "quoteNote",
        label: "Quote caption",
        kind: "text",
        default: "The three things I check before calling any project finished.",
        maxLength: 160,
      },
    ],
  },
  {
    key: "contact",
    name: "Contact",
    path: "/contact",
    description: "Contact page heading, intro and response-time note.",
    fields: [
      {
        key: "eyebrow",
        label: "Eyebrow",
        kind: "text",
        default: "Get in touch",
        maxLength: 60,
      },
      {
        key: "heading",
        label: "Heading",
        kind: "text",
        default: "Letâ€™s talk about your next project.",
        maxLength: 140,
      },
      {
        key: "intro",
        label: "Intro paragraph",
        kind: "textarea",
        default:
          "Have a question or looking for the right support? Send me a message. Iâ€™d love to hear what youâ€™re working on.",
        maxLength: 400,
      },
      {
        key: "responseTime",
        label: "Response time note",
        kind: "text",
        default: "Within one business day",
        maxLength: 80,
      },
    ],
  },
  {
    key: "privacy-policy",
    name: "Privacy Policy",
    path: "/privacy-policy",
    description: "Last-updated date and the intro paragraph of the policy.",
    fields: [
      {
        key: "lastUpdated",
        label: "Last updated",
        kind: "text",
        default: "20 November 2026",
        maxLength: 40,
      },
      {
        key: "intro",
        label: "Intro paragraph",
        kind: "longtext",
        default:
          "This policy explains what information is collected through this website, why it is collected, and what happens to it. It is written to be read, not to be survived.",
        maxLength: 1200,
      },
    ],
  },
  {
    key: "terms",
    name: "Terms",
    path: "/terms",
    description: "Last-updated date and the intro paragraph of the terms.",
    fields: [
      {
        key: "lastUpdated",
        label: "Last updated",
        kind: "text",
        default: "20 November 2026",
        maxLength: 40,
      },
      {
        key: "intro",
        label: "Intro paragraph",
        kind: "longtext",
        default:
          "These terms set out the basis on which this website is provided and the rules that apply when you use it.",
        maxLength: 1200,
      },
    ],
  },
] as const;

const PAGE_BY_KEY = new Map<string, PageDefinition>(
  PAGE_DEFINITIONS.map((definition) => [definition.key, definition]),
);

export function pageDefinition(key: string): PageDefinition | undefined {
  return PAGE_BY_KEY.get(key);
}

/** A page's content: every declared field, resolved to a string. */
export type PageContent = Record<string, string>;

/** The default content for a page, straight from the definitions. */
export function defaultPageContent(key: string): PageContent {
  const definition = PAGE_BY_KEY.get(key);
  if (!definition) return {};
  return Object.fromEntries(
    definition.fields.map((field) => [field.key, field.default]),
  );
}

/**
 * Merge stored JSONB over the defaults.
 *
 * A stored row may predate a new field, or hold a non-string by accident. Each
 * value is checked individually so one bad field cannot blank the page.
 */
export function resolvePageContent(
  key: string,
  stored: Record<string, unknown> | null | undefined,
): PageContent {
  const resolved = defaultPageContent(key);
  if (!stored) return resolved;

  for (const field of PAGE_BY_KEY.get(key)?.fields ?? []) {
    const value = stored[field.key];
    if (typeof value === "string") {
      resolved[field.key] = value;
    }
  }

  return resolved;
}

