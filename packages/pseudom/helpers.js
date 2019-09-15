export const {encodeEntity, encodeEntities} = (() => {
  const encodeEntity = entity => `&#${entity.charCodeAt(0)};`;

  Object.freeze(encodeEntity);

  const EntityMatcher = /[\u00A0-\u9999<>\&]/g;

  const encodeEntities = string => EntityMatcher[Symbol.replace](string, encodeEntity);

  Object.freeze(encodeEntities);

  return {encodeEntity, encodeEntities};
})();
