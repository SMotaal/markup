(async () => {
  const iframe = document.body.appendChild(document.createElement('iframe'));
  iframe.style.display = 'none';
  iframe.src = './rollup.html';

  const url = new URL(`./caches/worker.js`, location);

  // console.log(caches.match(url));
  // console.log(fetch(url));

  new Worker(url);

  // iframe.addEventListener('close', event => {
  //   const scope = iframe.contentWindow;
  //   const rollup = scope.rollup;
  //   console.log({iframe, scope, rollup});
  //   // iframe.remove();
  // });

  //
})();
