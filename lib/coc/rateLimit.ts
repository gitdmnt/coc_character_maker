const DAILY_REQUEST_LIMIT = 8000;

type D1RunMeta = {
  changes?: number;
};

type D1RunResult = {
  success: boolean;
  meta?: D1RunMeta;
};

type D1PreparedStatement = {
  bind: (...values: Array<string | number>) => {
    run: () => Promise<D1RunResult>;
  };
};

export type D1DatabaseLike = {
  prepare: (query: string) => D1PreparedStatement;
};

const utcDateBucket = (): string => new Date().toISOString().slice(0, 10);

const incrementWithinLimit = async (
  db: D1DatabaseLike,
  bucketDate: string,
  limit: number,
): Promise<boolean> => {
  const updated = await db
    .prepare(
      "UPDATE daily_usage SET count = count + 1, updated_at = CURRENT_TIMESTAMP WHERE bucket_date = ? AND count < ?",
    )
    .bind(bucketDate, limit)
    .run();

  return (updated.meta?.changes ?? 0) > 0;
};

export const consumeDailyQuota = async (
  db: D1DatabaseLike,
  limit = DAILY_REQUEST_LIMIT,
): Promise<boolean> => {
  const bucketDate = utcDateBucket();

  if (await incrementWithinLimit(db, bucketDate, limit)) {
    return true;
  }

  await db
    .prepare(
      "INSERT OR IGNORE INTO daily_usage (bucket_date, count, updated_at) VALUES (?, 0, CURRENT_TIMESTAMP)",
    )
    .bind(bucketDate)
    .run();

  return incrementWithinLimit(db, bucketDate, limit);
};
