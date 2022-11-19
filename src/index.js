"use strict";

const stylelint = require("stylelint");
const rules = require("./rules");
const namespace = "mai-stylelint";

module.exports = Object.keys(rules).map((ruleName) =>
  stylelint.createPlugin(`${namespace}/${ruleName}`, rules[ruleName])
);
