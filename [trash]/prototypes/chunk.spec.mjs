import {Token, Matcher, Kind, UnknownKind, TextKind} from './token.mjs';
import {Chunk, Chunks} from './chunk.mjs';

(source => {
  const {log, group, groupEnd} = console;

  // const chunk = new Chunk();

  const chunks = new Chunks();
  {
    for (const line of source.split('\n')) chunks.append(`${line}\n`);
    group('chunks:'), log(`${chunks}`), log(chunks), groupEnd();
  }

  const disposed = [...chunks];
  {
    group('collapsed:'), log(`${chunks.collapse()}`), log(chunks), groupEnd();
    group('disposed:'), log(disposed), groupEnd();
  }
  const unreversed = new Chunks();
  {
    let last = disposed
      .reverse()
      .pop()
      .insert(unreversed);
    for (const chunk of disposed) last = last.before(chunk);
    group('unreversed:'), log(`${unreversed}`), log(unreversed), groupEnd();
  }
})(
  String.raw`

<body>
  <a href="http://www.server.com/#frag?q=1">email@server.com</a>
	<script type="module">
		import { X, Y, Z } from 'y';
    const [
      ${'i\u{034F}d_'}, $i\0d$$, i,
      v = (X &= !2^2) && (i += -1.0),
      y = v|0b10101111 ** 1e-6.5 + i++,
      ƒ = async () => ({})
    ] = X.length+1>=1?X[Symbol.iterator]():[];
    var /*UID*/ ${'$º1, $aº1, $·1, $a·1, a٠1, π'} = ${'`pi`'};
    var /*U_ID*/ ${
      // https://mathiasbynens.be/notes/javascript-identifiers
      String.raw`ಠ_ಠ,  ლ_ಠ益ಠ_ლ, foo\u0032bar, Hͫ̆̒̐ͣ̊̄ͯ͗͏̵̗̻̰̠̬͝ͅE̴̷̬͎̱̘͇͍̾ͦ͊͒͊̓̓̐_̫̠̱̩̭̤͈̑̎̋ͮͩ̒͑̾͋͘Ç̳͕̯̭̱̲̣̠̜͋̍O̴̦̗̯̹̼ͭ̐ͨ̊̈͘͠M̶̝̠̭̭̤̻͓͑̓̊ͣͤ̎͟͠E̢̞̮̹͍̞̳̣ͣͪ͐̈T̡̯̳̭̜̠͕͌̈́̽̿ͤ̿̅̑Ḧ̱̱̺̰̳̹̘̰́̏ͪ̂̽͂̀͠`
    };
  </script>
	<style>
		@import url('styles.css');
	</style>
</body>
`,
);
