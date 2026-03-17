import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createInitialSkills } from "@/lib/coc/constants";
import { generateCharacterProfile } from "@/lib/coc/generateCharacter";
import { consumeDailyQuota, D1DatabaseLike } from "@/lib/coc/rateLimit";

type ApiErrorResponse = {
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

const toErrorResponse = (
  status: number,
  code: string,
  message: string,
  requestId: string,
  details?: string,
) =>
  NextResponse.json<ApiErrorResponse>(
    {
      error: {
        code,
        message,
        requestId,
        details,
      },
    },
    { status },
  );

const classifyError = (
  error: unknown,
): {
  status: number;
  code: string;
  message: string;
  details?: string;
} => {
  const extractUpstreamMessage = (rawMessage: string): string => {
    try {
      const parsed = JSON.parse(rawMessage) as {
        error?: { message?: string };
      };
      return parsed.error?.message ?? rawMessage;
    } catch {
      return rawMessage;
    }
  };

  if (error instanceof SyntaxError) {
    return {
      status: 502,
      code: "UPSTREAM_INVALID_JSON",
      message: "生成AIの応答形式が不正でした。時間をおいて再試行してください。",
    };
  }

  if (error instanceof Error) {
    if (error.message.includes("GOOGLE_AI_API_KEY is not configured")) {
      return {
        status: 500,
        code: "CONFIG_GOOGLE_AI_API_KEY_MISSING",
        message: "サーバー設定に不備があります。管理者へ連絡してください。",
      };
    }

    if (
      error.message.includes("No text in Gemini response") ||
      error.message.includes("Invalid JSON format in Gemini response")
    ) {
      return {
        status: 502,
        code: "UPSTREAM_RESPONSE_INVALID",
        message:
          "生成AIから有効なデータを取得できませんでした。時間をおいて再試行してください。",
      };
    }

    if (error.message.toLowerCase().includes("api key")) {
      return {
        status: 502,
        code: "UPSTREAM_AUTH_FAILED",
        message:
          "生成AIサービスの認証に失敗しました。管理者へ連絡してください。",
        details: extractUpstreamMessage(error.message),
      };
    }

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

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return toErrorResponse(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Content-Type は application/json を指定してください。",
        requestId,
      );
    }

    const body = await getRequestBody(request);
    if (Object.keys(body).length === 0) {
      return toErrorResponse(
        400,
        "INVALID_REQUEST_BODY",
        "JSONリクエストボディが空か不正です。",
        requestId,
      );
    }

    const playerName =
      typeof body.playerName === "string" ? body.playerName : "";

    if (typeof body.year !== "number" || !Number.isInteger(body.year)) {
      return toErrorResponse(
        400,
        "INVALID_YEAR",
        "year は整数で指定してください。",
        requestId,
      );
    }

    if (body.year < 1900 || body.year > 2300) {
      return toErrorResponse(
        400,
        "YEAR_OUT_OF_RANGE",
        "year は 1900 から 2300 の範囲で指定してください。",
        requestId,
      );
    }

    if (
      typeof body.location !== "string" ||
      body.location.trim().length === 0
    ) {
      return toErrorResponse(
        400,
        "INVALID_LOCATION",
        "location は空でない文字列で指定してください。",
        requestId,
      );
    }

    const year = Number.isInteger(body.year)
      ? (body.year as number)
      : new Date().getUTCFullYear();
    const location =
      typeof body.location === "string" && body.location.trim().length > 0
        ? body.location
        : "日本";

    const { env } = getCloudflareContext();
    const db = (env as Record<string, unknown>).DB as
      | D1DatabaseLike
      | undefined;

    if (!db) {
      return toErrorResponse(
        500,
        "D1_BINDING_MISSING",
        "D1の設定が見つかりません。",
        requestId,
      );
    }

    const allowed = await consumeDailyQuota(db, 8000);
    if (!allowed) {
      return toErrorResponse(
        429,
        "DAILY_LIMIT_REACHED",
        "本日の生成上限(8000回)に達しました。",
        requestId,
      );
    }

    const result = await generateCharacterProfile(
      { year, location },
      playerName,
      createInitialSkills(),
    );

    return NextResponse.json(result);
  } catch (error) {
    const classified = classifyError(error);
    console.error("generate API error", { requestId, error });
    return toErrorResponse(
      classified.status,
      classified.code,
      classified.message,
      requestId,
      classified.details,
    );
  }
}
