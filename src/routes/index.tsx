import { createFileRoute } from "@tanstack/react-router";
import { Wizard } from "@/components/wizard/Wizard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vehicle Finance Pre-Qualification" },
      { name: "description", content: "Check what you qualify for in minutes with a soft credit check that won't affect your score." },
      { property: "og:title", content: "Vehicle Finance Pre-Qualification" },
      { property: "og:description", content: "Check what you qualify for in minutes with a soft credit check that won't affect your score." },
    ],
  }),
  component: Index,
});

function Index() {
  return <Wizard />;
}
