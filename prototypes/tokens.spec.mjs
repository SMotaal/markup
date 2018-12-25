import {Token, Matcher, Kind, UnknownKind, TextKind} from './token.mjs';
import {Tokens, Position} from './tokens.mjs';

(source => {
  // const a = new Position();
  // const b = new Position();
  // console.log({a, b});
  // a.before(b);
  // console.log({a, b});

  const SeparatorKind = Kind('separator');
  const EnclosureKind = Kind('enclosure');
  const OperatorKind = Kind('operator');
  const PunctuatorKind = Kind('punctuator');

  const expression = /(.*?)(?:(([\p{Z}\s\n]+)|([\p{Ps}\p{Pe}\p{Pi}\p{Pf}'"`])|([\p{Sm}*&|^-]+)|(\p{Po}|\B(?![_-])\p{P}\B))|$)/gu;
  const map = {
    [SeparatorKind]: 'ᵂᴴ',
    [EnclosureKind]: 'ᴱᴺ',
    [OperatorKind]: 'ᴼᴾ',
    [PunctuatorKind]: 'ᴾᵁ',
    [UnknownKind]: 'ᵁᴺ',
  };
  const groups = Object.getOwnPropertySymbols(map);
  const matcher = new Matcher(expression, undefined, groups);

  const tokens = new Tokens();
  for (const token of matcher.tokenize(source)) tokens.push(token);
  for (const position of tokens) console.log(position);
  console.log(tokens);

  // console.log({tokens});

  // console.log({matcher, Matcher});
  // console.log([...matcher.tokenize(source)]);
  // // for (const token of matcher.tokenize(source)) console.log(token);
  // console.log(matcher.debug(source, map));
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
