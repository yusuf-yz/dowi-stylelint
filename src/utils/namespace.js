'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true,
});
exports['default'] = namespace;
const prefix = require('../../package.json').name;

function namespace(ruleName) {
	return ''.concat(prefix, '/').concat(ruleName);
}
