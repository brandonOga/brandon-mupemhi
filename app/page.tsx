import HomeClient from "./HomeClient";
import { getPublishedProjects } from "@/lib/projects";

// Re-fetch at most once a minute so newly published projects appear without a
// redeploy, while keeping the page fast and mostly static.
export const revalidate = 60;

export default async function Home() {
  const projects = await getPublishedProjects();
  return <HomeClient projects={projects} />;
}
