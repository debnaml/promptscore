// robots-parser doesn't ship @types, so we declare what we need
declare module "robots-parser" {
  interface RobotsParser {
    isAllowed(url: string, userAgent?: string): boolean;
    isDisallowed(url: string, userAgent?: string): boolean;
    getSitemaps(): string[];
    getPreferredHost(): string | null;
  }
  function robotsParser(url: string, content: string): RobotsParser;
  export = robotsParser;
}
