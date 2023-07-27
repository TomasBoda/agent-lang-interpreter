"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Interpreter = void 0;
var ast_types_1 = require("../parser/ast.types");
var error_1 = require("../lib/error");
var Interpreter = /** @class */ (function () {
    function Interpreter(program) {
        this.program = program;
    }
    Interpreter.prototype.interpret = function (env) {
        return this.evaluate(this.program, env);
    };
    Interpreter.prototype.evaluate = function (node, env) {
        switch (node.type) {
            case ast_types_1.NodeType.NumericLiteral:
                return { type: "number", value: node.value };
            case ast_types_1.NodeType.Identifier:
                return this.evaluateIdentifier(node, env);
            case ast_types_1.NodeType.BinaryExpression:
                return this.evaluateBinaryExpression(node, env);
            case ast_types_1.NodeType.Program:
                return this.evaluateProgram(node, env);
            case ast_types_1.NodeType.VariableDeclaration:
                return this.evaluateVariableDeclaration(node, env);
            default:
                error_1.Error.runtime(null, "Unsupported AST node type in evaluate()");
                return {};
        }
    };
    Interpreter.prototype.evaluateProgram = function (program, env) {
        var lastEvaluated = { type: "null", value: null };
        for (var _i = 0, _a = program.body; _i < _a.length; _i++) {
            var statement = _a[_i];
            lastEvaluated = this.evaluate(statement, env);
        }
        return lastEvaluated;
    };
    Interpreter.prototype.evaluateVariableDeclaration = function (declaration, env) {
        var value = this.evaluate(declaration.value, env);
        return env.declareVariable(declaration.identifier, value);
    };
    Interpreter.prototype.evaluateBinaryExpression = function (binop, env) {
        var leftHandSide = this.evaluate(binop.left, env);
        var rightHandSide = this.evaluate(binop.right, env);
        if (leftHandSide.type === "number" && rightHandSide.type === "number") {
            return this.evaluateNumericBinaryExpression(leftHandSide, rightHandSide, binop.operator);
        }
        return { type: "null", value: null };
    };
    Interpreter.prototype.evaluateNumericBinaryExpression = function (leftHandSide, rightHandSide, operator) {
        var result = 0;
        if (operator === "+") {
            result = leftHandSide.value + rightHandSide.value;
        }
        else if (operator === "-") {
            result = leftHandSide.value - rightHandSide.value;
        }
        else if (operator === "*") {
            result = leftHandSide.value * rightHandSide.value;
        }
        else if (operator === "/") {
            // TODO: division by zero checks
            result = leftHandSide.value / rightHandSide.value;
        }
        else {
            result = leftHandSide.value % rightHandSide.value;
        }
        return { type: "number", value: result };
    };
    Interpreter.prototype.evaluateIdentifier = function (identifier, env) {
        var value = env.lookupVariable(identifier.identifier);
        return value;
    };
    return Interpreter;
}());
exports.Interpreter = Interpreter;
