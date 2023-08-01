import { BinaryExpression, BooleanLiteral, Expression, Identifier, LogicalExpression, NodeType, NumericLiteral, ObjectDeclaration, Program, Statement, VariableDeclaration, VariableType } from "../parser/parser.types";
import { RuntimeValue, NumberValue, BooleanValue, RuntimeVariable } from "./runtime.types";
import { Error } from "../lib/error";
import { InterpreterConfiguration } from "../interpreter/interpreter.types";
import { Agent, AgentVariableIdentifier, AgentVariableValue, AgentVariables, InterpreterOutput } from "../interpreter/interpreter.types";

export class Runtime {

    private program: Program;
    private output: InterpreterOutput = { step: 0, agents: [] };

    constructor(program: Program) {
        this.program = program;
    }

    public run(config: InterpreterConfiguration, step: number): InterpreterOutput {
        this.output.step = step;
        this.output.agents = [];

        return this.evaluateProgram(this.program, config);
    }

    private evaluateProgram(program: Program, config: InterpreterConfiguration): InterpreterOutput {
        for (const statement of program.body) {
            if (statement.type !== NodeType.ObjectDeclaration) {
                Error.runtime(statement.position, "Only object declarations allowed in program body");
            }

            const agent: Agent = this.evaluateObjectDeclaration(statement as ObjectDeclaration);
            this.output.agents.push(agent);
        }

        return this.output;
    }

    private evaluateObjectDeclaration(declaration: ObjectDeclaration): Agent {
        const identifier: string = declaration.identifier;
        const variables: AgentVariables = new Map<AgentVariableIdentifier, AgentVariableValue>();

        for (const statement of declaration.body) {
            if (statement.type !== NodeType.VariableDeclaration) {
                Error.runtime(statement.position, "Only variable declarations allowed in object body");
            }

            const variable: RuntimeVariable = this.evaluateVariableDeclaration(statement as VariableDeclaration);
            variables.set(variable.identifier, variable.value);
        }

        return { id: 0, identifier, variables } as Agent;
    }

    private evaluateVariableDeclaration(declaration: VariableDeclaration): RuntimeVariable {
        const identifier: string = declaration.identifier;
        let value: RuntimeValue;

        // evaluate VARIABLE in step 0
        if (declaration.variableType === VariableType.Variable && declaration.default && this.output.step === 0) {
            value = this.evaluateRuntimeValue(declaration.default);
        } else {
            value = this.evaluateRuntimeValue(declaration.value);
        }

        return { identifier, value: this.getRawRuntimeValue(value) } as RuntimeVariable;
    }

    private getRawRuntimeValue(value: RuntimeValue): AgentVariableValue {
        if (value.type === "number") {
            return (value as NumberValue).value;
        }

        return (value as BooleanValue).value;
    }

    private evaluateRuntimeValue(node: Expression): RuntimeValue {
        switch (node.type) {
            case NodeType.NumericLiteral:
                return this.evaluateNumericLiteral(node as NumericLiteral);
            case NodeType.BooleanLiteral:
                return this.evaluateBooleanLiteral(node as BooleanLiteral);
            case NodeType.BinaryExpression:
                return this.evaluateBinaryExpression(node as BinaryExpression);
            default:
                Error.runtime(node.position, "Only numeric literals and binary expressions allowed");
                return {} as RuntimeValue;
        }
    }

    private evaluateNumericLiteral(numericLiteral: NumericLiteral): RuntimeValue {
        return { type: "number", value: (numericLiteral as NumericLiteral).value } as NumberValue;
    }

    private evaluateBooleanLiteral(booleanLiteral: BooleanLiteral): RuntimeValue {
        return { type: "boolean", value: (booleanLiteral as BooleanLiteral).value } as BooleanValue;
    }

    private evaluateBinaryExpression(expression: BinaryExpression): RuntimeValue {
        const leftHandSide = this.evaluateRuntimeValue(expression.left);
        const rightHandSide = this.evaluateRuntimeValue(expression.right);
    
        if (leftHandSide.type === "number" && rightHandSide.type === "number") {
            return this.evaluateNumericBinaryExpression(leftHandSide as NumberValue, rightHandSide as NumberValue, expression.operator);
        }
    
        Error.runtime(expression.position, "Only numbers allowed in binary expression");
        return {} as RuntimeValue;
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

    /*
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
            if (!this.previousOutput) {
                const value: RuntimeValue = this.evaluateDefaultObjectDeclaration(declaration, env, config, id);
            } else {
                const value: RuntimeValue = this.evaluateNextObjectDeclaration(declaration, env, config, id);
            }
        }

        return { type: "null", value: null } as NullValue;
    }

    private evaluateDefaultObjectDeclaration(declaration: ObjectDeclaration, env: Environment, config: InterpreterConfiguration, id: number): RuntimeValue {

        return { type: "null", value: null } as NullValue;
    }

    private evaluateNextObjectDeclaration(declaration: ObjectDeclaration, env: Environment, config: InterpreterConfiguration, id: number): RuntimeValue {

        return { type: "null", value: null } as NullValue;
    }
    */
}