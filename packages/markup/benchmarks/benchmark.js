import setup from './tasks/tasks.js';
// import markup from '../lib/markup.js';
import * as markup from '../../tokenizer/browser/experimental.es.extended.js';

(async (
  sources = [
    ['<html/>', {sourceType: 'html'}],
    ['export default "js";', {sourceType: 'es'}],
  ],
) => {
  const {tokenize, render, capture} = await setup(markup);
  // const jobs = await render(... sources);
  const results = await capture(...(await render(...sources)), ...(await tokenize(...sources)));
  console.log(...results);
  results.jobs && (console.group('jobs'), console.log(...results), console.groupEnd('jobs'));
})();
