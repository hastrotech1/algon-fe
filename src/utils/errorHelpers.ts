type ErrorObject = Record<string, unknown>;

const toReadableString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
};

const extractMessageFromPayload = (payload: unknown): string | undefined => {
  const directMessage = toReadableString(payload);
  if (directMessage) {
    return directMessage;
  }

  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const data = payload as ErrorObject;
  const topLevel =
    toReadableString(data.message) ||
    toReadableString(data.detail) ||
    toReadableString(data.error);

  if (topLevel) {
    return topLevel;
  }

  if (data.error && typeof data.error === "object") {
    const errorEntries = Object.entries(data.error as ErrorObject)
      .map(([field, value]) => {
        if (Array.isArray(value)) {
          return `${field}: ${value.map((item) => String(item)).join(", ")}`;
        }
        const readable = toReadableString(value);
        return readable ? `${field}: ${readable}` : undefined;
      })
      .filter((entry): entry is string => Boolean(entry));

    if (errorEntries.length > 0) {
      return errorEntries.join("; ");
    }
  }

  if (data.data && typeof data.data === "object") {
    const nested = extractMessageFromPayload(data.data);
    if (nested) {
      return nested;
    }
  }

  const firstNested = Object.values(data)
    .map((value) => extractMessageFromPayload(value))
    .find((value): value is string => Boolean(value));

  return firstNested;
};

export const getBackendErrorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string => {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error && error.message) {
    const parsed = extractMessageFromPayload(
      (error as unknown as { response?: { data?: unknown } }).response?.data,
    );
    if (parsed) {
      return parsed;
    }

    if (!error.message.toLowerCase().startsWith("request failed with status")) {
      return error.message;
    }
  }

  if (typeof error === "object" && error !== null) {
    const axiosLike = error as {
      response?: { data?: unknown };
      message?: string;
    };

    const parsed = extractMessageFromPayload(axiosLike.response?.data);
    if (parsed) {
      return parsed;
    }

    if (
      axiosLike.message &&
      !axiosLike.message.toLowerCase().startsWith("request failed with status")
    ) {
      return axiosLike.message;
    }
  }

  return fallback;
};
