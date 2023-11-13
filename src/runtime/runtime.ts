import {
    BinaryExpression,
    BooleanLiteral,
    CallExpression,
    ConditionalExpression,
    Identifier,
    LambdaExpression,
    LogicalExpression,
    MemberExpression,
    NodeType,
    NumericLiteral,
    ObjectDeclaration,
    ParserValue,
    Program,
    UnaryExpression,
    VariableDeclaration,
    VariableType,
} from "../parser/parser.types";
import {
    AgentsValue,
    AgentValue,
    BooleanValue,
    FunctionCall,
    FunctionValue,
    IdentifierValue,
    LambdaValue,
    NumberValue,
    RuntimeAgent,
    RuntimeError,
    RuntimeOutput,
    RuntimeValue,
    ValueType,
    VoidValue
} from "./runtime.types";
import { Environment } from "./environment";
import { createGlobalFunction, normalizeNumber } from "../utils/functions";
import { Error } from "../utils/error";

export class Runtime {

    private readonly program: Program;

    private environment: Environment;
    private lambdaEnv: Environment;

    private output: RuntimeOutput = { type: ValueType.Output, step: 0, agents: [] };

    constructor(program: Program, environment: Environment) {
        this.program = program;

        this.environment = environment;

        this.environment.declareVariable("step", createGlobalFunction(this.createStepFunction(0)));
        this.environment.declareVariable("agents", createGlobalFunction(this.createAgentsFunction([], "")));
        this.environment.declareVariable("index", createGlobalFunction(this.createIndexFunction(0)));

        this.lambdaEnv = new Environment();
    }

    public run(step: number): RuntimeValue {
        this.output.step = step;
        this.provideDataToStepFunction(step);

        return this.evaluateProgram(this.program);
    }

    private evaluateProgram(program: Program): RuntimeValue {
        for (const statement of program.body) {
            if (statement.type !== NodeType.ObjectDeclaration) {
                return Error.runtime("Only object declarations are allowed in program body") as RuntimeError;
            }

            const objectDeclaration: ObjectDeclaration = statement as ObjectDeclaration;

            const numberOfAgents = objectDeclaration.count;

            for (let id = 0; id < numberOfAgents; id++) {
                const agentId = this.getAgentId(objectDeclaration.identifier, id);

                this.provideDataToIndexFunction(id);
                this.provideDataToAgentsFunction(this.output.agents, agentId);

                const objectDeclarationResult = this.evaluateObjectDeclaration(objectDeclaration, agentId);

                if (this.isError(objectDeclarationResult)) {
                    return objectDeclarationResult as RuntimeError;
                }
            }
        }

        return this.output;
    }

    private evaluateObjectDeclaration(declaration: ObjectDeclaration, id: string): RuntimeValue {
        const identifier = declaration.identifier;
        const variables = new Map<string, RuntimeValue>();

        // declare agent identifier as global variable for later use in 'agents' method
        this.environment.declareVariable(identifier, { type: ValueType.Identifier, value: identifier } as IdentifierValue);

        if (this.output.step === 0) {
            this.output.agents.push({ id, identifier, variables } as RuntimeAgent);
        }

        for (const statement of declaration.body) {
            if (statement.type !== NodeType.VariableDeclaration) {
                return Error.runtime("Only variable declarations are allowed in object declarations") as RuntimeError;
            }

            const variableDeclaration: VariableDeclaration = statement as VariableDeclaration;

            const variableIdentifier = variableDeclaration.identifier;
            const variableValue = this.evaluateVariableDeclaration(variableDeclaration, id);

            if (this.isError(variableValue)) {
                return variableValue as RuntimeError;
            }

            if (variableValue.type === ValueType.Void) {
                continue;
            }

            if (this.output.step === 0) {
                variables.set(variableIdentifier, variableValue);
            } else {
                const agent = this.output.agents.find((agent: RuntimeAgent) => agent.id === id);

                if (!agent) {
                    return Error.runtime(`Agent with id '${id}' not found while updating its variable`) as RuntimeError;
                }

                agent.variables.set(variableIdentifier, variableValue);
            }
        }

        return { type: ValueType.Void } as VoidValue;
    }

    private evaluateVariableDeclaration(declaration: VariableDeclaration, id: string): RuntimeValue {
        switch (declaration.variableType) {
            case VariableType.Property: {
                if (declaration.default && this.output.step === 0) {
                    return this.evaluateRuntimeValue(declaration.default, id);
                }
        
                return this.evaluateRuntimeValue(declaration.value, id);
            }
            case VariableType.Const: {
                if (this.output.step === 0) {
                    return this.evaluateRuntimeValue(declaration.value, id);
                }

                const agent = this.getAgent(id, this.output);

                if (!agent) {
                    return Error.runtime("Trying to retrieve previous const value, but the agent with the provided id was not found");
                }

                const previousConstValue: RuntimeValue | undefined = agent.variables.get(declaration.identifier);

                if (!previousConstValue) {
                    return Error.runtime("Trying to retrieve previous const value, but the previous agent value does not exist");
                }

                return previousConstValue;
            }
            default: {
                return Error.runtime("Unrecognized variable type in variable declaration") as RuntimeError;
            }
        }
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
            case NodeType.UnaryExpression:
                return this.evaluateUnaryExpression(node as UnaryExpression, id);
            case NodeType.LogicalExpression:
                return this.evaluateLogicalExpression(node as LogicalExpression, id);
            case NodeType.ConditionalExpression:
                return this.evaluateConditionalExpression(node as ConditionalExpression, id);
            case NodeType.CallExpression:
                return this.evaluateCallExpression(node as CallExpression, id);
            case NodeType.LambdaExpression:
                return this.evaluateLambdaExpression(node as LambdaExpression, id);
            case NodeType.MemberExpression:
                return this.evaluateMemberExpression(node as MemberExpression, id);
            default:
                return Error.runtime(`Unknown runtime node '${node.type}'`);
        }
    }

    private evaluateNumericLiteral(numericLiteral: NumericLiteral): RuntimeValue {
        return { type: ValueType.Number, value: normalizeNumber(numericLiteral.value) } as NumberValue;
    }

    private evaluateBooleanLiteral(booleanLiteral: BooleanLiteral): RuntimeValue {
        return { type: ValueType.Boolean, value: booleanLiteral.value } as BooleanValue;
    }

    private evaluateIdentifier(identifier: Identifier, id: string): RuntimeValue {
        const lambdaLookup = this.lambdaEnv.lookupVariable(identifier.identifier);
        if (!this.isError(lambdaLookup)) {
            return lambdaLookup as RuntimeError;
        }

        const variableLookup = this.environment.lookupVariable(identifier.identifier);
        if (!this.isError(variableLookup)) {
            return variableLookup as RuntimeError;
        }

        const agent = this.getAgent(id, this.output);

        if (!agent) {
            return Error.runtime(`Agent with id '${id}' not found`) as RuntimeError;
        }

        if (!agent.variables.has(identifier.identifier)) {
            return Error.runtime(`Variable '${identifier.identifier}' in agent '${id}' does not exist`) as RuntimeError;
        }

        const variableValue: RuntimeValue | undefined = agent.variables.get(identifier.identifier);

        if (!variableValue) {
            return Error.runtime(`Variable with identifier '${identifier.identifier}' not found in agent`) as RuntimeError;
        }

        return variableValue;
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

        const isValid = ((expression.operator === "==" || expression.operator === "!=") && ((leftHandSide.type === ValueType.Number && rightHandSide.type === ValueType.Number) || (leftHandSide.type === ValueType.Boolean && rightHandSide.type === ValueType.Boolean))) || (leftHandSide.type === ValueType.Number && rightHandSide.type === ValueType.Number);

        if (!isValid) {
            return Error.runtime("Binary expression requires numeric or boolean operands") as RuntimeError;
        }
    
        if (expression.operator === "==" || expression.operator === "!=" || expression.operator === ">" || expression.operator === ">=" || expression.operator === "<" || expression.operator === "<=") {
            return this.evaluateComparisonBinaryExpression(leftHandSide as NumberValue, rightHandSide as NumberValue, expression.operator);
        } else {
            return this.evaluateNumericBinaryExpression(leftHandSide as NumberValue, rightHandSide as NumberValue, expression.operator);
        }
    }

    private evaluateUnaryExpression(expression: UnaryExpression, id: string): RuntimeValue {
        const operator = expression.operator;
        const value = this.evaluateRuntimeValue(expression.value, id);

        if (operator === "-") {
            if (value.type !== ValueType.Number) {
                return Error.runtime("Unary expression requires numeric value as operand");
            }

            return { type: ValueType.Number, value: -(value as NumberValue).value } as NumberValue;
        }

        if (operator === "!") {
            if (value.type !== ValueType.Boolean) {
                return Error.runtime("Unary expression requires boolean value as operand");
            }

            return { type: ValueType.Boolean, value: !(value as BooleanValue).value } as BooleanValue;
        }

        return { type: ValueType.Number, value: (value as NumberValue).value } as NumberValue;
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
            result = leftHandSide.value === rightHandSide.value;
        } else if (operator === "!=") {
            result = leftHandSide.value !== rightHandSide.value;
        }

        return { type: ValueType.Boolean, value: result } as BooleanValue;
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
                return Error.runtime("Division by zero not allowed") as RuntimeError;
            }

            result = leftHandSide.value / rightHandSide.value;
        } else {
            if (rightHandSide.value === 0) {
                return Error.runtime("Modulo by zero not allowed") as RuntimeError;
            }

            result = this.customModulo(leftHandSide.value, rightHandSide.value);
        }
    
        return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
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

        if (leftHandSide.type === ValueType.Boolean && rightHandSide.type === ValueType.Boolean) {
            if (expression.operator === "and") {
                const leftValue = (leftHandSide as BooleanValue).value;
                const rightValue = (rightHandSide as BooleanValue).value;

                const result = leftValue && rightValue;

                return { type: ValueType.Boolean, value: result } as BooleanValue;
            } else if (expression.operator === "or") {
                const leftValue = (leftHandSide as BooleanValue).value;
                const rightValue = (rightHandSide as BooleanValue).value;

                const result = leftValue || rightValue;

                return { type: ValueType.Boolean, value: result } as BooleanValue;
            }
        }

        return Error.runtime("Logical expression requires boolean operands") as RuntimeError;
    }

    private evaluateConditionalExpression(expression: ConditionalExpression, id: string): RuntimeValue {
        const condition = this.evaluateRuntimeValue(expression.condition, id);

        if (this.isError(condition)) {
            return condition as RuntimeError;
        }

        if (condition.type !== ValueType.Boolean) {
            return Error.runtime("If statement requires a boolean expression as its condition");
        }

        const result = (condition as BooleanValue).value ? expression.consequent : expression.alternate;
        
        return this.evaluateRuntimeValue(result, id);
    }

    private evaluateCallExpression(expression: CallExpression, id: string): RuntimeValue {
        if (expression.caller.type !== NodeType.Identifier) {
            return Error.runtime("Function call be an identifier") as RuntimeError;
        }

        const identifier = (expression.caller as Identifier).identifier;
        const func = this.environment.lookupVariable(identifier);

        if (!func) {
            return Error.runtime(`Function with the identifier '${identifier}; does not exist`) as RuntimeError;
        }

        if (func.type !== ValueType.Function) {
            return Error.runtime(`Identifier '${identifier}' is not a function`) as RuntimeError;
        }

        const args: RuntimeValue[] = [];

        for (const arg of expression.args) {
            const argValue = this.evaluateRuntimeValue(arg, id);

            if (this.isError(argValue)) {
                return argValue as RuntimeError;
            }

            args.push(argValue);
        }

        return (func as FunctionValue).call(args);
    }

    private evaluateLambdaExpression(expression: LambdaExpression, id: string): RuntimeValue {
        const agents: RuntimeValue = this.evaluateRuntimeValue(expression.base, id);
        const param: IdentifierValue = { type: ValueType.Identifier, value: expression.param } as IdentifierValue;

        if (agents.type !== ValueType.Agents) {
            return Error.runtime("Lambda expression requires 'agents' as base argument");
        }

        const runtimeAgents = (agents as AgentsValue).value.filter((agent: RuntimeAgent) => agent.id !== id);
        const results: RuntimeValue[] = [];

        for (const agent of runtimeAgents) {
            this.lambdaEnv.declareVariable(param.value, { type: ValueType.Agent, value: agent } as AgentValue);

            const result = this.evaluateRuntimeValue(expression.value, id);
            results.push(result);
        }

        return {
            type: ValueType.Lambda,
            agents: runtimeAgents,
            results
        } as LambdaValue;
    }

    private evaluateMemberExpression(expression: MemberExpression, id: string): RuntimeValue {
        const caller = this.evaluateRuntimeValue(expression.caller, id);

        if (this.isError(caller)) {
            return caller as RuntimeError;
        }

        if (caller.type !== ValueType.Agent) {
            return Error.runtime(`Expected the caller of member expression to be of type 'agent', got type '${caller.type}'`) as RuntimeError;
        }

        if (expression.value.type !== NodeType.Identifier) {
            return Error.runtime(`Expected the value of member expression to be of type 'identifier', got type '${expression.value.type}'`) as RuntimeError;
        }

        const agent = (caller as AgentValue).value;
        const variableIdentifier = (expression.value as Identifier).identifier;

        if (!agent.variables.has(variableIdentifier)) {
            return Error.runtime(`Agent does not have variable with identifier '${variableIdentifier}' in member expression`) as RuntimeError;
        }

        const variableValue = agent.variables.get(variableIdentifier);

        if (!variableValue) {
            return Error.runtime(`Agent does not have variable with identifier '${variableIdentifier}' in member expression`) as RuntimeError;
        }

        return variableValue;
    }

    private isError(node: RuntimeValue): boolean {
        return node.type === ValueType.Error;
    }

    private customModulo(a: number, b: number): number {
        return ((a % b) + b) % b;
    }

    private getAgent(id: string, output: RuntimeOutput): RuntimeAgent | undefined {
        let agents: RuntimeAgent[] = output.agents.filter((agent: RuntimeAgent) => agent.id === id);

        if (agents.length !== 1) {
            return undefined;
        }

        return agents[0];
    }

    private getAgentId(identifier: string, id: number): string {
        return `${identifier}-${id}`;
    }

    private provideDataToIndexFunction(index: number): void {
        this.environment.assignVariable("index", createGlobalFunction(this.createIndexFunction(index)));
    }

    private provideDataToAgentsFunction(agents: RuntimeAgent[], id: string): void {
        this.environment.assignVariable("agents", createGlobalFunction(this.createAgentsFunction(agents, id)));
    }

    private provideDataToStepFunction(step: number): void {
        this.environment.assignVariable("step", createGlobalFunction(this.createStepFunction(step)));
    }

    private createIndexFunction(index: number): FunctionCall {
        function indexFunction(args: RuntimeValue[]): RuntimeValue {
            if (args.length !== 0) {
                return Error.runtime(`Function 'index' requires 0 arguments, ${args.length} provided`);
            }

            return { type: ValueType.Number, value: index } as NumberValue;
        }

        return indexFunction;
    }

    private createAgentsFunction(agents: RuntimeAgent[], id: string): FunctionCall {
        function agentsFunction(args: RuntimeValue[]): RuntimeValue {
            if (args.length !== 1) {
                return Error.runtime(`Function 'agents' requires 1 argument, ${args.length} provided`);
            }

            if (args[0].type !== ValueType.Identifier) {
                return Error.runtime("Function 'agents' requires an identifier arguments" );
            }

            const identifier = (args[0] as IdentifierValue).value;
            
            return {
                type: ValueType.Agents,
                value: agents.filter((agent: RuntimeAgent) => agent.id.split("-")[0] === identifier && agent.id !== id)
            } as AgentsValue;
        }

        return agentsFunction;
    }

    private createStepFunction(step: number): FunctionCall {
        function stepFunction(args: RuntimeValue[]): RuntimeValue {
            if (args.length !== 0) {
                return Error.runtime(`Function 'step' requires 0 arguments, ${args.length} provided`);
            }
        
            return { type: ValueType.Number, value: step } as NumberValue;
        }

        return stepFunction;
    }
}