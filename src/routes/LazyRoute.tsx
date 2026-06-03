import { Suspense } from "react";
import { PageLoader } from "@/components/ui/PageLoader";

/** Suspense wrapper for lazy-loaded route components. */
export const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);
