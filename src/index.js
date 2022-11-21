'use strict';

const stylelint = require('stylelint');
const rules = require('./rules');
const namespace = require('../package.json').name;

module.exports = Object.keys(rules).map((ruleName) =>
	stylelint.createPlugin(`${namespace}/${ruleName}`, rules[ruleName]),
);
