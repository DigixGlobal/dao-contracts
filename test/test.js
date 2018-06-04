const {
  indexRange,
} = require('@digix/helpers/lib/helpers');

const votes = indexRange(0, 4).map(() => indexRange(0, 9).map(() => true));

console.log(votes);
