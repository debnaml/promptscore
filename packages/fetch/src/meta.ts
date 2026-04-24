export interface HreflangAlternate {
  hreflang: string;
  href: string;
}

export interface MetaAnalysis {
  canonical: string | null;
  description: string | null;
  keywords: string | null;
  robots: string | null;
  viewport: string | null;
  og: Record<string, string>;
  twitter: Record<string, string>;
  hreflang: HreflangAlternate[];
  // Response headers of interest (populated separately if headers are passed in)
  xRobotsTag: string | null;
  contentType: string | null;
  strictTransportSecurity: string | null;
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}=["']([^"']*)["']`, "i");
  const m = re.exec(tag);
  return m ? m[1] : null;
}

/** Extract a self-closing or void tag's attribute value by attribute name */
function metaContent(tag: string): string | null {
  return attr(tag, "content");
}

export function extractMeta(
  html: string,
  responseHeaders: Record<string, string> = {}
): MetaAnalysis {
  const og: Record<string, string> = {};
  const twitter: Record<string, string> = {};
  const hreflang: HreflangAlternate[] = [];

  let canonical: string | null = null;
  let description: string | null = null;
  let keywords: string | null = null;
  let robots: string | null = null;
  let viewport: string | null = null;

  // Match all <meta ...> and <link ...> tags in <head> (stop at </head> or <body>)
  const headMatch = /^[\s\S]*?(?=<\/head>|<body[\s>])/i.exec(html);
  const head = headMatch ? headMatch[0] : html;

  // Self-closing tags: <meta .../> or <meta ...>  and <link ...>
  const tagRe = /<(meta|link)([^>]*?)\/?>(?!<\/)/gi;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(head)) !== null) {
    const tagName = m[1].toLowerCase();
    const attrs = m[2];

    if (tagName === "link") {
      const rel = attr(attrs, "rel");
      if (rel?.toLowerCase() === "canonical") {
        canonical = attr(attrs, "href");
      }
      if (rel?.toLowerCase() === "alternate") {
        const lang = attr(attrs, "hreflang");
        const href = attr(attrs, "href");
        if (lang && href) {
          hreflang.push({ hreflang: lang, href });
        }
      }
      continue;
    }

    // <meta> tags
    const name = attr(attrs, "name")?.toLowerCase() ?? null;
    const property = attr(attrs, "property")?.toLowerCase() ?? null;
    const content = metaContent(attrs);

    if (content === null) continue;

    if (name === "description") description = content;
    else if (name === "keywords") keywords = content;
    else if (name === "robots") robots = content;
    else if (name === "viewport") viewport = content;
    else if (property?.startsWith("og:")) og[property.slice(3)] = content;
    else if (name?.startsWith("og:")) og[name.slice(3)] = content;
    else if (property?.startsWith("twitter:")) twitter[property.slice(8)] = content;
    else if (name?.startsWith("twitter:")) twitter[name.slice(8)] = content;
  }

  // Normalise header keys to lowercase
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(responseHeaders)) {
    headers[k.toLowerCase()] = v;
  }

  return {
    canonical,
    description,
    keywords,
    robots,
    viewport,
    og,
    twitter,
    hreflang,
    xRobotsTag: headers["x-robots-tag"] ?? null,
    contentType: headers["content-type"] ?? null,
    strictTransportSecurity: headers["strict-transport-security"] ?? null,
  };
}
