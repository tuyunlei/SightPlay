import { describe, expect, it } from 'vitest';

import { parseUnknownJson, readUnknownJson } from './codec';

describe('unknown JSON admission', () => {
  it('keeps parsed values unknown and fails malformed input closed', async () => {
    await expect(readUnknownJson({ json: async () => ({ value: 1 }) })).resolves.toEqual({
      value: 1,
    });
    await expect(
      readUnknownJson({
        json: async () => {
          throw new SyntaxError('malformed');
        },
      })
    ).resolves.toBeNull();
    expect(parseUnknownJson('{"value":1}')).toEqual({ value: 1 });
    expect(parseUnknownJson('{')).toBeNull();
  });
});
