import type { CoreAtlasId } from './index.js';

export declare const COLLECTION_HEROES: Readonly<Record<CoreAtlasId, readonly string[]>>;
export declare function getCollectionHeroes(id: CoreAtlasId | string): readonly string[];
