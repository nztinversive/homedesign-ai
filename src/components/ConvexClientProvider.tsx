"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;
let hasWarnedMissingConvexUrl = false;

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  if (!convexClient) {
    if (process.env.NODE_ENV !== "production" && !hasWarnedMissingConvexUrl) {
      hasWarnedMissingConvexUrl = true;
      console.warn(
        "NEXT_PUBLIC_CONVEX_URL is not set; rendering without ConvexProvider."
      );
    }
    return <>{children}</>;
  }

  return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
}
