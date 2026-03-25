type PaystackResponse = {
  reference: string;
};

type PaystackInlineOptions = {
  callback: (response: PaystackResponse) => void;
  onClose: () => void;
};

type PaystackPopType = {
  resumeTransaction?: (accessCode: string, options: PaystackInlineOptions) => void;
};

const PAYSTACK_INLINE_SRC = "https://js.paystack.co/v1/inline.js";

const hasResumeTransaction = () =>
  Boolean(
    (window as Window & { PaystackPop?: PaystackPopType }).PaystackPop
      ?.resumeTransaction,
  );

const ensurePaystackInlineReady = async (): Promise<void> => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Browser environment is required for payments.");
  }

  if (hasResumeTransaction()) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const checkReady = () => {
      if (hasResumeTransaction()) {
        resolve();
      }
    };

    const existingScript = document.querySelector(
      `script[src="${PAYSTACK_INLINE_SRC}"]`,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", checkReady, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load payment script.")),
        { once: true },
      );

      window.setTimeout(() => {
        if (hasResumeTransaction()) {
          resolve();
        } else {
          reject(new Error("Payment script loaded without inline support."));
        }
      }, 1500);
      return;
    }

    const script = document.createElement("script");
    script.src = PAYSTACK_INLINE_SRC;
    script.async = true;
    script.onload = () => {
      if (hasResumeTransaction()) {
        resolve();
      } else {
        reject(new Error("Payment script loaded without inline support."));
      }
    };
    script.onerror = () => reject(new Error("Unable to load payment script."));
    document.head.appendChild(script);
  });
};

export const launchPaystackInitializedTransaction = async (
  accessCode: string,
  authorizationUrl: string,
  options: PaystackInlineOptions,
): Promise<"inline" | "redirect"> => {
  if (!accessCode) {
    throw new Error("Payment access code is missing.");
  }

  try {
    await ensurePaystackInlineReady();

    const paystackPop = (
      window as Window & { PaystackPop?: PaystackPopType }
    ).PaystackPop;

    if (!paystackPop?.resumeTransaction) {
      throw new Error("Inline payment is not available.");
    }

    paystackPop.resumeTransaction(accessCode, options);
    return "inline";
  } catch {
    if (authorizationUrl) {
      window.location.assign(authorizationUrl);
      return "redirect";
    }

    throw new Error("Payment service unavailable. Please try again.");
  }
};
