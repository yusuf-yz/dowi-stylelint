# dowi-stylelint
A custom rules stylelint plugin.

## Rules
| rule name         | options                                                                     | description                     | support fix |
| :---------------- | :-------------------------------------------------------------------------- | :------------------------------ | :---------- |
| color-value-rgb   | [true \| null, {ignoreAttrs: String \| Array, type: 'warning' \| 'error' }] | 颜色属性建议使用 rgb 格式       | YES         |
| z-index-no-number | [true \| null, {type: 'warning' \| 'error' }]                              | z-index属性值建议不直接使用数字 | NO          |
