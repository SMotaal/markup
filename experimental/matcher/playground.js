import bootstrap from './matcher.js';
import {Matcher} from '../../../modules/matcher/matcher.js';

const definitions = {
  default: () => [
    entity => Matcher.sequence`
      (${entity('text')}\S+)|
      (${entity('break')}\n)|
      (${entity('whitespace')}[ \t]+)
    `,
    'gui',
  ],
  multiline: () => [
    entity => Matcher.sequence`
      ^(${entity('inset')}^(${entity('whitespace')}[ \t]+))|
      (${entity('text')}\S+)|
      (${entity('break')}\n)|
      (${entity('whitespace')}[ \t]+)
    `,
    'mgui',
  ],
};

export default bootstrap(Matcher.define(...definitions.default()));
