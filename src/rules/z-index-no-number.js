"use strict";

const { ruleMessages, validateOptions, report } = require("stylelint").utils;

const ruleName = "z-index-no-number";
const messages = ruleMessages(ruleName, {
  expected: (attr) => `Expected ${attr} not use number`,
});

const ruleFunction = (primary, secondaryOptions) => {
  return (postcssRoot, postcssResult) => {
    const validOptions = validateOptions(
      postcssResult,
      ruleName,
      {
        actual: primary,
      },
      {
        optional: true,
        actual: secondaryOptions,
        possible: {
          type: ["warning", "error"],
        },
      }
    );

    if (!validOptions) {
      return;
    }

    const severity = secondaryOptions ? secondaryOptions.type : "error";

    postcssRoot.walkDecls((decl) => {
      const prop = decl.prop.toLowerCase();
      const value = decl.value;
      if (prop === "z-index" && /^\d/.test(value)) {
        report({
          message: messages.expected(prop),
          node: decl,
          word: value,
          ruleName,
          result: postcssResult,
          severity,
        });
      }
    });
  };
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;

module.exports = ruleFunction;
