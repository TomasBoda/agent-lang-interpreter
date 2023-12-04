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
    OtherwiseExpression,
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
    RuntimeOutput,
    RuntimeValue,
    ValueType,
} from "./runtime.types";
import { Environment } from "./environment";
import { createGlobalFunction, normalizeNumber } from "../utils/functions";
import { ErrorRuntime } from "../utils/errors";

export class Runtime {

    private program: Program;

    private environment: Environment;
    private lambdaEnv: Environment;

    private output: RuntimeOutput = { type: ValueType.Output, step: 0, agents: [] };

    private inOtherwiseExpression = false;

    constructor(program: Program, environment: Environment) {
        this.program = program;

        this.environment = environment;

        this.environment.declareVariable("step", createGlobalFunction(this.createStepFunction(0)));
        this.environment.declareVariable("agents", createGlobalFunction(this.createAgentsFunction([], "")));
        this.environment.declareVariable("index", createGlobalFunction(this.createIndexFunction(0)));

        this.lambdaEnv = new Environment();
    }

    // run code
    public run(step: number): RuntimeValue {
        this.output.step = step;
        this.provideDataToStepFunction(step);

        return this.evaluateProgram(this.program);
    }

    // set new program
    public setProgram(program: Program): void {
        this.program = program;
    }

    // reset output
    public reset(): void {
        this.output = { type: ValueType.Output, step: 0, agents: [] };
    }

    private evaluateProgram(program: Program): RuntimeValue {
        for (const statement of program.body) {
            if (statement.type !== NodeType.ObjectDeclaration) {
                throw new ErrorRuntime("Only object declarations are allowed in program body");
            }

            const objectDeclaration: ObjectDeclaration = statement as ObjectDeclaration;

            for (let i = 0; i < objectDeclaration.count; i++) {
                const agentId = this.getAgentId(objectDeclaration.identifier, i);

                this.provideDataToIndexFunction(i);
                this.provideDataToAgentsFunction(this.output.agents, agentId);

                this.evaluateObjectDeclaration(objectDeclaration, agentId);
            }
        }

        return this.output;
    }

    private evaluateObjectDeclaration(declaration: ObjectDeclaration, id: string): void {
        const identifier = declaration.identifier;
        const variables = new Map<string, RuntimeValue>();

        // declare agent identifier as global variable for later use in 'agents' method
        this.environment.declareVariable(identifier, { type: ValueType.Identifier, value: identifier } as IdentifierValue);

        if (this.output.step === 0) {
            this.output.agents.push({ id, identifier, variables } as RuntimeAgent);
        }

        for (const statement of declaration.body) {
            if (statement.type !== NodeType.VariableDeclaration) {
                throw new ErrorRuntime("Only variable declarations are allowed in object declaration body");
            }

            const variableDeclaration: VariableDeclaration = statement as VariableDeclaration;

            const variableIdentifier = variableDeclaration.identifier;
            const variableValue = this.evaluateVariableDeclaration(variableDeclaration, id);

            if (this.output.step === 0) {
                variables.set(variableIdentifier, variableValue);
                continue;
            }

            const agent = this.findAgent(id);
            agent.variables.set(variableIdentifier, variableValue);
        }
    }

    private evaluateVariableDeclaration(declaration: VariableDeclaration, id: string): RuntimeValue {
        switch (declaration.variableType) {
            case VariableType.Property: {
                // handle default value in step 0
                if (declaration.default && this.output.step === 0) {
                    return this.evaluateRuntimeValue(declaration.default, id);
                }
        
                return this.evaluateRuntimeValue(declaration.value, id);
            }
            case VariableType.Const: {
                // evaluate const in step 0
                if (this.output.step === 0) {
                    return this.evaluateRuntimeValue(declaration.value, id);
                }

                const agent = this.findAgent(id);
                const previousConstValue: RuntimeValue | undefined = agent.variables.get(declaration.identifier);

                if (!previousConstValue) {
                    throw new ErrorRuntime("Previous value of const `${declaration.identifier}` in agent `${id}` not found");
                }

                return previousConstValue;
            }
            default: {
                throw new ErrorRuntime("Unrecognized variable type in variable declaration");
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
            case NodeType.OtherwiseExpression:
                return this.evaluateOtherwiseExpression(node as OtherwiseExpression, id);
            default:
                throw new ErrorRuntime(`Unknown runtime node '${node.type}'`);
        }
    }

    private evaluateNumericLiteral(numericLiteral: NumericLiteral): RuntimeValue {
        return {
            type: ValueType.Number,
            value: normalizeNumber(numericLiteral.value)
        } as NumberValue;
    }

    private evaluateBooleanLiteral(booleanLiteral: BooleanLiteral): RuntimeValue {
        return {
            type: ValueType.Boolean,
            value: booleanLiteral.value
        } as BooleanValue;
    }

    private evaluateIdentifier(identifier: Identifier, id: string): RuntimeValue {
        // check whether identifier is a lambda variable
        const lambdaLookup = this.lambdaEnv.lookupVariable(identifier.identifier);
        if (lambdaLookup) {
            return lambdaLookup;
        }

        // check whether identifier is an agent variable
        const variableLookup = this.environment.lookupVariable(identifier.identifier);
        if (variableLookup) {
            return variableLookup;
        }

        const agent = this.findAgent(id);
        const variableValue: RuntimeValue | undefined = agent.variables.get(identifier.identifier);

        if (!variableValue) {
            throw new ErrorRuntime(`Variable '${identifier.identifier}' in agent '${id}' does not exist`);
        }

        return variableValue;
    }

    private evaluateBinaryExpression(expression: BinaryExpression, id: string): RuntimeValue {
        const leftHandSide = this.evaluateRuntimeValue(expression.left, id);
        const rightHandSide = this.evaluateRuntimeValue(expression.right, id);

        // handle otherwise expression
        if (this.inOtherwiseExpression && leftHandSide.type === ValueType.Null) {
            return leftHandSide;
        }

        // handle otherwise expression
        if (this.inOtherwiseExpression && rightHandSide.type === ValueType.Null) {
            return rightHandSide;
        }

        const isValid = (
            (expression.operator === "==" || expression.operator === "!=") &&
            (
                (leftHandSide.type === ValueType.Number && rightHandSide.type === ValueType.Number) ||
                (leftHandSide.type === ValueType.Boolean && rightHandSide.type === ValueType.Boolean)
            )
        )
            || (leftHandSide.type === ValueType.Number && rightHandSide.type === ValueType.Number);

        if (!isValid) {
            throw new ErrorRuntime("Binary expression requires numeric or boolean operands");
        }
    
        // comparison binary expression
        if (expression.operator === "==" || expression.operator === "!=" || expression.operator === ">" || expression.operator === ">=" || expression.operator === "<" || expression.operator === "<=") {
            return this.evaluateComparisonBinaryExpression(leftHandSide as NumberValue, rightHandSide as NumberValue, expression.operator);
        }
        
        // numeric binary expression
        return this.evaluateNumericBinaryExpression(leftHandSide as NumberValue, rightHandSide as NumberValue, expression.operator);
    }

    private evaluateUnaryExpression(expression: UnaryExpression, id: string): RuntimeValue {
        const operator = expression.operator;
        const value = this.evaluateRuntimeValue(expression.value, id);

        // handle otherwise expression
        if (this.inOtherwiseExpression && value.type === ValueType.Null) {
            return value;
        }

        if (operator === "-") {
            if (value.type !== ValueType.Number) {
                throw new ErrorRuntime("Unary expression with '-' operator requires numeric value as operand");
            }

            return { type: ValueType.Number, value: -(value as NumberValue).value } as NumberValue;
        }

        if (operator === "!") {
            if (value.type !== ValueType.Boolean) {
                throw new ErrorRuntime("Unary expression with '!' requires boolean value as operand");
            }

            return { type: ValueType.Boolean, value: !(value as BooleanValue).value } as BooleanValue;
        }

        throw new ErrorRuntime("Unary expression requires operator '-' or '!', but '${operator}' was provided");
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
                throw new ErrorRuntime("Division by zero not allowed");
            }

            result = leftHandSide.value / rightHandSide.value;
        } else {
            if (rightHandSide.value === 0) {
                throw new ErrorRuntime("Modulo by zero not allowed");
            }

            result = this.customModulo(leftHandSide.value, rightHandSide.value);
        }
    
        return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
    }

    private evaluateLogicalExpression(expression: LogicalExpression, id: string): RuntimeValue {
        const leftHandSide = this.evaluateRuntimeValue(expression.left, id);
        const rightHandSide = this.evaluateRuntimeValue(expression.right, id);

        // handle otherwise expression
        if (this.inOtherwiseExpression && leftHandSide.type === ValueType.Null) {
            return leftHandSide;
        }

        // handle otherwise expression
        if (this.inOtherwiseExpression && rightHandSide.type === ValueType.Null) {
            return rightHandSide;
        }

        if (leftHandSide.type === ValueType.Boolean && rightHandSide.type === ValueType.Boolean) {
            let result;

            if (expression.operator === "and") {
                const leftValue = (leftHandSide as BooleanValue).value;
                const rightValue = (rightHandSide as BooleanValue).value;
                result = leftValue && rightValue;
            } else if (expression.operator === "or") {
                const leftValue = (leftHandSide as BooleanValue).value;
                const rightValue = (rightHandSide as BooleanValue).value;
                result = leftValue || rightValue;
            }

            return { type: ValueType.Boolean, value: result } as BooleanValue;
        }

        throw new ErrorRuntime("Logical expression requires boolean operands");
    }

    private evaluateConditionalExpression(expression: ConditionalExpression, id: string): RuntimeValue {
        const condition = this.evaluateRuntimeValue(expression.condition, id);

        // handle otherwise expression
        if (this.inOtherwiseExpression && condition.type === ValueType.Null) {
            return condition;
        }

        if (condition.type !== ValueType.Boolean) {
            throw new ErrorRuntime("Conditional expression requires a boolean expression as its condition");
        }

        const result = (condition as BooleanValue).value ? expression.consequent : expression.alternate;
        return this.evaluateRuntimeValue(result, id);
    }

    private evaluateCallExpression(expression: CallExpression, id: string): RuntimeValue {
        if (expression.caller.type !== NodeType.Identifier) {
            throw new ErrorRuntime("Function call must be an identifier");
        }

        const identifier = (expression.caller as Identifier).identifier;
        const func = this.environment.lookupVariable(identifier);

        if (!func) {
            throw new ErrorRuntime(`Function with identifier '${identifier}' does not exist`);
        }

        if (func.type !== ValueType.Function) {
            throw new ErrorRuntime(`Identifier '${identifier}' is not a function`);
        }

        const args: RuntimeValue[] = expression.args.map(expression => this.evaluateRuntimeValue(expression, id));

        return (func as FunctionValue).call(args);
    }

    private evaluateLambdaExpression(expression: LambdaExpression, id: string): RuntimeValue {
        const agents: RuntimeValue = this.evaluateRuntimeValue(expression.base, id);
        const param: IdentifierValue = { type: ValueType.Identifier, value: expression.param } as IdentifierValue;

        if (agents.type !== ValueType.Agents) {
            throw new ErrorRuntime("Lambda expression requires base argument of type 'agents'");
        }

        const runtimeAgents = (agents as AgentsValue).value.filter((agent: RuntimeAgent) => agent.id !== id);
        const results: RuntimeValue[] = [];

        for (const agent of runtimeAgents) {
            this.lambdaEnv.declareVariable(param.value, { type: ValueType.Agent, value: agent } as AgentValue);
            results.push(this.evaluateRuntimeValue(expression.value, id));
        }

        return {
            type: ValueType.Lambda,
            agents: runtimeAgents,
            results
        } as LambdaValue;
    }

    private evaluateMemberExpression(expression: MemberExpression, id: string): RuntimeValue {
        const caller = this.evaluateRuntimeValue(expression.caller, id);

        // handle otherwise expression
        if (this.inOtherwiseExpression && caller.type === ValueType.Null) {
            return caller;
        }

        if (caller.type !== ValueType.Agent) {
            throw new ErrorRuntime("The caller of member expression must be of type 'agent'");
        }

        if (expression.value.type !== NodeType.Identifier) {
            throw new ErrorRuntime("The value of member expression must be of type 'identifier'");
        }

        const agent = (caller as AgentValue).value;
        const member = (expression.value as Identifier).identifier;

        const value = agent.variables.get(member);

        if (!value) {
            throw new ErrorRuntime(`Agent does not have variable with identifier '${member}' in member expression`);
        }

        return value;
    }

    private evaluateOtherwiseExpression(expression: OtherwiseExpression, id: string): RuntimeValue {
        this.inOtherwiseExpression = true;
        const left = this.evaluateRuntimeValue(expression.left, id);
        this.inOtherwiseExpression = false;

        if (left.type === ValueType.Null) {
            return this.evaluateRuntimeValue(expression.right, id);
        }

        return left;
    }

    private customModulo(a: number, b: number): number {
        return ((a % b) + b) % b;
    }

    private findAgent(id: string): RuntimeAgent {
        const agent = this.output.agents.find((agent: RuntimeAgent) => agent.id === id);

        if (!agent) {
            throw new ErrorRuntime(`Agent with id '${id}' not found`);
        }

        return agent;
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
                throw new ErrorRuntime(`Function 'index' requires 0 arguments, ${args.length} provided`);
            }

            return { type: ValueType.Number, value: index } as NumberValue;
        }

        return indexFunction;
    }

    private createAgentsFunction(agents: RuntimeAgent[], id: string): FunctionCall {
        function agentsFunction(args: RuntimeValue[]): RuntimeValue {
            if (args.length !== 1) {
                throw new ErrorRuntime(`Function 'agents' requires 1 argument, ${args.length} provided`);
            }

            if (args[0].type !== ValueType.Identifier) {
                throw new ErrorRuntime("Function 'agents' requires an identifier arguments" );
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
                throw new ErrorRuntime(`Function 'step' requires 0 arguments, ${args.length} provided`);
            }
        
            return { type: ValueType.Number, value: step } as NumberValue;
        }

        return stepFunction;
    }
}