import { describe, expect, it } from "vitest";
import { consumeDailyQuota, D1DatabaseLike } from "./rateLimit";

const today = new Date().toISOString().slice(0, 10);

type Row = {
  count: number;
};

const createMockDb = (initialCount?: number): D1DatabaseLike => {
  const table = new Map<string, Row>();
  if (initialCount !== undefined) {
    table.set(today, { count: initialCount });
  }

  return {
    prepare: (query: string) => ({
      bind: (...values: Array<string | number>) => ({
        run: async () => {
          if (query.startsWith("UPDATE daily_usage")) {
            const bucketDate = String(values[0]);
            const limit = Number(values[1]);
            const row = table.get(bucketDate);
            if (!row || row.count >= limit) {
              return { success: true, meta: { changes: 0 } };
            }

            row.count += 1;
            return { success: true, meta: { changes: 1 } };
          }

          if (query.startsWith("INSERT OR IGNORE INTO daily_usage")) {
            const bucketDate = String(values[0]);
            if (!table.has(bucketDate)) {
              table.set(bucketDate, { count: 0 });
              return { success: true, meta: { changes: 1 } };
            }

            return { success: true, meta: { changes: 0 } };
          }

          return { success: true, meta: { changes: 0 } };
        },
      }),
    }),
  };
};

describe("consumeDailyQuota", () => {
  it("allows request when bucket does not exist", async () => {
    const db = createMockDb();

    const allowed = await consumeDailyQuota(db, 8000);

    expect(allowed).toBe(true);
  });

  it("rejects request when daily limit is reached", async () => {
    const db = createMockDb(8000);

    const allowed = await consumeDailyQuota(db, 8000);

    expect(allowed).toBe(false);
  });
});
