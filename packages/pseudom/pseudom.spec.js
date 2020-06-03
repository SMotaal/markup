/** @param {import('@smotaal/pseudom.js')} [pseudom] */
export default async pseudom => {
  if (pseudom === undefined) pseudom = await import('./pseudom.js');

  // Log the APIs imported from pseudom
  console.log({pseudom});

  {
    // Create a DOM-less fragment in Node.js
    const fragment = pseudom.createFragment();

    // Append some DIV elements
    fragment.append(
      pseudom.createElement(
        'div',
        {
          dataset: {usingPropertiesArgument: true},
          className: 'div-with-class-name-property',
        },
        pseudom.createElement(
          'div',
          {
            dataset: {usingPropertiesArgument: true},
            className: 'div-with-text',
          },
          'text',
        ),
      ),
      Object.assign(pseudom.createElement('div'), {
        dataset: {usingObjectDotAssign: true},
        className: 'div-with-assigned-class-name',
      }),
    );

    // Log a newline just to space things out
    console.log('\n');

    // Log the element objects of the document fragment
    console.log(
      'fragment = ',
      // NOTE: It's iterable so we are making an [... array] to
      //       see all the elements in the console
      [...fragment.children],
    );

    // Log a newline dido
    console.log('\n');

    // Log the reparsed JSON object which is how this HTML
    //   will look when it is serialized and passed from
    //   a worker or the backend before hittng the real DOM
    console.log('json', JSON.parse(JSON.stringify(fragment)));
  }
};
