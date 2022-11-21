'use strict';

const importLazy = require('import-lazy');

module.exports = {
	'z-index-no-number': importLazy(() => require('./z-index-no-number'))(),
	'color-value-rgb': importLazy(() => require('./color-value-rgb'))(),
};
