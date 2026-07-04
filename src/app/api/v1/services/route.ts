import { jsonWithCors, optionsResponse } from "@/lib/cors";

export async function GET(request: Request) {
  return jsonWithCors(
    {
      fua: {
        enabled: true,
        modes: ["door", "station", "mamafua"],
        mamafua: {
          enabled: true,
          label: "Mama Fua visit",
          description: "Rider brings a cleaner with equipment — pick tasks on-site",
          tasksPath: "/api/v1/laundry/mamafua/tasks",
        },
      },
      sakaKeja: { enabled: true },
      rides: { enabled: false, label: "Coming soon" },
    },
    request,
  );
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
