import capture from './capture.js';
import tokenize from './tokenize.js';
import render from './render.js';

export const setup = async markup => {
  await markup.ready;
  return {
    markup,
    tokenize: await tokenize(markup),
    render: await render(markup),
    capture: await capture(),
  };
};

export default setup;
