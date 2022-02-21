import workerpool from 'workerpool';
import { processSource } from './processor';

workerpool.worker({
  processSource: ({ file, original, sideEffectFree }) =>
    processSource(file, original, sideEffectFree),
});
