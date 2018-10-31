/// OPTIONS
/**
 * [Unsupported] Intended to reslot elements into nested structures derived
 * from relationships of the tokens with arguable performance improvement.
 */
const NESTED_MODE = false;

/**
 * The tag name of the element to use when reslotting elements.
 */
const SLOT = 'slot';

/// INTERFACE

// TODO: See how to wire nester with renderer
export function* nester(elements) {
  // let parent, root;
  // root = parentElement = Element(SLOT, {className: CLASS});
  // for (const element of elements) {
  //   const token = element.token;
  //   parent = token.parent || undefined;
  //   parentElement = (parent && parent.element) || root;
  //   parentElement.appendChild(element);
  // }
  // yield root;
}

/// IMPLEMENTATION
