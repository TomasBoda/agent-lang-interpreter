import { BinaryExpression, BooleanLiteral, CallExpression, ConditionalExpression, Expression, Identifier, LambdaExpression, LogicalExpression, NodeType, NumericLiteral, ObjectDeclaration, ParserValue, Program, VariableDeclaration, VariableType } from "../parser/parser.types";
import { RuntimeValue, NumberValue, BooleanValue, FunctionValue, RuntimeError, VoidValue, FunctionCall, IdentifierValue, AgentsValue, AgentValue, LambdaValue } from "./runtime.types";
import { Error } from "../utils/error";
import { InterpreterConfiguration } from "../interpreter/interpreter.types";
import { RuntimeAgent, AgentVariableIdentifier, AgentVariableValue, AgentVariables, RuntimeOutput } from "./runtime.types";
import { Environment } from "./environment";
import { createGlobalFunction, normalizeNumber } from "../utils/functions";
import { writeFileSync } from "fs";

export class Runtime {

    private program: Program;

    private environment: Environment;
    private lambdaEnv: Environment;

    private previousOutput: RuntimeOutput = { type: "output", step: 0, agents: [] };
    private currentOutput: RuntimeOutput = { type: "output", step: 0, agents: [] };

    constructor(program: Program, environment: Environment) {
        this.program = program;

        writeFileSync("ast.json", JSON.stringify(program));

        this.environment = environment;
        this.environment.declareVariable("step", createGlobalFunction(this.createStepFunction(0)));
        this.environment.declareVariable("agents", createGlobalFunction(this.createAgentsFunction([], "")));

        this.lambdaEnv = new Environment();
    }

    public run(step: number): RuntimeValue {
        this.previousOutput = this.deepCopyOutput(this.currentOutput);
        this.currentOutput.step = step;
        this.currentOutput.agents = [];

        this.provideDataToStepFunction(step);

        return this.evaluateProgram(this.program);
    }

    private evaluateProgram(program: Program): RuntimeValue {
        for (const statement of program.body) {
            const numberOfAgents = (statement as ObjectDeclaration).count;

            for (let id = 0; id < numberOfAgents; id++) {
                const agentId = (statement as ObjectDeclaration).identifier + "-" + id;

                this.provideDataToAgentsFunction(this.previousOutput.agents, agentId);

                const value = this.evaluateObjectDeclaration(statement as ObjectDeclaration, agentId);

                if (this.isError(value)) {
                    return value as RuntimeError;
                }
            }
        }

        return this.currentOutput;
    }

    private evaluateObjectDeclaration(declaration: ObjectDeclaration, id: string): RuntimeValue {
        const identifier = declaration.identifier;

        this.environment.declareVariable(identifier, { type: "identifier", value: identifier } as IdentifierValue);

        const variables = new Map<AgentVariableIdentifier, AgentVariableValue>();

        this.currentOutput.agents.push({ id, identifier, variables } as RuntimeAgent);

        for (const statement of declaration.body) {
            const variableValue = this.evaluateVariableDeclaration(statement as VariableDeclaration, id);

            if (this.isError(variableValue)) {
                return variableValue as RuntimeError;
            }

            const rawValue = this.getRawRuntimeValue(variableValue);

            if (rawValue === undefined) {
                return this.runtimeError(`Cannot extract raw runtime value because the value type '${variableValue.type}' is not supported`) as RuntimeError;
            }

            variables.set(statement.identifier, rawValue);
        }

        return { type: "void" } as VoidValue;
    }

    private evaluateVariableDeclaration(declaration: VariableDeclaration, id: string): RuntimeValue {
        // evaluate variable default value in step 0
        if (declaration.variableType === VariableType.Variable && declaration.default && this.currentOutput.step === 0) {
            return this.evaluateRuntimeValue(declaration.default, id);
        }

        // evaluate const
        if (declaration.variableType === VariableType.Const) {
            // evaluate const value
            if (this.currentOutput.step === 0) {
                return this.evaluateRuntimeValue(declaration.value, id);
            }

            // retrieve const value
            const agent = this.getAgent(id, this.previousOutput);

            if (!agent) {
                return this.runtimeError("Agent with the provided id not found");
            }

            const previousValue = agent?.variables.get(declaration.identifier);

            if (typeof previousValue === "number") {
                return { type: "number", value: previousValue } as NumberValue;
            } else if (typeof previousValue === "boolean") {
                return { type: "boolean", value: previousValue } as BooleanValue;
            }

            return this.runtimeError("Const variable declaration error");
        }

        return this.evaluateRuntimeValue(declaration.value, id);
    }

    private getRawRuntimeValue(value: RuntimeValue): AgentVariableValue | undefined {
        if (value.type === "number") {
            return (value as NumberValue).value;
        } else if (value.type === "boolean") {
            return (value as BooleanValue).value;
        } else if (value.type === "agents") {
            return (value as AgentsValue).agents;
        }

        return undefined;
    }

    private evaluateRuntimeValue(node: ParserValue, id: string): RuntimeValue {
        switch (node.type) {
            case NodeType.NumericLiteral:
                return this.evaluateNumericLiteral(node as NumericLiteral);
            case NodeType.BooleanLiteral:
                return this.evaluateBooleanLiteral(node as BooleanLiteral);
            case NodeType.Identifier:
                return this.evaluateIdentifier(node as Identifier, id);
            case NodeType.BinaryExpression:
                return this.evaluateBinaryExpression(node as BinaryExpression, id);
            case NodeType.LogicalExpression:
                return this.evaluateLogicalExpression(node as LogicalExpression, id);
            case NodeType.ConditionalExpression:
                return this.evaluateConditionalExpression(node as ConditionalExpression, id);
            case NodeType.CallExpression:
                return this.evaluateCallExpression(node as CallExpression, id);
            case NodeType.LambdaExpression:
                return this.evaluateLambdaExpression(node as LambdaExpression, id);
            default:
                return this.runtimeError(`Unknown runtime node '${node.type}'`);
        }
    }

    private evaluateNumericLiteral(numericLiteral: NumericLiteral): RuntimeValue {
        return {
            type: "number",
            value: normalizeNumber(numericLiteral.value)
        } as NumberValue;
    }

    private evaluateBooleanLiteral(booleanLiteral: BooleanLiteral): RuntimeValue {
        return {
            type: "boolean",
            value: booleanLiteral.value
        } as BooleanValue;
    }

    private evaluateIdentifier(identifier: Identifier, id: string): RuntimeValue {
        if (this.isMemberIdentifier(identifier)) {
            if (identifier.identifier.split(".").length !== 2) {
                return this.runtimeError("Member identifier needs to have exactly two parts");
            }

            const callerIdentifier = identifier.identifier.split(".")[0];
            const paramIdentifier = identifier.identifier.split(".")[1];

            const caller = this.lambdaEnv.lookupVariable(callerIdentifier);

            if (caller.type === "error") {
                return caller as RuntimeError;
            }

            if (caller.type !== "agent") {
                return this.runtimeError("Member caller needs to be of type 'agent'");
            }

            const agent: AgentValue = caller as AgentValue;

            if (!agent.value.variables.has(paramIdentifier)) {
                return this.runtimeError(`Variable ${paramIdentifier} does not exist in agent with id '${agent.value.id}'`);
            }

            const variableValue = agent.value.variables.get(paramIdentifier);

            if (typeof variableValue === "number") {
                return { type: "number", value: variableValue } as NumberValue;
            } else if (typeof variableValue === "boolean") {
                return { type: "boolean", value: variableValue } as BooleanValue;
            }

            return this.runtimeError("Unknown variable type in member identifier");
        }

        const variableLookup = this.environment.lookupVariable(identifier.identifier);

        if (!this.isError(variableLookup)) {
            return variableLookup;
        }

        const output = this.currentOutput.step === 0 ? this.currentOutput : this.previousOutput;
        let agent = this.getAgent(id, output);

        if (!agent) {
            return this.runtimeError(`Agent with id '${id}' not found`);
        }

        if (!agent.variables.has(identifier.identifier)) {
            return this.runtimeError(`Variable '${identifier.identifier}' in agent '${id}' does not exist`) as RuntimeError;
        }

        const value = agent.variables.get(identifier.identifier);

        if (typeof value === "number") {
            return { type: "number", value } as NumberValue;
        }

        if (typeof value === "boolean") {
            return { type: "boolean", value } as BooleanValue;
        }

        return this.runtimeError(`Variable identifier '${identifier.identifier}' has unknown type, expected number or boolean`);
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
            return this.runtimeError("Binary expression requires numeric operands") as RuntimeError;
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

            result = this.customModulo(leftHandSide.value, rightHandSide.value);
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

        return this.runtimeError("Logical expression requires boolean operands") as RuntimeError;
    }

    private evaluateConditionalExpression(expression: ConditionalExpression, id: string): RuntimeValue {
        const condition = this.evaluateRuntimeValue(expression.condition, id);

        if (this.isError(condition)) {
            return condition as RuntimeError;
        }

        if (condition.type !== "boolean") {
            return this.runtimeError("If statement requires a boolean expression as its condition");
        }

        const result = (condition as BooleanValue).value ? expression.consequent : expression.alternate;
        
        return this.evaluateRuntimeValue(result, id);
    }

    private evaluateCallExpression(expression: CallExpression, id: string): RuntimeValue {
        if (expression.caller.type !== NodeType.Identifier) {
            return this.runtimeError("Function call be an identifier") as RuntimeError;
        }

        const identifier = (expression.caller as Identifier).identifier;
        const func = this.environment.lookupVariable(identifier);

        if (!func) {
            return this.runtimeError(`Function with the identifier '${identifier}; does not exist`) as RuntimeError;
        }

        if (func.type !== "function") {
            this.runtimeError(`Identifier '${identifier}' is not a function`) as RuntimeError;
        }

        const args: RuntimeValue[] = [];

        for (const arg of expression.args) {
            const argValue = this.evaluateRuntimeValue(arg, id);

            if (this.isError(argValue)) {
                return argValue as RuntimeError;
            }

            args.push(argValue);
        }

        const result = (func as FunctionValue).call(args);
        return result;
    }

    private evaluateLambdaExpression(expression: LambdaExpression, id: string): RuntimeValue {
        const agents: RuntimeValue = this.evaluateRuntimeValue(expression.base, id);
        const param: IdentifierValue = { type: "identifier", value: expression.param } as IdentifierValue;

        if (agents.type !== "agents") {
            return this.runtimeError("Lambda expression requires 'agents' as base argument");
        }

        const runtimeAgents = (agents as AgentsValue).agents.filter((agent: RuntimeAgent) => agent.id !== id);
        const results: RuntimeValue[] = [];

        for (const agent of runtimeAgents) {
            this.lambdaEnv.declareVariable(param.value, { type: "agent", value: agent } as AgentValue);

            const result = this.evaluateRuntimeValue(expression.value, id);
            results.push(result);
        }

        return {
            type: "lambda",
            agents: runtimeAgents,
            results
        } as LambdaValue;
    }

    private isMemberIdentifier(identifier: Identifier): boolean {
        return identifier.identifier.split(".").length > 1;
    }

    private isError(node: RuntimeValue): boolean {
        return node.type === "error";
    }

    private runtimeError(message: string): RuntimeError {
        return { type: "error", message } as RuntimeError;
    }

    private customModulo(a: number, b: number): number {
        return ((a % b) + b) % b;
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

    private getAgent(id: string, output: RuntimeOutput): RuntimeAgent | undefined {
        let agents: RuntimeAgent[] = output.agents.filter((agent: RuntimeAgent) => agent.id === id);

        if (agents.length !== 1) {
            return undefined;
        }

        return agents[0];
    }

    private provideDataToStepFunction(step: number): void {
        this.environment.assignVariable("step", createGlobalFunction(this.createStepFunction(step)));
    }

    private provideDataToAgentsFunction(agents: RuntimeAgent[], id: string): void {
        this.environment.assignVariable("agents", createGlobalFunction(this.createAgentsFunction(agents, id)));
    }

    private createAgentsFunction(agents: RuntimeAgent[], id: string): FunctionCall {
        function agentsFunction(args: RuntimeValue[]): RuntimeValue {
            if (args.length !== 1) {
                return { type: "error", message: `Function 'agents' requires 1 argument, ${args.length} provided` } as RuntimeError;
            }

            if (args[0].type !== "identifier") {
                return { type: "error", message: "Function 'agents' requires an identifier arguments" } as RuntimeError;
            }

            const identifier = (args[0] as IdentifierValue).value;
            
            return {
                type: "agents",
                agents: agents.filter((agent: RuntimeAgent) => agent.id.split("-")[0] === identifier && agent.id !== id)
            } as AgentsValue;
        }

        return agentsFunction;
    }

    private createStepFunction(step: number): FunctionCall {
        function stepFunction(args: RuntimeValue[]): RuntimeValue {
            if (args.length !== 0) {
                return { type: "error", message: `Function 'step' requires 0 arguments, ${args.length} provided`} as RuntimeError;
            }
        
            return { type: "number", value: step } as NumberValue;
        }

        return stepFunction;
    }
}