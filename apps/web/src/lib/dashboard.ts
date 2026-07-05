import {
  getPersistence,
  localSyntheticActor,
  localSyntheticWorkspaceId,
} from "@/lib/persistence";

export function getSyntheticDashboard() {
  return getPersistence().getDashboardSnapshot(
    localSyntheticActor,
    localSyntheticWorkspaceId,
  );
}
