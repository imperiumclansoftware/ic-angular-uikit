import { API } from '../generated/api';

/** API complète, importée uniquement par les pages chargées à la demande (hors du bundle initial). */
const GUIDE_SLUGS = new Set(['core', 'validation']);
export const COMPONENT_GROUPS = API.filter((group) => !GUIDE_SLUGS.has(group.slug));
export const CORE_GROUP = API.find((group) => group.slug === 'core');
export const VALIDATION_GROUP = API.find((group) => group.slug === 'validation');
