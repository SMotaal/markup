/*

Try the following in your chrome console, maybe this function is all you need.

Quick question has anyone done exercise or know any tutorial of parsing CSV to JSON object? I am reading some tutorial but people end up using packages and I am trying to avoid it.

@Leo This is the basic logic though, I did not guard for cases where a string value might have an “escaped” separator or even if rows are empty, like having an extra newline in the end of the string (just use csvString.trim() if you encounter that)

@Leo If you still want, I can take a stab at the RegExp’s for rows and columns that would actually escape correctly — but honestly, csv is hardly used if data gets that complex (except maybe legacy code) — a more complex parser will probably choke in ways that will be harder to debug though, and my philosophy is that throwing naturally is your most developer-friendly validation mechanism.

*/

{
  /**
   * This is a basic CSV to Array parser. It uses the first row for headers unless
   * a headers array is specified in the options. It does not do any validation.
   *
   * @typedef {{separator: string, feed: string, headers?: Array<string>}} Options
   * @param {string} csv - Well-formed CSV string
   * @param {Options?} options - Determining how to parse the string
   */
  const parseCSV = (csv, options = parseCSV.defaults) => {
    // Define defaults first time around
    const defaults = parseCSV.defaults || (parseCSV.defaults = {separator: ',', feed: '\n'});

    // Make sure options make sense
    let {separator = defaults.separator, feed = defaults.feed, headers} = options || defaults;

    const data = [];

    // Iterate over rows
    for (const row of csv.split(feed)) {
      const values = row.split(',');
      if (!headers) {
        headers = values;
      } else {
        let i = 0;
        const record = {};
        // Iterate over columns
        for (const value of values) {
          const field = headers[i++];
          record[field] = value;
        }
        // Add record for row
        data.push(record);
      }
    }

    return data;
  };

  // headers from row 0
  console.table(parseCSV('a0,b0,c0\na1,b1,c1\na2,b2,c2'));

  // headers from options
  console.table(parseCSV('a0,b0,c0\na1,b1,c1\na2,b2,c2', {headers: 'a,b,c'.split(',')}));
}
