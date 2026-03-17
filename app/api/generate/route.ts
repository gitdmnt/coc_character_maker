import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createInitialSkills } from "@/lib/coc/constants";
import { generateCharacterProfile } from "@/lib/coc/generateCharacter";
import { consumeDailyQuota, D1DatabaseLike } from "@/lib/coc/rateLimit";

// ─── 型 ────────────────────────────────────────────────────────────────────

type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: string;
  };
};

type GenerateRequestBody = {
  playerName?: string;
  year?: number;
  location?: string;
};

export type SseTaskStart = {
  type: "taskStart";
  step: string;
  index: number;
  total: number;
};
export type SseTaskEnd = {
  type: "taskEnd";
  step: string;
  index: number;
  total: number;
  durationMs: number;
};
export type SseError = {
  type: "error";
  code: string;
  message: string;
  requestId: string;
  details?: string;
};
export type SseEvent =
  | SseTaskStart
  | SseTaskEnd
  | SseError
  | { type: "result"; [key: string]: unknown };

// ─── ヘルパー ─────────────────────────────────────────────────────────────

const jsonErrorResponse = (
  status: number,
  code: string,
  message: string,
  requestId: string,
  details?: string,
): Response =>
  new Response(
    JSON.stringify({
      error: { code, message, requestId, details },
    } satisfies ApiErrorBody),
    { status, headers: { "Content-Type": "application/json" } },
  );

const classifyError = (
  error: unknown,
): { status: number; code: string; message: string; details?: string } => {
  const extractUpstreamMessage = (raw: string): string => {
    try {
      const p = JSON.parse(raw) as { error?: { message?: string } };
      return p.error?.message ?? raw;
    } catch {
      return raw;
    }
  };

  if (error instanceof SyntaxError)
    return {
      status: 502,
      code: "UPSTREAM_INVALID_JSON",
      message: "生成AIの応答形式が不正でした。時間をおいて再試行してください。",
    };

  if (error instanceof Error) {
    if (error.message.includes("GOOGLE_AI_API_KEY is not configured"))
      return {
        status: 500,
        code: "CONFIG_GOOGLE_AI_API_KEY_MISSING",
        message: "サーバー設定に不備があります。管理者へ連絡してください。",
      };

    if (
      error.message.includes("No text in Gemini response") ||
      error.message.includes("Invalid JSON format in Gemini response")
    )
      return {
        status: 502,
        code: "UPSTREAM_RESPONSE_INVALID",
        message:
          "生成AIから有効なデータを取得できませんでした。時間をおいて再試行してください。",
      };

    if (error.message.toLowerCase().includes("api key"))
      return {
        status: 502,
        code: "UPSTREAM_AUTH_FAILED",
        message:
          "生成AIサービスの認証に失敗しました。管理者へ連絡してください。",
        details: extractUpstreamMessage(error.message),
      };

    return {
      status: 500,
      code: "INTERNAL_SERVER_ERROR",
      message:
        "サーバー内部で処理に失敗しました。時間をおいて再試行してください。",
      details: error.message,
    };
  }

  return {
    status: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "サーバー内部で予期しないエラーが発生しました。",
  };
};

const getRequestBody = async (
  request: NextRequest,
): Promise<GenerateRequestBody> => {
  try {
    return (await request.json()) as GenerateRequestBody;
  } catch {
    return {};
  }
};

// ─── POST ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  // バリデーション（失敗時は通常のJSONエラーを返す）
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return jsonErrorResponse(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type は application/json を指定してください。",
      requestId,
    );
  }

  const body = await getRequestBody(request);
  if (Object.keys(body).length === 0) {
    return jsonErrorResponse(
      400,
      "INVALID_REQUEST_BODY",
      "JSONリクエストボディが空か不正です。",
      requestId,
    );
  }

  const playerName = typeof body.playerName === "string" ? body.playerName : "";

  if (typeof body.year !== "number" || !Number.isInteger(body.year)) {
    return jsonErrorResponse(
      400,
      "INVALID_YEAR",
      "year は整数で指定してください。",
      requestId,
    );
  }

  if (typeof body.location !== "string" || body.location.trim().length === 0) {
    return jsonErrorResponse(
      400,
      "INVALID_LOCATION",
      "location は空でない文字列で指定してください。",
      requestId,
    );
  }

  const year = body.year;
  const location = body.location;

  const { env } = getCloudflareContext();
  const db = (env as Record<string, unknown>).DB as D1DatabaseLike | undefined;

  if (!db) {
    return jsonErrorResponse(
      500,
      "D1_BINDING_MISSING",
      "D1の設定が見つかりません。",
      requestId,
    );
  }

  const allowed = await consumeDailyQuota(db, 8000);
  if (!allowed) {
    return jsonErrorResponse(
      429,
      "DAILY_LIMIT_REACHED",
      "本日の生成上限(8000回)に達しました。",
      requestId,
    );
  }

  // ─── SSEストリーミング ──────────────────────────────────────────────────

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  const emit = (data: unknown): Promise<void> =>
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

  // バックグラウンドで生成を実行し、進捗をストリームに流す
  void (async () => {
    // クロージャ内での let 再代入による型ナローイング破壊を避けるため
    // オブジェクトのプロパティとして管理する
    const state = {
      step: "",
      index: 0,
      total: 0,
      startMs: 0,
      active: false,
    };

    const onProgress = async (
      step: string,
      index: number,
      total: number,
    ): Promise<void> => {
      const now = Date.now();
      if (state.active) {
        await emit({
          type: "taskEnd",
          step: state.step,
          index: state.index,
          total: state.total,
          durationMs: now - state.startMs,
        } satisfies SseTaskEnd);
      }
      state.step = step;
      state.index = index;
      state.total = total;
      state.startMs = now;
      state.active = true;
      await emit({
        type: "taskStart",
        step,
        index,
        total,
      } satisfies SseTaskStart);
    };

    try {
      const result = await generateCharacterProfile(
        { year, location },
        playerName,
        createInitialSkills(),
        onProgress,
      );

      if (state.active) {
        await emit({
          type: "taskEnd",
          step: state.step,
          index: state.index,
          total: state.total,
          durationMs: Date.now() - state.startMs,
        } satisfies SseTaskEnd);
      }

      await emit({ type: "result", ...result });
    } catch (error) {
      console.error("generate API error", { requestId, error });
      const c = classifyError(error);
      await emit({
        type: "error",
        code: c.code,
        message: c.message,
        requestId,
        details: c.details,
      } satisfies SseError);
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
