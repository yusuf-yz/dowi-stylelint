'use strict';

const { ruleMessages, validateOptions, report } = require('stylelint').utils;
const { isString, isArray } = require('lodash');
const TinyColor = require('tinycolor2');
const Color = require('color');
const ValueParser = require('postcss-value-parser');
const { resolve } = require('path');
const { exec } = require('child_process');
const utils = require('../utils');

const ruleName = (0, utils.namespace)('color-value-rgb');
const messages = ruleMessages(ruleName, {
	expected: (unfixed, fixed) => `Expected "${unfixed}" to be "${fixed}"`,
});

const RGBReg = /^(rgb)/;
const HWBRgb = /^hwb/;
// div -> split word. eg: ,
// function -> function attr. eg: rgb, linear-gradient
// word -> attr value. eg: #000
// space -> place string.
const ValidNodeType = new Set(['div', 'function', 'word', 'space']);
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
				const { nodes = [] } = ValueParser(getDeclarationValue(decl));

				if (!checkDeclHasFixNode(nodes)) {
					return;
				}

				const fixedValue = getFixedDeclValue(nodes);

				if (context.fix) {
					decl.value = fixedValue;
					exec(`prettier ${resolve(__dirname, decl.source.input.file)} --write --cache`);
					return;
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

const checkDeclHasFixNode = (nodes) => {
	const funcNodes = nodes.filter((node) => node.type === 'function');

	if (funcNodes.length > 0) {
		const childFuncNodes = funcNodes.filter((funcNode) =>
			funcNode.nodes.some((childFuncNode) => childFuncNode.type === 'function'),
		);
		const existColorNode = funcNodes.some((node) => checkColorIsValid(getNodeOriginValue(node)));

		if (existColorNode) {
			return true;
		}

		if (childFuncNodes.length > 0) {
			return childFuncNodes.some((childFuncNode) => checkDeclHasFixNode(childFuncNode.nodes));
		}

		return false;
	}

	return checkChildNodesColorIsValid(nodes);
};

const checkChildNodesColorIsValid = (childNodes) => {
	return childNodes.some((childNode) => checkColorIsValid(childNode.value));
};

const getFixedDeclValue = (nodes) => {
	return nodes
		.filter((node) => ValidNodeType.has(node.type))
		.map((node) => {
			const { type = '', value = '', nodes = [] } = node;

			if (type === 'function') {
				const childFuncNode = nodes.some((node) => node.type === 'function');

				if (!childFuncNode) {
					const originValue = getNodeOriginValue(node);

					if (checkColorIsValid(originValue) || HWBRgb.test(originValue)) {
						return transferRgbColor(originValue);
					}

					return originValue;
				}

				return value + '(' + getFixedDeclValue(nodes) + ')';
			}

			if (checkColorIsValid(value)) {
				return transferRgbColor(value);
			}

			return value;
		})
		.join('');
};

const getNodeOriginValue = (node) => {
	const { value = '', nodes = [] } = node;
	return (
		value +
		'(' +
		nodes
			.filter((node) => ValidNodeType.has(node.type))
			.map((node) => node.value.replace(/\/|\s/g, ','))
			.join('') +
		')'
	);
};

const checkColorIsValid = (color) => {
	// 透明色不进行转换
	if (color === 'transparent') {
		return false;
	}
	return TinyColor(color).isValid() && !RGBReg.test(color);
};

// TODO: 部分颜色透明度目前存在超过 2 位小数的情况
const transferRgbColor = (color) => {
	return Color(color).rgb().string();
};

ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;

module.exports = ruleFunction;
