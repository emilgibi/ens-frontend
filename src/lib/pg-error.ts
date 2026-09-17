// Place at: src/lib/pg-error.ts
//
// drizzle-orm wraps the underlying node-postgres error in `.cause` and its
// own top-level `.message` is just "Failed query: <sql>\nparams: <params>"
// — useful for seeing what was attempted, but it hides the actual Postgres
// error (constraint violation, undefined column/enum, type mismatch, etc.)
// that explains WHY it failed. This pulls those real details out so they
// show up in API responses instead of being silently dropped.
export function pgErrorDetails(e: any) {
  const cause = e?.cause ?? e;
  return {
    error: e?.message,
    pgCode: cause?.code,           // e.g. '23503' FK violation, '42P01' undefined table, '22P02' invalid input, '23502' not-null violation, '42704' undefined enum/type
    pgDetail: cause?.detail,
    pgHint: cause?.hint,
    pgConstraint: cause?.constraint,
    pgTable: cause?.table,
    pgColumn: cause?.column,
  };
}
