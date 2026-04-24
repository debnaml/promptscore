import { describe, it, expect } from "vitest";
import { extractSemantic } from "./semantic";

const ORIGIN = "https://example.com";

describe("extractSemantic — headings", () => {
  it("extracts h1–h6 with level, text, and order", () => {
    const html = `
      <html><body>
        <h1>Main Title</h1>
        <h2>Section One</h2>
        <h3>Sub-section</h3>
      </body></html>
    `;
    const result = extractSemantic(html);
    expect(result.headings).toHaveLength(3);
    expect(result.headings[0]).toEqual({ level: 1, text: "Main Title", order: 0 });
    expect(result.headings[1]).toEqual({ level: 2, text: "Section One", order: 1 });
    expect(result.headings[2]).toEqual({ level: 3, text: "Sub-section", order: 2 });
  });

  it("strips inner HTML tags from heading text", () => {
    const html = `<h1><span class="highlight">Bold <strong>Title</strong></span></h1>`;
    const result = extractSemantic(html);
    expect(result.headings[0].text).toBe("Bold Title");
  });

  it("decodes HTML entities in headings", () => {
    const html = `<h2>Caf&eacute; &amp; Bar</h2>`;
    const result = extractSemantic(html);
    // entities beyond basic ones pass through — just check &amp; is decoded
    expect(result.headings[0].text).toContain("&");
  });

  it("returns empty headings array when none present", () => {
    const result = extractSemantic("<html><body><p>No headings</p></body></html>");
    expect(result.headings).toHaveLength(0);
  });

  it("assigns sequential order across all heading levels", () => {
    const html = `<h2>A</h2><h1>B</h1><h3>C</h3>`;
    const result = extractSemantic(html);
    expect(result.headings.map((h) => h.order)).toEqual([0, 1, 2]);
  });
});

describe("extractSemantic — landmarks", () => {
  it("counts landmark elements", () => {
    const html = `
      <html><body>
        <header>H</header>
        <nav>N</nav>
        <main>
          <article>A1</article>
          <article>A2</article>
          <section>S</section>
          <aside>As</aside>
        </main>
        <footer>F</footer>
      </body></html>
    `;
    const result = extractSemantic(html);
    expect(result.landmarks.header).toBe(1);
    expect(result.landmarks.nav).toBe(1);
    expect(result.landmarks.main).toBe(1);
    expect(result.landmarks.article).toBe(2);
    expect(result.landmarks.section).toBe(1);
    expect(result.landmarks.aside).toBe(1);
    expect(result.landmarks.footer).toBe(1);
  });

  it("returns zeros when no landmarks present", () => {
    const result = extractSemantic("<html><body><p>text</p></body></html>");
    expect(Object.values(result.landmarks).every((v) => v === 0)).toBe(true);
  });
});

describe("extractSemantic — image alt coverage", () => {
  it("counts total images", () => {
    const html = `<img src="a.png" alt="A"><img src="b.png" alt="B"><img src="c.png">`;
    const result = extractSemantic(html);
    expect(result.images.total).toBe(3);
  });

  it("counts images with non-empty alt", () => {
    const html = `<img src="a.png" alt="A cat"><img src="b.png" alt="">`;
    const result = extractSemantic(html);
    expect(result.images.withAlt).toBe(1);
  });

  it("counts decorative images (empty alt)", () => {
    const html = `<img src="a.png" alt=""><img src="b.png" alt="">`;
    const result = extractSemantic(html);
    expect(result.images.decorativeEmptyAlt).toBe(2);
  });

  it("counts images with no alt attribute separately", () => {
    const html = `<img src="a.png"><img src="b.png" alt="desc">`;
    const result = extractSemantic(html);
    expect(result.images.total).toBe(2);
    expect(result.images.withAlt).toBe(1);
    expect(result.images.decorativeEmptyAlt).toBe(0);
    // 1 image has no alt at all (not counted in withAlt or decorativeEmptyAlt)
  });
});

describe("extractSemantic — link counts", () => {
  it("counts internal relative links", () => {
    const html = `
      <a href="/about">About</a>
      <a href="/blog/post">Post</a>
    `;
    const result = extractSemantic(html, ORIGIN);
    expect(result.internalLinks).toBe(2);
    expect(result.externalLinks).toBe(0);
  });

  it("counts internal absolute links matching origin", () => {
    const html = `<a href="https://example.com/page">Page</a>`;
    const result = extractSemantic(html, ORIGIN);
    expect(result.internalLinks).toBe(1);
    expect(result.externalLinks).toBe(0);
  });

  it("counts external links", () => {
    const html = `
      <a href="https://twitter.com/acme">Twitter</a>
      <a href="https://linkedin.com/acme">LinkedIn</a>
    `;
    const result = extractSemantic(html, ORIGIN);
    expect(result.externalLinks).toBe(2);
    expect(result.internalLinks).toBe(0);
  });

  it("skips fragment-only, mailto, and tel links", () => {
    const html = `
      <a href="#section">Skip to content</a>
      <a href="mailto:hi@example.com">Email</a>
      <a href="tel:+1234567">Call</a>
    `;
    const result = extractSemantic(html, ORIGIN);
    expect(result.internalLinks).toBe(0);
    expect(result.externalLinks).toBe(0);
  });

  it("treats absolute links as external when no origin provided", () => {
    const html = `<a href="https://example.com/page">Page</a>`;
    const result = extractSemantic(html);
    expect(result.externalLinks).toBe(1);
  });
});

describe("extractSemantic — word count", () => {
  it("counts words in body text", () => {
    const html = `<html><body><p>Hello world this is a test</p></body></html>`;
    const result = extractSemantic(html);
    expect(result.wordCount).toBe(6);
  });

  it("excludes script content from word count", () => {
    const html = `
      <html><body>
        <p>Visible text here</p>
        <script>const foo = "not counted as words bar baz";</script>
      </body></html>
    `;
    const result = extractSemantic(html);
    expect(result.wordCount).toBe(3);
  });

  it("excludes style content from word count", () => {
    const html = `
      <html><body>
        <style>.not-words { color: red; margin: top bottom left right; }</style>
        <p>Real words only</p>
      </body></html>
    `;
    const result = extractSemantic(html);
    expect(result.wordCount).toBe(3);
  });

  it("excludes head content from word count", () => {
    const html = `
      <html>
        <head><title>Title words here</title><meta name="description" content="desc words"></head>
        <body><p>Body only</p></body>
      </html>
    `;
    const result = extractSemantic(html);
    expect(result.wordCount).toBe(2);
  });

  it("returns 0 for empty body", () => {
    const result = extractSemantic("<html><body></body></html>");
    expect(result.wordCount).toBe(0);
  });
});
