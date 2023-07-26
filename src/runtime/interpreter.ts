import { BinaryExpression, Identifier, NodeType, NumericLiteral, Program, Statement } from "../parser/ast.types";
import { RuntimeValue, NumberValue, NullValue } from "./values";
import { Error } from "../lib/error";
import { Environment } from "./environment";

export class Interpreter {

    private program: Program;

    constructor(program: Program) {
        this.program = program;
    }

    public interpret(env: Environment): RuntimeValue {
        return this.evaluate(this.program, env);
    }

    private evaluate(node: Statement, env: Environment): RuntimeValue {
        
        switch (node.type) {
            case NodeType.NumericLiteral:
                return { type: "number", value: (node as NumericLiteral).value } as NumberValue;
            
            case NodeType.NullLiteral:
                return { type: "null", value: "null" } as NullValue;
            
            case NodeType.Identifier:
                return this.evaluateIdentifier(node as Identifier, env);
    
            case NodeType.BinaryExpression:
                return this.evaluateBinaryExpression(node as BinaryExpression, env);
    
            case NodeType.Program:
                return this.evaluateProgram(node as Program, env);
    
            default:
                Error.runtime(null, "Unsupported AST node type in evaluate()");
                return {} as RuntimeValue;
        }
    }

    private evaluateProgram(program: Program, env: Environment): RuntimeValue {
        let lastEvaluated: RuntimeValue = { type: "null", value: "null" } as NullValue;
    
        for (const statement of program.body) {
            lastEvaluated = this.evaluate(statement, env);
        }
    
        return lastEvaluated;
    }
    
    private evaluateBinaryExpression(binop: BinaryExpression, env: Environment): RuntimeValue {
        const leftHandSide = this.evaluate(binop.left, env);
        const rightHandSide = this.evaluate(binop.right, env);
    
        if (leftHandSide.type === "number" && rightHandSide.type === "number") {
            return this.evaluateNumericBinaryExpression(leftHandSide as NumberValue, rightHandSide as NumberValue, binop.operator);
        }
    
        return { type: "null", value: "null" } as NullValue;
    }
    
    private evaluateNumericBinaryExpression(leftHandSide: NumberValue, rightHandSide: NumberValue, operator: string): NumberValue {
        let result = 0;
    
        if (operator === "+") {
            result = leftHandSide.value + rightHandSide.value;
        } else if (operator === "-") {
            result = leftHandSide.value - rightHandSide.value;
        } else if (operator === "*") {
            result = leftHandSide.value * rightHandSide.value;
        } else if (operator === "/") {
            // TODO: division by zero checks
            result = leftHandSide.value / rightHandSide.value;
        } else {
            result = leftHandSide.value % rightHandSide.value;
        }
    
        return { type: "number", value: result } as NumberValue;
    }

    private evaluateIdentifier(identifier: Identifier, env: Environment): RuntimeValue {
        const value = env.lookupVariable(identifier.identifier);
        return value;
    }
}