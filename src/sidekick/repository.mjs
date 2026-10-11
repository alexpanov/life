/** Async persistence port: load(playerId), save(playerId, model), remove(playerId).
 * Domain functions mutate a working JSON model. Repositories persist snapshots.
 * A database adapter can implement this port without changing domain rules. */
import { normalizeSidekick } from './model.mjs';
export function createMemorySidekickRepository() {
  const documents=new Map();
  return {
    async load(id){return documents.has(id)?normalizeSidekick(documents.get(id)):null;},
    async save(id,model){documents.set(id,normalizeSidekick(model));},
    async remove(id){documents.delete(id);}
  };
}
/** Current browser adapter embeds the snapshot in the existing game document.
 * writeDocument may be async (remote persistence) or sync (browser save).
 * Reading other profiles and game progress remains the game repository's job. */
export function createDocumentSidekickRepository(readDocument,writeDocument) {
  return {
    async load(id){const doc=await readDocument();const p=doc.players.find(p=>p.id===id);return p?normalizeSidekick(p.sidekick,p.learning):null;},
    async save(id,model){const doc=await readDocument();const p=doc.players.find(p=>p.id===id);if(!p)throw Error('Player not found.');p.sidekick=normalizeSidekick(model);await writeDocument(doc);},
    async remove(id){const doc=await readDocument();const p=doc.players.find(p=>p.id===id);if(p){p.sidekick=normalizeSidekick(null);await writeDocument(doc);}}
  };
}
/** Replaceable generation port. Future server provider: async respond(context).
 * Local implementation does not call a model or change quests/rewards. */
export function createLocalSidekickProvider() {
  return {kind:'local',async respond(context){return {text:context.playerData.quest?.nextMove || 'Choose one useful next action.',promptVersion:context.promptVersion};}};
}
