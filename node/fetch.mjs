/** Bare-metal shim for global.fetch */
export function fetch() {
  if (typeof self === 'object' && typeof self.fetch === 'function')
    return (fetch = self.fetch.bind(self))(...arguments);

  const ready = (async () => {
    try {
      const https = await import('https').catch(Error);
      fetch = (...args) =>
        new Promise((resolve, reject) => {
          https
            .get(...args, response => {
              let body = '';
              response.text = async () => body;
              response.setEncoding('utf8');
              response.on('data', chunk => (body += chunk));
              response.on('end', () => resolve(response));
            })
            .on('error', reject);
        });
    } catch (exception) {
      fetch = source => Promise.reject(Error(`Unsupported: cannot fetch "${source}"`));
    }
  })();

  return (fetch = async (...args) => (await ready, fetch(...args)))(...arguments);
}

typeof global !== 'object' ||
  (global || '').global !== global ||
  global.fetch ||
  (global.fetch = (...args) => fetch(...args));
