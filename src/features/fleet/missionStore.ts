import { writable } from "svelte/store";
import type { FormationMission } from "../../lib/types";
import { world } from "../../lib/api/mock/worldSync";

// Mission metadata is shared cross-tab the same way vehicles/contacts are,
// so a mission opened in a new tab still knows what it's looking at.
function createMissionStore() {
  const { subscribe, set } = writable<Record<string, FormationMission>>({});
  let unsubscribe: (() => void) | undefined;

  function init() {
    unsubscribe = world.onMissions((missions) => {
      set(Object.fromEntries(missions.map((m) => [m.id, m])));
    });
  }

  function destroy() {
    unsubscribe?.();
  }

  function addMission(mission: FormationMission) {
    world.addMission(mission);
  }

  function updateMission(mission: FormationMission) {
    world.updateMission(mission);
  }

  function removeMission(missionId: string) {
    world.removeMission(missionId);
  }

  return { subscribe, init, destroy, addMission, updateMission, removeMission };
}

export const missionStore = createMissionStore();
