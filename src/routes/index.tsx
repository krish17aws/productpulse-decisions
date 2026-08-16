import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProductPulse AI — Autonomous Product Decision Room" },
      {
        name: "description",
        content:
          "Detect product metric anomalies, run parallel AI investigations and approve product actions in one decision room.",
      },
      { property: "og:title", content: "ProductPulse AI — Autonomous Product Decision Room" },
      {
        property: "og:description",
        content:
          "Deterministic anomaly detection, agent investigations, PM approval and experiment monitoring.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/command-center" });
  },
});
