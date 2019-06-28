import {Contexts} from './contexts.js';
import {TokenSynthesizer} from './synthesizer.js';

/** Tokenizer for a single mode (language) */
export class Tokenizer {
  constructor(mode, defaults) {
    this.mode = mode;
    this.defaults = defaults || this.constructor.defaults || undefined;
  }

  initializeContext(context) {
    context.createToken || (context.createToken = new TokenSynthesizer(context).create);
    return context;
  }

  /** Token generator from source using tokenizer.mode (or defaults.mode) */
  *tokenize(source, state = {}) {
    let done, context;
    let previousToken, lastToken, parentToken;
    let {match, index = 0, flags} = state;
    const contexts = (state.contexts = new Contexts(this));
    const {tokenize = (state.tokenize = text => [{text}])} = state;
    const rootContext = (context = state.lastContext = contexts.root);
    const top = {type: 'top', text: '', offset: index};

    done = !(state.source = source);

    while (!done) {
      const {closer, matcher, createToken, forming = true} = context;

      // Current contextual hint (syntax or hint)
      const hint = contexts.hint;

      while (state.lastContext === (state.lastContext = context)) {
        let nextToken;

        const lastIndex = (state.index > -1 && state.index) || 0;

        matcher.lastIndex = lastIndex;
        match = state.match = matcher.exec(source);
        done = index === (index = state.index = matcher.lastIndex) || !match;

        if (done) break;

        // Current contextual match
        const {0: text, 1: whitespace, 2: sequence, index: offset} = match;

        // Current quasi-contextual fragment
        const pre = source.slice(lastIndex, offset);
        pre &&
          ((nextToken = createToken({
            type: 'pre',
            text: pre,
            offset: lastIndex,
            previous: previousToken,
            parent: parentToken,
            hint,
            last: lastToken,
          })),
          yield (previousToken = nextToken));

        // Current contextual fragment
        const type = (whitespace && 'whitespace') || (sequence && 'sequence') || 'text';
        nextToken = createToken({
          type,
          text,
          offset,
          previous: previousToken,
          parent: parentToken,
          hint,
          last: lastToken,
        });

        let after;

        // Current contextual punctuator (from sequence)
        const closing =
          closer && (closer.test ? closer.test(text) : closer === text || (whitespace && whitespace.includes(closer)));

        // Update context
        (closing && ({context, after, parentToken = top} = contexts.close(nextToken, state, context))) ||
          (nextToken.punctuator &&
            context.punctuator !== 'comment' &&
            ({context, after, parentToken = top} = contexts.open(nextToken, state, context)));

        // Current contextual tail token (yield from sequence)
        yield (previousToken = nextToken);

        // Next reference to last contextual sequence token
        nextToken && !whitespace && forming && (lastToken = nextToken);

        if (after) {
          let tokens, createToken, nextIndex;
          let hintTokenType, hintPrefix, hintSuffix;

          if (after.syntax) {
            const {syntax, offset, index} = after;
            let body = index > offset && source.slice(offset, index - 1);
            if (body && body.length > 0) {
              (tokens = tokenize(`${body}\n`, {options: {sourceType: syntax}}, this.defaults)), (nextIndex = index);
              // Workaround for lost token for script/style tags in in-html
              // TODO: Investigate lost token in script/style tags in in-html
              tokens.lastOffset = body.length;
              hintSuffix = `${syntax}-in-${rootContext.syntax}`;
              createToken = token => ((token.hint = `${(token.hint && `${token.hint} `) || ''}${hintSuffix}`), token);
              // console.log({after, body, tokens, hintSuffix, createToken});
            }
          } else if (after.length) {
            hintTokenType = 'code';
            hintPrefix = contexts.hint ? `${contexts.hint} ` : '';
            createToken = token =>
              context.createToken(((token.hint = `${hintPrefix}${token.type || hintTokenType}`), token));
            (tokens = after).end > state.index && (nextIndex = after.end);
          }

          if (tokens) {
            for (const next of tokens) {
              // Workaround for lost token for script/style tags in in-html
              // TODO: Investigate lost token in script/style tags in in-html
              // tokens.lastOffset > 0 && console.log('next: %o', next, [tokens.lastOffset, next.offset]);

              next.offset > tokens.lastOffset
                ? tokens.return()
                : (previousToken && ((next.previous = previousToken).next = next),
                  createToken && createToken(next),
                  yield (previousToken = next));
            }
            nextIndex > state.index && (state.index = nextIndex);
          }
        }
      }
    }
    flags && flags.debug && console.info('[Tokenizer.tokenize‹state›]: %o', state);
  }
}

Object.freeze(Object.freeze(Tokenizer.prototype).constructor);
