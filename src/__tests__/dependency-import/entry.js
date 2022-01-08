import { ESM } from 'eslint-utils';

(() => {
  // Expected inline import:
  const foo = ESM;

  return foo;
})();
