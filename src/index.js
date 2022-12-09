'use strict';

const stylelint = require('stylelint');
const rules = require('./rules');
const utils = require('./utils');

module.exports = Object.keys(rules).map((ruleName) =>
	stylelint.createPlugin(`${(0, utils.namespace)(ruleName)}`, rules[ruleName]),
);
