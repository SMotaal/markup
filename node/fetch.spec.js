import './node/fetch.mjs';

fetch('https://www.google.com/humans.txt')
  .then(async response => console.log(await response.text()))
  .catch(console.warn);

// import {fetch} from './fetch.mjs';

// fetch((test.length && test) || (test = 'https://www.google.com/humans.txt'))
//   .then(async response => response.text())
//   .then(text => console.log('fetch(%o).text() => %o', test, typeof text === 'string'))
//   .catch(console.warn);
