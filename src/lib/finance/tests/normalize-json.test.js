import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeJsonPayload } from '../../normalize-json.js';

test('undefined object fields are omitted and undefined array entries become null', () => {
  assert.deepEqual(normalizeJsonPayload({
    omitted: undefined,
    nested: { omitted: undefined, kept: 1 },
    list: [undefined, { omitted: undefined, kept: 2 }],
  }), {
    nested: { kept: 1 },
    list: [null, { kept: 2 }],
  });
});
