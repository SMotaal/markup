export const run = async (...jobs) => {
  const results = new Array(jobs.length);
  let index = 0;

  for (const job of jobs) {
    const result = {logs: []};

    if (job.arguments && job.arguments.length) {
      let mode;
      const [source, options, defaults] = job.arguments;
      source == null || (result.source = source);
      options == null || ({mode, ...result.options} = options);
      defaults == null || (result.defaults = defaults);
    }

    if (job.tokens != null) {
      const tokens = job.tokens;
      Object.defineProperty(result, 'tokens', {get: () => tokens});
      tokens.logs && tokens.logs.length && result.logs.push(...tokens.logs);
    }

    if (job.fragment != null) {
      const fragment = job.fragment;
      Object.defineProperty(result, 'fragment', {get: () => fragment});
      result.json = JSON.parse(JSON.stringify(fragment));
      result.text = String(fragment);
      fragment.logs && fragment.logs.length && result.logs.push(...fragment.logs);
    }

    results[index++] = result;
  }

  return results;
};

export const setup = async () => run;

export default setup;
