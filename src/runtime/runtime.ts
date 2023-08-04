import { BinaryExpression, BooleanLiteral, CallExpression, ConditionalExpression, Expression, Identifier, LogicalExpression, NodeType, NumericLiteral, ObjectDeclaration, ParserValue, Program, VariableDeclaration, VariableType } from "../parser/parser.types";
import { RuntimeValue, NumberValue, BooleanValue, RuntimeVariable, FunctionValue, RuntimeError, VoidValue } from "./runtime.types";
import { Error } from "../utils/error";
import { InterpreterConfiguration } from "../interpreter/interpreter.types";
import { RuntimeAgent, AgentVariableIdentifier, AgentVariableValue, AgentVariables, RuntimeOutput } from "./runtime.types";
import { Environment } from "./environment";
import { normalizeNumber } from "../utils/functions";

export class Runtime {

    private program: Program;
    private environment: Environment;

    private previousOutput: RuntimeOutput = { type: "output", step: 0, agents: [] };
    private currentOutput: RuntimeOutput = { type: "output", step: 0, agents: [] };

    constructor(program: Program, environment: Environment) {
        this.program = program;
        this.environment = environment;
    }

    public run(step: number): RuntimeValue {
        this.previousOutput = this.deepCopyOutput(this.currentOutput);
        this.currentOutput.step = step;
        this.currentOutput.agents = [];

        return this.evaluateProgram(this.program);
    }

    private evaluateProgram(program: Program): RuntimeValue {
        for (const statement of program.body) {
            const agentCount: number = (statement as ObjectDeclaration).count;

            for (let id = 0; id < agentCount; id++) {
                const agentId: string = (statement as ObjectDeclaration).identifier + "-" + id;
                const value = this.evaluateObjectDeclaration(statement as ObjectDeclaration, agentId);

                if (this.isError(value)) {
                    return value as RuntimeError;
                }
            }
        }

        return this.currentOutput;
    }

    private evaluateObjectDeclaration(declaration: ObjectDeclaration, id: string): RuntimeValue {
        const identifier: string = declaration.identifier;
        const variables: AgentVariables = new Map<AgentVariableIdentifier, AgentVariableValue>();

        this.currentOutput.agents.push({ id, identifier, variables } as RuntimeAgent);

        for (const statement of declaration.body) {
            const value = this.evaluateVariableDeclaration(statement as VariableDeclaration, id);

            if (this.isError(value)) {
                return value as RuntimeError;
            }

            variables.set(statement.identifier, this.getRawRuntimeValue(value));
        }

        return { type: "void" } as VoidValue;
    }

    private evaluateVariableDeclaration(declaration: VariableDeclaration, id: string): RuntimeValue {
        let value: RuntimeValue;

        if (declaration.variableType === VariableType.Variable && declaration.default && this.currentOutput.step === 0) {
            value = this.evaluateRuntimeValue(declaration.default, id);
        } else {
            if (declaration.variableType === VariableType.Const) {
                if (this.currentOutput.step === 0) {
                    value = this.evaluateRuntimeValue(declaration.value, id);
                } else {
                    const agents = this.previousOutput.agents.filter((agent: RuntimeAgent) => agent.id == id);
                    // TODO: check validity
                    const agent = agents[0];
                    const previousValue = agent.variables.get(declaration.identifier);

                    if (typeof previousValue === "number") {
                        return { type: "number", value: previousValue } as NumberValue;
                    } else if (typeof previousValue === "boolean") {
                        return { type: "boolean", value: previousValue } as BooleanValue;
                    }

                    return this.runtimeError("Const variable declaration error");
                }
            } else {
                value = this.evaluateRuntimeValue(declaration.value, id);
            }
        }

        return value;
    }

    private getRawRuntimeValue(value: RuntimeValue): AgentVariableValue {
        if (value.type === "number") {
            return (value as NumberValue).value;
        }

        return (value as BooleanValue).value;
    }

    private evaluateRuntimeValue(node: ParserValue, id: string): RuntimeValue {
        let value;

        switch (node.type) {
            case NodeType.NumericLiteral:
                value = this.evaluateNumericLiteral(node as NumericLiteral);
                if (this.isError(value)) return value as RuntimeError;
                return value;
            case NodeType.BooleanLiteral:
                value = this.evaluateBooleanLiteral(node as BooleanLiteral);
                if (this.isError(value)) return value as RuntimeError;
                return value;
            case NodeType.Identifier:
                value = this.evaluateIdentifier(node as Identifier, id);
                if (this.isError(value)) return value as RuntimeError;
                return value;
            case NodeType.BinaryExpression:
                value = this.evaluateBinaryExpression(node as BinaryExpression, id);
                if (this.isError(value)) return value as RuntimeError;
                return value;
            case NodeType.LogicalExpression:
                value = this.evaluateLogicalExpression(node as LogicalExpression, id);
                if (this.isError(value)) return value as RuntimeError;
                return value;
            case NodeType.ConditionalExpression:
                value = this.evaluateConditionalExpression(node as ConditionalExpression, id);
                if (this.isError(value)) return value as RuntimeError;
                return value;
            case NodeType.CallExpression:
                value = this.evaluateCallExpression(node as CallExpression, id);
                if (this.isError(value)) return value as RuntimeError;
                return value;
            default:
                return this.runtimeError("Unknown runtime AST node");
        }
    }

    private evaluateNumericLiteral(numericLiteral: NumericLiteral): RuntimeValue {
        return {
            type: "number",
            value: normalizeNumber((numericLiteral as NumericLiteral).value)
        } as NumberValue;
    }

    private evaluateBooleanLiteral(booleanLiteral: BooleanLiteral): RuntimeValue {
        return {
            type: "boolean",
            value: (booleanLiteral as BooleanLiteral).value
        } as BooleanValue;
    }

    private evaluateIdentifier(identifier: Identifier, id: string): RuntimeValue {
        let agents: RuntimeAgent[] = [];

        if (this.currentOutput.step === 0) {
            agents = this.currentOutput.agents.filter((agent: RuntimeAgent) => agent.id == id);
        } else {
            agents = this.previousOutput.agents.filter((agent: RuntimeAgent) => agent.id == id);
        }

        if (agents.length === 0) {
            return this.runtimeError("Agent with the provided id does not exist") as RuntimeError;
        }

        if (agents.length > 1) {
            return this.runtimeError("Multiple agents with the provided id found") as RuntimeError;
        }

        const agent: RuntimeAgent = agents[0];

        if (!agent.variables.has(identifier.identifier)) {
            return this.runtimeError("Agent variable with the provided identifier not found") as RuntimeError;
        }

        const value = agent.variables.get(identifier.identifier);

        if (typeof value === "number") {
            return { type: "number", value } as NumberValue;
        }

        if (typeof value === "boolean") {
            return { type: "boolean", value } as BooleanValue;
        }

        return this.runtimeError("Variable identifier has unknow type, expected number or boolean");
    }

    private evaluateBinaryExpression(expression: BinaryExpression, id: string): RuntimeValue {
        const leftHandSide = this.evaluateRuntimeValue(expression.left, id);

        if (this.isError(leftHandSide)) {
            return leftHandSide as RuntimeError;
        }

        const rightHandSide = this.evaluateRuntimeValue(expression.right, id);

        if (this.isError(rightHandSide)) {
            return rightHandSide as RuntimeError;
        }

        if (leftHandSide.type !== "number" || rightHandSide.type !== "number") {
            return this.runtimeError("Only numbers allowed in binary expression");
        }
    
        if (expression.operator === "==" || expression.operator === ">" || expression.operator === ">=" || expression.operator === "<" || expression.operator === "<=") {
            return this.evaluateComparisonBinaryExpression(leftHandSide as NumberValue, rightHandSide as NumberValue, expression.operator);
        } else {
            return this.evaluateNumericBinaryExpression(leftHandSide as NumberValue, rightHandSide as NumberValue, expression.operator);
        }
    }

    private evaluateComparisonBinaryExpression(leftHandSide: NumberValue, rightHandSide: NumberValue, operator: string): RuntimeValue {
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

    private evaluateNumericBinaryExpression(leftHandSide: NumberValue, rightHandSide: NumberValue, operator: string): RuntimeValue {
        let result = 0;
    
        if (operator === "+") {
            result = leftHandSide.value + rightHandSide.value;
        } else if (operator === "-") {
            result = leftHandSide.value - rightHandSide.value;
        } else if (operator === "*") {
            result = leftHandSide.value * rightHandSide.value;
        } else if (operator === "/") {
            if (rightHandSide.value === 0) {
                return this.runtimeError("Division by zero not allowed") as RuntimeError;
            }

            result = leftHandSide.value / rightHandSide.value;
        } else {
            if (rightHandSide.value === 0) {
                return this.runtimeError("Modulo by zero not allowed") as RuntimeError;
            }

            result = leftHandSide.value % rightHandSide.value;
        }
    
        return { type: "number", value: normalizeNumber(result) } as NumberValue;
    }

    private evaluateLogicalExpression(expression: LogicalExpression, id: string): RuntimeValue {
        const leftHandSide = this.evaluateRuntimeValue(expression.left, id);

        if (this.isError(leftHandSide)) {
            return leftHandSide as RuntimeError;
        }

        const rightHandSide = this.evaluateRuntimeValue(expression.right, id);

        if (this.isError(rightHandSide)) {
            return rightHandSide as RuntimeError;
        }

        if (leftHandSide.type === "boolean" && rightHandSide.type === "boolean") {
            if (expression.operator === "AND") {
                const leftValue = (leftHandSide as BooleanValue).value;
                const rightValue = (rightHandSide as BooleanValue).value;
                const result = leftValue && rightValue;

                return { type: "boolean", value: result } as BooleanValue;
            } else if (expression.operator === "OR") {
                const leftValue = (leftHandSide as BooleanValue).value;
                const rightValue = (rightHandSide as BooleanValue).value;
                const result = leftValue || rightValue;

                return { type: "boolean", value: result } as BooleanValue;
            }
        }

        return this.runtimeError("Only booleans allowed in logical expression") as RuntimeError;
    }

    private evaluateConditionalExpression(expression: ConditionalExpression, id: string): RuntimeValue {
        const condition = this.evaluateRuntimeValue(expression.condition, id);

        if (this.isError(condition)) {
            return condition as RuntimeError;
        }

        if (condition.type !== "boolean") {
            return this.runtimeError("Conditional expression requires a boolean value as a condition");
        }

        const option = (condition as BooleanValue).value ? expression.consequent : expression.alternate;

        return this.evaluateRuntimeValue(option, id);
    }

    private evaluateCallExpression(expression: CallExpression, id: string): RuntimeValue {
        if (expression.caller.type !== NodeType.Identifier) {
            return this.runtimeError("Function call must start with an identifier") as RuntimeError;
        }

        const identifier = this.environment.lookupVariable((expression.caller as Identifier).identifier);

        if (!identifier) {
            return this.runtimeError("Function with the provided identifier does not exist") as RuntimeError;
        }

        const args: RuntimeValue[] = [];

        for (const arg of expression.args) {
            const argValue = this.evaluateRuntimeValue(arg, id);

            if (this.isError(argValue)) {
                return argValue as RuntimeError;
            }

            args.push(argValue);
        }
    
        if (identifier.type !== "function") {
            this.runtimeError("Cannot call a non-function identifier") as RuntimeError;
        }

        return (identifier as FunctionValue).call(args);
    }

    private isError(node: RuntimeValue): boolean {
        return node.type === "error";
    }

    private runtimeError(message: string): RuntimeError {
        return { type: "error", message } as RuntimeError;
    }

    private deepCopyOutput(output: RuntimeOutput): RuntimeOutput {
        const newOutput: RuntimeOutput = { type: "output", step: output.step, agents: [] };

        for (const agent of output.agents) {
            newOutput.agents.push({
                id: agent.id,
                identifier: agent.identifier,
                variables: new Map(agent.variables)
            } as RuntimeAgent);
        }

        return newOutput;
    }
}