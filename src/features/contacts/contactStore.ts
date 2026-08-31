import { writable } from "svelte/store";
import type { Contact } from "../../lib/types";
import { createContactSource } from "../../lib/api/factory";

function createContactStore() {
  const { subscribe, set } = writable<Contact[]>([]);
  const source = createContactSource();

  function init() {
    source.onUpdate((contacts) => set(contacts));
    source.connect();
  }

  function destroy() {
    source.disconnect();
  }

  return { subscribe, init, destroy };
}

export const contactStore = createContactStore();
