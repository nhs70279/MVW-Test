import { calcFP } from '../src/utils/fingerprint';

test('calcFP generates expected fingerprint', async () => {
  await expect(calcFP('TestInput')).resolves.toBe(
    '4LdZ8zau/S/1sxU08j2Yzt/cpAeFC6XGyZUCxCREGrc='
  );
});
