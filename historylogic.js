// G9 · the pure rules behind the guest History list: the wording of an entry. (People who share a name are numbered by the owner's address: `num` on an entry.)
// No DOM and no network here, so tests can run it in Node.

const VERBS = {create: "added a node", delete: "removed a node", move: "moved a node", rename: "renamed a node", notes: "edited notes", media: "changed media"};

// The words for one entry: who did what, and what it touched. (Names and titles arrive already bidi-isolated from the caller.)
export function describe(e, {ownerName = ""} = {}) {
  const verb = e.undo ? "undid a change" : e.viaJoe && e.kind === "media" ? "added an image with Joe" : e.viaJoe ? `${VERBS[e.kind] || "changed something"} with Joe` : VERBS[e.kind] || "changed something";
  const title = e.title ? e.title : "Untitled";
  const what = e.kind === "delete" ? "A node was removed from the shared area" : e.kind === "rename" ? `Now named “${title}”` : e.kind === "create" ? `New node “${title}”` : e.kind === "move" ? `${title} was moved` : e.kind === "media" ? `${title}: media` : `${title}: notes`;
  return {verb, what, who: e.self ? "You" : e.owner ? ownerName || "The owner" : e.name || "Someone"};
}
