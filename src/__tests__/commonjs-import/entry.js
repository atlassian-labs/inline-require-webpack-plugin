import { Foo } from './foo';

(() => {
  // Expected inline import:
  const foo = Foo();

  return foo;
})();
