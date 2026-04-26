export interface HeadingEntry {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  order: number;
}

export interface LandmarkCounts {
  main: number;
  article: number;
  section: number;
  nav: number;
  header: number;
  footer: number;
  aside: number;
}

export interface ImageAltCoverage {
  total: number;
  withAlt: number;
  decorativeEmptyAlt: number;
}

export interface SemanticAnalysis {
  headings: HeadingEntry[];
  landmarks: LandmarkCounts;
  images: ImageAltCoverage;
  internalLinks: number;
  externalLinks: number;
  wordCount: number;
}

/** Strip a tag and its contents (script, style, etc.) */
function stripTagWithContent(html: string, tag: string): string {
  return html.replace(new RegExp(`<${tag}[\\s>][\\s\\S]*?<\\/${tag}>`, "gi"), " ");
}

/** Strip all HTML tags, leaving text content */
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

/** Decode common HTML entities */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/gi, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

/** Count words in plain text */
function countWords(text: string): number {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(" ").filter((w) => w.length > 0).length;
}

/** Extract text content from within a tag match (strips child tags) */
function innerText(tagContent: string): string {
  return decodeEntities(stripTags(tagContent)).replace(/\s+/g, " ").trim();
}

export function extractSemantic(html: string, siteOrigin?: string): SemanticAnalysis {
  const headings: HeadingEntry[] = [];
  let headingOrder = 0;

  // Extract headings h1–h6
  const headingRe = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let hm: RegExpExecArray | null;
  while ((hm = headingRe.exec(html)) !== null) {
    const level = parseInt(hm[1][1], 10) as HeadingEntry["level"];
    const text = innerText(hm[2]);
    if (text) {
      headings.push({ level, text, order: headingOrder++ });
    }
  }

  // Count landmark elements (opening tags only). Also includes ARIA roles
  // for sites that use <div role="..."> instead of HTML5 semantic elements.
  function countTag(tag: string): number {
    const re = new RegExp(`<${tag}[\\s>]`, "gi");
    return (html.match(re) ?? []).length;
  }
  function countRole(role: string): number {
    const re = new RegExp(`role=["']${role}["']`, "gi");
    return (html.match(re) ?? []).length;
  }

  const landmarks: LandmarkCounts = {
    main: countTag("main") + countRole("main"),
    article: countTag("article"),
    section: countTag("section"),
    nav: countTag("nav") + countRole("navigation"),
    header: countTag("header") + countRole("banner"),
    footer: countTag("footer") + countRole("contentinfo"),
    aside: countTag("aside") + countRole("complementary"),
  };

  // Image alt coverage
  let imgTotal = 0;
  let imgWithAlt = 0;
  let imgDecorativeEmptyAlt = 0;
  const imgRe = /<img([^>]*)>/gi;
  let im: RegExpExecArray | null;
  while ((im = imgRe.exec(html)) !== null) {
    imgTotal++;
    const attrs = im[1];
    const altMatch = /\balt=["']([^"']*)["']/i.exec(attrs);
    if (altMatch !== null) {
      if (altMatch[1] === "") {
        imgDecorativeEmptyAlt++;
      } else {
        imgWithAlt++;
      }
    }
  }

  // Link counts
  let internalLinks = 0;
  let externalLinks = 0;
  const linkRe = /<a[^>]+href=["']([^"']*)["'][^>]*>/gi;
  let lm: RegExpExecArray | null;
  while ((lm = linkRe.exec(html)) !== null) {
    const href = lm[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }
    if (href.startsWith("http://") || href.startsWith("https://")) {
      if (siteOrigin && href.startsWith(siteOrigin)) {
        internalLinks++;
      } else if (siteOrigin) {
        externalLinks++;
      } else {
        // No origin provided — treat absolute URLs as external
        externalLinks++;
      }
    } else {
      // Relative URL — internal
      internalLinks++;
    }
  }

  // Word count: extract main content text, stripping scripts/styles
  let bodyText = html;
  bodyText = stripTagWithContent(bodyText, "script");
  bodyText = stripTagWithContent(bodyText, "style");
  bodyText = stripTagWithContent(bodyText, "noscript");
  bodyText = stripTagWithContent(bodyText, "head");
  bodyText = stripTags(bodyText);
  bodyText = decodeEntities(bodyText);
  const wordCount = countWords(bodyText);

  return {
    headings,
    landmarks,
    images: { total: imgTotal, withAlt: imgWithAlt, decorativeEmptyAlt: imgDecorativeEmptyAlt },
    internalLinks,
    externalLinks,
    wordCount,
  };
}
