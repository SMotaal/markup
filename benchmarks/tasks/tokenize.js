export const run = async (markup, ...inputs) => {
  const jobs = new Array(inputs.length);
  let index = 0;
  for (const input of inputs) {
    const job = {};
    const args = (job.arguments = [...(input.arguments || input)]);
    job.tokens = Array.from(markup.tokenize(...args));
    jobs[index++] = job;
  }
  return jobs;
};

export const setup = async markup => {
  await markup.ready;
  return (...inputs) => run(markup, ... inputs);
};

export default setup;
