'use strict';

const { ruleMessages, validateOptions, report } = require('stylelint').utils;
const { isString, isArray } = require('lodash');
const tinyColor = require('tinycolor2');
const valueParser = require('postcss-value-parser');

const ruleName = 'color-value-rgb';
const messages = ruleMessages(ruleName, {
	expected: (unfixed, fixed) => `Expected "${unfixed}" to be "${fixed}"`,
});

const ColorReg = /^(rgb)/;
// div -> split word. eg: ,
// function -> function attr. eg: rgb, linear-gradient
// word -> attr value. eg: #000
const ValidNodeType = new Set(['div', 'function', 'word']);
// TODO: Support attributes to be improved
const LintAttrs = new Set(['background', 'border', 'box-shadow', 'color', 'text-shadow']);

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
					type: ['error', 'warning'],
				},
			},
		);

		if (!validOptions) {
			return;
		}

		const ignoreAttrs = secondaryOptions ? secondaryOptions.ignoreAttrs : '';
		const severity = secondaryOptions ? secondaryOptions.type : 'warning';

		postcssRoot.walkDecls((decl) => {
			const prop = decl.prop.toLowerCase();
			const value = decl.value;

			if (isString(ignoreAttrs) && prop === ignoreAttrs) {
				return;
			}

			if (isArray(ignoreAttrs) && ignoreAttrs.some((attr) => attr === prop)) {
				return;
			}

			if ([...LintAttrs].some((attr) => prop.startsWith(attr))) {
				const { nodes = [] } = valueParser(getDeclarationValue(decl));

				if (!checkDeclHasFixColor(nodes, value)) {
					return;
				}

				const fixedValue = getFixedDeclValue(nodes, value);

				// console.log('fixed value is ', fixedValue);

				if (context.fix) {
					return (decl.value = fixedValue);
				}

				return report({
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

const checkDeclHasFixColor = (nodes, originValue) => {
	const funcNode = nodes.find((node) => node.type === 'function');

	if (funcNode) {
		return (
			checkColorIsValid(originValue) ||
			(!ColorReg.test(funcNode.value) && checkChildNodesColorIsValid(funcNode.nodes))
		);
	}

	return checkChildNodesColorIsValid(nodes);
};

const checkChildNodesColorIsValid = (childNodes) => {
	return childNodes.some((childNode) => checkColorIsValid(childNode.value));
};

const getFixedDeclValue = (nodes, originValue) => {
	const existFuncNode = nodes.some((node) => node.type === 'function');

	if (existFuncNode) {
		if (checkColorIsValid(originValue)) {
			return tinyColor(originValue).toRgbString();
		}

		return nodes
			.filter((node) => ValidNodeType.has(node.type))
			.map((node) => {
				const { type = '', value = '', nodes = [] } = node;
				if (type === 'function') {
					return value + '(' + getFixedDeclValue(nodes, originValue) + ')';
				}

				return value;
			})
			.join('');
	}

	return nodes
		.filter((node) => ValidNodeType.has(node.type))
		.map((node) => {
			const { value = '', type = '' } = node;
			if (checkColorIsValid(value)) {
				return tinyColor(value).toRgbString();
			}

			if (type === 'div') {
				return `${value} `;
			}

			return value;
		})
		.join('');
};

const checkColorIsValid = (color) => {
	return tinyColor(color).isValid() && !ColorReg.test(color);
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;

module.exports = ruleFunction;
