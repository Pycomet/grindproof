import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/trpc/routers/_app";

export const trpc = createTRPCReact<AppRouter>();

// QA design-review harness: swap the network link for in-memory fixtures.
const QA_MOCK = process.env.NEXT_PUBLIC_QA_MOCK === "1";

export const trpcClient = trpc.createClient({
  links: QA_MOCK
    ? [require("./qa-mock").qaMockLink]
    : [
        httpBatchLink({
          url: "/api",
          transformer: superjson,
        }),
      ],
});

