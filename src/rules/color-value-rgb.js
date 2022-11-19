"use strict";

const { ruleMessages, validateOptions, report } = require("stylelint").utils;
const { isString, isArray } = require("lodash");
const tinyColor = require("tinycolor2");
const valueParser = require("postcss-value-parser");

const ruleName = "color-value-rgb";
const messages = ruleMessages(ruleName, {
  expected: (unfixed, fixed) => `Expected "${unfixed}" to be "${fixed}"`,
});

const ColorReg = /^(rgb)/;
const SplitStr = "_&_";
// TODO: Support attributes to be improved
const SimpleAttrs = new Set(["color", "background-color"]);
const ComplexAttrs = new Set([
  "background",
  "border",
  "text-shadow",
  "box-shadow",
]);

const ruleFunction = (primary, secondaryOptions, context) => {
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
          ignoreAttrs: [isString, isArray],
          type: ["error", "warning"],
        },
      }
    );

    if (!validOptions) {
      return;
    }

    const ignoreAttrs = secondaryOptions ? secondaryOptions.ignoreAttrs : "";
    const severity = secondaryOptions ? secondaryOptions.type : "warning";

    postcssRoot.walkDecls((decl) => {
      const prop = decl.prop.toLowerCase();
      const value = decl.value;

      if (isString(ignoreAttrs) && prop === ignoreAttrs) {
        return;
      }

      if (isArray(ignoreAttrs) && ignoreAttrs.some((attr) => attr === prop)) {
        return;
      }

      // Complex attr
      // eg: border-color: #fff #fff; border: 1px solid; border: #fff #fff #fff;
      if ([...ComplexAttrs].some((attr) => prop.startsWith(attr))) {
        const { nodes = [] } = valueParser(getDeclarationValue(decl));

        if (!checkDeclHasFixColor(nodes)) {
          return;
        }

        const { originValue, fixedValue } = getFixedDeclValue(nodes);

        if (context.fix) {
          return (decl.value = fixedValue);
        }

        return report({
          message: messages.expected(
            originValue.replace(/_&_/g, " "),
            fixedValue
          ),
          node: decl,
          word: value,
          ruleName,
          result: postcssResult,
          severity,
        });
      }

      // Simple attr
      // eg: color: ###;
      if (!ColorReg.test(value) && SimpleAttrs.has(prop)) {
        const fixedValue = tinyColor(value).toRgbString();

        if (context.fix) {
          return (decl.value = fixedValue);
        }

        report({
          message: messages.expected(value, fixedValue),
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

const getDeclarationValue = (decl) => {
  const raws = decl.raws;

  return (raws.value && raws.value.raw) || decl.value;
};

const checkDeclHasFixColor = (nodes) => {
  return (
    nodes.some(
      (node) => node.type === "function" && !ColorReg.test(node.value)
    ) ||
    (nodes.every((node) => node.type !== "function") &&
      nodes.some((node) => checkColorIsValid(node.value)))
  );
};

const checkColorIsValid = (color) => {
  return tinyColor(color).isValid() && !ColorReg.test(color);
};

const getFixedDeclValue = (nodes) => {
  let originValue = "";
  const isFunc = nodes.some((node) => node.type === "function");

  if (isFunc) {
    originValue = nodes
      .filter((node) => node.type === "function" || node.type === "word")
      .map((node) =>
        node.type === "function"
          ? node.value +
            "(" +
            node.nodes
              .filter((i) => i.type === "word")
              .map((childNode) => childNode.value) +
            ")"
          : node.value
      )
      .join(SplitStr);
  } else {
    originValue = nodes
      .filter((i) => i.type === "word")
      .map((node) => node.value)
      .join("_&_");
  }

  const fixedValue = originValue
    .split(SplitStr)
    .map((i) => (checkColorIsValid(i) ? tinyColor(i).toRgbString() : i))
    .join(" ");

  return { originValue, fixedValue };
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;

module.exports = ruleFunction;
