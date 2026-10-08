import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data";

export default async function Me() {
  const viewer = await getViewer();
  redirect(viewer ? `/u/${viewer.username}` : "/login?next=/me");
}
