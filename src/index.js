'use strict';

const agenda = require('./agenda');
const check = require('./check');
const render = require('./render');

module.exports = {
  ...agenda,
  ...check,
  ...render,
};
