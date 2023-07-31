import { BinaryExpression, Identifier, LogicalExpression, NodeType, NumericLiteral, ObjectDeclaration, Program, Statement, VariableDeclaration } from "../parser/ast.types";
import { RuntimeValue, NumberValue, NullValue, BooleanValue } from "./values";
import { Error } from "../lib/error";
import { Environment } from "./environment";
import { Position } from "../lexer/lexer.types";
import { InterpreterConfiguration } from "../interpreter";
import { InterpreterOutput } from "../output";

export class Runtime {

    private program: Program;

    constructor(program: Program) {
        this.program = program;
    }

    public interpret(env: Environment, config: InterpreterConfiguration, step: number): RuntimeValue {
        return this.evaluate(this.program, env, config);
    }

    private evaluate(node: Statement, env: Environment, config: InterpreterConfiguration): RuntimeValue {
        
        switch (node.type) {
            case NodeType.Program:
                return this.evaluateProgram(node as Program, env, config);

            case NodeType.Identifier:
                return this.evaluateIdentifier(node as Identifier, env, config);

            case NodeType.NumericLiteral:
                return this.evaluateNumericLiteral(node as NumericLiteral, env, config);
    
            case NodeType.BinaryExpression:
                return this.evaluateBinaryExpression(node as BinaryExpression, env, config);

            case NodeType.LogicalExpression:
                return this.evaluateLogicalExpression(node as LogicalExpression, env, config);
            
            case NodeType.VariableDeclaration:
                return this.evaluateVariableDeclaration(node as VariableDeclaration, env, config);

            case NodeType.ObjectDeclaration:
                return this.evaluateObjectDeclaration(node as ObjectDeclaration, env, config);
    
            default:
                Error.runtime(null, "Unsupported AST node type in evaluate() - " + node.type);
                return {} as RuntimeValue;
        }
    }

    private evaluateProgram(program: Program, env: Environment, config: InterpreterConfiguration): RuntimeValue {
        let lastEvaluated: RuntimeValue = { type: "null", value: null } as NullValue;
    
        for (const statement of program.body) {
            lastEvaluated = this.evaluate(statement, env, config);
        }
    
        return lastEvaluated;
    }

    private evaluateIdentifier(identifier: Identifier, env: Environment, config: InterpreterConfiguration): RuntimeValue {
        return env.lookupVariable(identifier.identifier);
    }

    private evaluateNumericLiteral(numericLiteral: NumericLiteral, env: Environment, config: InterpreterConfiguration): RuntimeValue {
        return { type: "number", value: (numericLiteral as NumericLiteral).value } as NumberValue;
    }

    private evaluateBinaryExpression(binop: BinaryExpression, env: Environment, config: InterpreterConfiguration): RuntimeValue {
        const leftHandSide = this.evaluate(binop.left, env, config);
        const rightHandSide = this.evaluate(binop.right, env, config);
    
        if (leftHandSide.type === "number" && rightHandSide.type === "number") {
            if (binop.operator === ">" || binop.operator === ">=" || binop.operator === "<" || binop.operator === "<=" || binop.operator === "==") {
                return this.evaluateComparisonBinaryExpression(leftHandSide as NumberValue, rightHandSide as NumberValue, binop.operator, config);
            } else {
                return this.evaluateNumericBinaryExpression(leftHandSide as NumberValue, rightHandSide as NumberValue, binop.operator, config);
            }
        }
    
        return { type: "null", value: null } as NullValue;
    }

    private evaluateComparisonBinaryExpression(leftHandSide: NumberValue, rightHandSide: NumberValue, operator: string, config: InterpreterConfiguration): BooleanValue {
        let result: boolean = false;

        if (operator === ">") {
            result = leftHandSide.value > rightHandSide.value;
        } else if (operator === ">=") {
            result = leftHandSide.value >= rightHandSide.value;
        } else if (operator === "<") {
            result = leftHandSide.value < rightHandSide.value;
        } else if (operator === "<=") {
            result = leftHandSide.value <= rightHandSide.value;
        } else if (operator === "==") {
            result = leftHandSide.value == rightHandSide.value;
        }

        return { type: "boolean", value: result } as BooleanValue;
    }
    
    private evaluateNumericBinaryExpression(leftHandSide: NumberValue, rightHandSide: NumberValue, operator: string, config: InterpreterConfiguration): NumberValue {
        let result = 0;
    
        if (operator === "+") {
            result = leftHandSide.value + rightHandSide.value;
        } else if (operator === "-") {
            result = leftHandSide.value - rightHandSide.value;
        } else if (operator === "*") {
            result = leftHandSide.value * rightHandSide.value;
        } else if (operator === "/") {
            if (rightHandSide.value === 0) {
                Error.runtime(null, "Division by zero not allowed");
            }

            result = leftHandSide.value / rightHandSide.value;
        } else {
            if (rightHandSide.value === 0) {
                Error.runtime(null, "Modulo by zero not allowed");
            }

            result = leftHandSide.value % rightHandSide.value;
        }
    
        return { type: "number", value: result } as NumberValue;
    }

    private evaluateLogicalExpression(logic: LogicalExpression, env: Environment, config: InterpreterConfiguration): RuntimeValue {
        const leftHandSide = this.evaluate(logic.left, env, config);
        const rightHandSide = this.evaluate(logic.right, env, config);

        if (leftHandSide.type === "boolean" && rightHandSide.type === "boolean") {
            if (logic.operator === "AND") {
                const leftValue = (leftHandSide as BooleanValue).value;
                const rightValue = (rightHandSide as BooleanValue).value;
                const result = leftValue && rightValue;

                return { type: "boolean", value: result } as BooleanValue;
            } else if (logic.operator === "OR") {
                const leftValue = (leftHandSide as BooleanValue).value;
                const rightValue = (rightHandSide as BooleanValue).value;
                const result = leftValue || rightValue;

                return { type: "boolean", value: result } as BooleanValue;
            }
        }

        return { type: "null", value: null } as NullValue;
    }

    private evaluateVariableDeclaration(declaration: VariableDeclaration, env: Environment, config: InterpreterConfiguration): RuntimeValue {
        const value = this.evaluate(declaration.value, env, config);
        return env.declareVariable(declaration.identifier, value);
    }

    private evaluateObjectDeclaration(declaration: ObjectDeclaration, env: Environment, config: InterpreterConfiguration): RuntimeValue {

        for (let id = 0; id < config.agents; id++) {
            // TODO: evaluateAgent(...)
        }

        return { type: "null", value: null } as NullValue;
    }

    private evaluateAgent(object: ObjectDeclaration, env: Environment, id: number): void {

    }
}