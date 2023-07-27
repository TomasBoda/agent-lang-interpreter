"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VariableType = exports.NodeType = void 0;
var NodeType;
(function (NodeType) {
    // Statements
    NodeType["Program"] = "Program";
    NodeType["VariableDeclaration"] = "VariableDeclaration";
    NodeType["ObjectDeclaration"] = "ObjectDeclaration";
    // Expressions
    NodeType["NumericLiteral"] = "NumericLiteral";
    NodeType["Identifier"] = "Identifier";
    NodeType["BinaryExpression"] = "BinaryExpression";
})(NodeType = exports.NodeType || (exports.NodeType = {}));
var VariableType;
(function (VariableType) {
    VariableType["Const"] = "Const";
    VariableType["Variable"] = "Variable";
    VariableType["Dynamic"] = "Dynamic";
})(VariableType = exports.VariableType || (exports.VariableType = {}));
