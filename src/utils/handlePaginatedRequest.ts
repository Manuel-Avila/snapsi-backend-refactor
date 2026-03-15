import type { Request, Response } from "express";

export async function handlePaginatedRequest<T extends { id: number }>(
  req: Request,
  res: Response,
  dataKey: string,
  modelCall: (limit: number, cursor?: number) => Promise<T[]>
): Promise<void> {
  const limit = Number.parseInt(String(req.query.limit ?? "10"), 10) || 10;
  const cursorQuery = req.query.cursor;
  const cursor =
    typeof cursorQuery === "string" && cursorQuery.trim() !== ""
      ? Number.parseInt(cursorQuery, 10)
      : undefined;

  try {
    const results = await modelCall(limit, Number.isNaN(cursor as number) ? undefined : cursor);
    const nextCursor = results.length === limit ? results[results.length - 1]?.id ?? null : null;

    res.status(200).json({ [dataKey]: results, nextCursor });
  } catch (error) {
    console.error(`Error fetching ${dataKey}:`, error);
    res.status(500).json({ message: `Error fetching ${dataKey}` });
  }
}
