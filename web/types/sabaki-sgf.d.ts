declare module '@sabaki/sgf' {
  export type SgfNode = {
    id: string | number;
    data: Record<string, string[]>;
    parentId: string | number | null;
    children: SgfNode[];
  };
  export function parse(contents: string, options?: Record<string, unknown>): SgfNode[];
}
