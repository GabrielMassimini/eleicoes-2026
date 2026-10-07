// Tipos mínimos das libs de pipeline que não publicam declarações.

declare module "mapshaper" {
  const mapshaper: {
    applyCommands(commands: string, input?: Record<string, string | Buffer>): Promise<Record<string, string | Buffer>>;
  };
  export default mapshaper;
}

declare module "unzipper" {
  import type { Readable } from "node:stream";
  interface Entry {
    path: string;
    stream(): Readable;
    buffer(): Promise<Buffer>;
  }
  const unzipper: {
    Open: { buffer(data: Buffer): Promise<{ files: Entry[] }> };
  };
  export default unzipper;
}
