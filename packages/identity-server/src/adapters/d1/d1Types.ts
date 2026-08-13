export interface D1ResultPort<Row = unknown> {
  readonly results: Row[];
  readonly success: boolean;
  readonly meta: { readonly changes: number };
}

export interface D1PreparedStatementPort {
  bind(...values: unknown[]): D1PreparedStatementPort;
  first<Row = Record<string, unknown>>(): Promise<Row | null>;
  all<Row = Record<string, unknown>>(): Promise<D1ResultPort<Row>>;
  run<Row = Record<string, unknown>>(): Promise<D1ResultPort<Row>>;
}

export interface D1DatabasePort {
  prepare(query: string): D1PreparedStatementPort;
  batch(statements: D1PreparedStatementPort[]): Promise<D1ResultPort[]>;
}
