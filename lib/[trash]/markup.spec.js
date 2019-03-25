import markup from './markup.js';

async function test(
  sources = [['<html/>', {sourceType: 'html'}], ['export default "js";', {sourceType: 'es'}]],
) {
  await markup.ready;
  for (const [source, options] of sources) {
    const job = {source, options};
    const fragment = await markup.render(source, options);
    Object.defineProperty(job, 'fragment', {get: () => fragment});
    job.json = JSON.parse(JSON.stringify(fragment));
    job.logs = [...fragment.logs];
    job.text = String(fragment);
    console.info(job);
  }
}

test();
