import Foo from './foo';
import { Bar, BAZ } from './bar';

(() => {
  // Expected inline import:
  const foo = Foo();
  // Expected inline import:
  const bar = new Bar();

  return foo + bar + BAZ;
})();
