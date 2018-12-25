import {SourceText} from '../extensions/lib/source-text.mjs';

(async () => {
  let sourceText, source, body;
  console.log(
    '%O -> %o -> %O',
    (source = 'source text'),
    (sourceText = new SourceText(source)),
    (await sourceText.text()).length,
  );
  console.log(
    '%O -> %o -> %O',
    (source = (body = () => [Promise.resolve('source text')])()),
    (sourceText = new SourceText(source)),
    (await sourceText.text()).length,
  );
  {
    const n = 1000000;
    body = () => new Array(n).fill(Promise.resolve('source text'));

    {
      source = body()[Symbol.iterator]();
      const timer = `new SourceText([… × ${n}]).text()`;
      console.time(timer);
      console.log('%O -> %O -> %O', source, (sourceText = new SourceText(source)), (await sourceText.text()).length);
      console.timeEnd(timer);
    }
    {
      source = body();
      const timer = `Promise.all([… × ${n}]).join('')`;
      console.time(timer);
      console.log((await Promise.all(source)).join('').length);
      console.timeEnd(timer);
    }
  }
  // console.log(
  //   '%O => %O => %O',
  //   (source = body()[Symbol.iterator]()),
  //   (sourceText = new SourceText(source)),
  //   (await sourceText.text()).length,
  // );
})();
