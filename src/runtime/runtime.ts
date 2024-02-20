import { Position } from "../symbolizer";
import { BinaryExpression, BooleanLiteral, CallExpression, ConditionalExpression, DefineDeclaration, Identifier, LambdaExpression, LogicalExpression, MemberExpression, NodeType, NumericLiteral, ObjectDeclaration, OtherwiseExpression, ParserValue, Program, Statement, UnaryExpression, VariableDeclaration, VariableType } from "../parser";
import { AgentsValue, AgentValue, BooleanValue, FunctionCall, FunctionValue, IdentifierValue, LambdaValue, NumberValue, RuntimeAgent, RuntimeOutput, RuntimeValue, ValueType } from "./model";
import { Environment } from "./environment";
import { ErrorRuntime } from "../utils";
import { createGlobalFunction } from "./functions";

export class Runtime {

    private program: Program;

    private globalEnvironment: Environment;
    private lambdaEnvironment: Environment;

    private previousAgents: RuntimeAgent[] = [];
    private output: RuntimeOutput = { type: ValueType.Output, step: 0, agents: [] };

    private inOtherwiseExpression = false;

    constructor(program: Program, environment: Environment) {
        this.program = program;
        this.globalEnvironment = environment;

        this.globalEnvironment.declareVariable("step", createGlobalFunction(this.createStepFunction(0)));
        this.globalEnvironment.declareVariable("agents", createGlobalFunction(this.createAgentsFunction([], "")));
        this.globalEnvironment.declareVariable("index", createGlobalFunction(this.createIndexFunction(0)));

        this.lambdaEnvironment = new Environment();
    }

    public run(step: number): RuntimeValue {
        this.output.step = step;
        this.provideDataToStepFunction(step);

        const result: RuntimeValue = { ...this.evaluateProgram(this.program) };

        if (step > 0) {
            this.previousAgents = [ ...this.output.agents ];
            this.output.agents = [];
        }

        return result;
    }

    private evaluateProgram(program: Program): RuntimeValue {
        for (const statement of program.body) {
            switch (statement.type) {
                case NodeType.DefineDeclaration:
                    const defineDeclaration: DefineDeclaration = this.getDefineDeclaration(statement);
                    this.evaluateDefineDeclaration(defineDeclaration);
                    break;
                case NodeType.ObjectDeclaration:
                    const objectDeclaration: ObjectDeclaration = this.getObjectDeclaration(statement);
                    this.evaluateObjectDeclarationList(objectDeclaration);
                    break;
                default:
                    throw new ErrorRuntime(`Only object and define declarations are allowed in program body`, statement.position);
            }
        }

        return this.output;
    }

    private evaluateDefineDeclaration(declaration: DefineDeclaration): void {
        const { identifier, value, position } = declaration;

        let result: RuntimeValue;

        switch (value.type) {
            case NodeType.NumericLiteral:
                result = this.evaluateNumericLiteral(value as NumericLiteral);
                break;
            case NodeType.BooleanLiteral:
                result = this.evaluateBooleanLiteral(value as BooleanLiteral);
                break;
            default:
                throw new ErrorRuntime(`Only numeric and boolean literals are allowed in define declaration`, position);
        }

        this.globalEnvironment.declareVariable(identifier, result);
    }

    private evaluateObjectDeclarationList(declaration: ObjectDeclaration): void {
        let count: RuntimeValue;

        switch (declaration.count.type) {
            case NodeType.NumericLiteral:
                count = this.evaluateNumericLiteral(declaration.count as NumericLiteral);
                break;
            case NodeType.Identifier:
                count = this.evaluateGlobalIdentifier(declaration.count as Identifier);
                break;
            default:
                throw new ErrorRuntime(`Unknown runtime node '${declaration.count.type}' in agent count`, declaration.count.position);
        }

        if (count.type !== ValueType.Number) {
            throw new ErrorRuntime("Agent count is not a number", declaration.position);
        }

        for (let i = 0; i < (count as NumberValue).value; i++) {
            const agentId = this.generateAgentId(declaration.identifier, i);

            this.provideDataToIndexFunction(i);
            this.provideDataToAgentsFunction(this.previousAgents, agentId);

            this.evaluateObjectDeclaration(declaration, agentId);
        }
    }

    private evaluateObjectDeclaration(declaration: ObjectDeclaration, id: string): void {
        const objectIdentifier = declaration.identifier;
        const objectVariables = new Map<string, RuntimeValue>();

        this.globalEnvironment.declareVariable(objectIdentifier, { type: ValueType.Identifier, value: objectIdentifier } as IdentifierValue);

        if (this.output.step === 0) {
            this.previousAgents.push({ id, identifier: objectIdentifier, variables: objectVariables } as RuntimeAgent);
        } else {
            this.output.agents.push({ id, identifier: objectIdentifier, variables: objectVariables } as RuntimeAgent);
        }

        for (const statement of declaration.body) {
            const variableDeclaration: VariableDeclaration = this.getVariableDeclaration(statement);

            const variableIdentifier = variableDeclaration.identifier;
            const variableValue = this.evaluateVariableDeclaration(variableDeclaration, id);

            objectVariables.set(variableIdentifier, variableValue);
        }
    }

    private evaluateVariableDeclaration(declaration: VariableDeclaration, id: string): RuntimeValue {
        switch (declaration.variableType) {
            case VariableType.Property:
                return this.evaluatePropertyDeclaration(declaration, id);
            case VariableType.Const:
                return this.evaluateConstDeclaration(declaration, id);
            default: {
                throw new ErrorRuntime("Unrecognized property type in property declaration", declaration.position);
            }
        }
    }

    private evaluatePropertyDeclaration(declaration: VariableDeclaration, id: string): RuntimeValue {
        if (declaration.default && this.output.step === 0) {
            return this.evaluateRuntimeValue(declaration.default, id);
        }

        return this.evaluateRuntimeValue(declaration.value, id);
    }

    private evaluateConstDeclaration(declaration: VariableDeclaration, id: string): RuntimeValue {
        if (this.output.step === 0) {
            return this.evaluateRuntimeValue(declaration.value, id);
        }

        const agent = this.findAgent(id);
        const previousConstValue = agent.variables.get(declaration.identifier);

        if (!previousConstValue) {
            throw new ErrorRuntime(`Previous value of const '${declaration.identifier}' in agent '${id}' not found`, declaration.position);
        }

        return previousConstValue;
    }

    private evaluateRuntimeValue(node: ParserValue, id: string): RuntimeValue {
        switch (node.type) {
            case NodeType.Identifier:
                return this.evaluateIdentifier(node as Identifier, id);
            case NodeType.NumericLiteral:
                return this.evaluateNumericLiteral(node as NumericLiteral);
            case NodeType.BooleanLiteral:
                return this.evaluateBooleanLiteral(node as BooleanLiteral);
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
                throw new ErrorRuntime(`Unknown runtime node '${node.type}'`, node.position);
        }
    }

    private evaluateNumericLiteral(numericLiteral: NumericLiteral): RuntimeValue {
        const numberValue: NumberValue = {
            type: ValueType.Number,
            value: numericLiteral.value
        };

        return numberValue;
    }

    private evaluateBooleanLiteral(booleanLiteral: BooleanLiteral): RuntimeValue {
        const booleanValue: BooleanValue = {
            type: ValueType.Boolean,
            value: booleanLiteral.value
        };

        return booleanValue;
    }

    private evaluateIdentifier(identifier: Identifier, id: string): RuntimeValue {
        const lambdaLookup = this.lambdaEnvironment.lookupVariable(identifier.identifier);
        if (lambdaLookup) {
            return lambdaLookup;
        }

        const variableLookup = this.globalEnvironment.lookupVariable(identifier.identifier);
        if (variableLookup) {
            return variableLookup;
        }

        const agent = this.findAgent(id);
        const variableValue = agent.variables.get(identifier.identifier);
        if (variableValue) {
            return variableValue;
        }

        throw new ErrorRuntime(`Variable '${identifier.identifier}' in agent '${id}' does not exist`, identifier.position);
    }

    private evaluateGlobalIdentifier(identifier: Identifier): RuntimeValue {
        const variableLookup = this.globalEnvironment.lookupVariable(identifier.identifier);

        if (!variableLookup) {
            throw new ErrorRuntime("Agent count identifier does not exist", identifier.position);
        }

        return variableLookup;
    }

    private evaluateBinaryExpression(expression: BinaryExpression, id: string): RuntimeValue {
        const leftHandSide = this.evaluateRuntimeValue(expression.left, id);
        const rightHandSide = this.evaluateRuntimeValue(expression.right, id);

        if (this.inOtherwiseExpression && leftHandSide.type === ValueType.Null) {
            if (leftHandSide.type === ValueType.Null) {
                return leftHandSide;
            }
        
            if (rightHandSide.type === ValueType.Null) {
                return rightHandSide;
            }
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
            throw new ErrorRuntime("Binary expression requires numeric or boolean operands", expression.position);
        }
    
        // comparison binary expression
        if (expression.operator === "==" || expression.operator === "!=" || expression.operator === ">" || expression.operator === ">=" || expression.operator === "<" || expression.operator === "<=") {
            return this.evaluateComparisonBinaryExpression(leftHandSide as NumberValue, rightHandSide as NumberValue, expression.operator);
        }
        
        // numeric binary expression
        return this.evaluateNumericBinaryExpression(leftHandSide as NumberValue, rightHandSide as NumberValue, expression.operator, expression.position);
    }

    private evaluateUnaryExpression(expression: UnaryExpression, id: string): RuntimeValue {
        const { operator } = expression;
        const value = this.evaluateRuntimeValue(expression.value, id);

        if (this.inOtherwiseExpression && value.type === ValueType.Null) {
            return value;
        }

        if (operator === "-") {
            if (value.type !== ValueType.Number) {
                throw new ErrorRuntime("Unary expression with '-' operator requires numeric value as operand", expression.position);
            }

            return { type: ValueType.Number, value: -(value as NumberValue).value } as NumberValue;
        }

        if (operator === "!") {
            if (value.type !== ValueType.Boolean) {
                throw new ErrorRuntime("Unary expression with '!' requires boolean value as operand", expression.position);
            }

            return { type: ValueType.Boolean, value: !(value as BooleanValue).value } as BooleanValue;
        }

        throw new ErrorRuntime("Unary expression requires operator '-' or '!', but '${operator}' was provided", expression.position);
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
        } else {
            throw new ErrorRuntime(`Unsupported operator '${operator}' in binary expression`);
        }

        return { type: ValueType.Boolean, value: result } as BooleanValue;
    }

    private evaluateNumericBinaryExpression(leftHandSide: NumberValue, rightHandSide: NumberValue, operator: string, position: Position): RuntimeValue {
        let result = 0;
    
        if (operator === "+") {
            result = leftHandSide.value + rightHandSide.value;
        } else if (operator === "-") {
            result = leftHandSide.value - rightHandSide.value;
        } else if (operator === "*") {
            result = leftHandSide.value * rightHandSide.value;
        } else if (operator === "/") {
            if (rightHandSide.value === 0) {
                throw new ErrorRuntime("Division by zero not allowed", position);
            }

            result = leftHandSide.value / rightHandSide.value;
        } else {
            if (rightHandSide.value === 0) {
                throw new ErrorRuntime("Modulo by zero not allowed", position);
            }

            result = this.customModulo(leftHandSide.value, rightHandSide.value);
        }
    
        return { type: ValueType.Number, value: result } as NumberValue;
    }

    private evaluateLogicalExpression(expression: LogicalExpression, id: string): RuntimeValue {
        const leftHandSide = this.evaluateRuntimeValue(expression.left, id);
        const rightHandSide = this.evaluateRuntimeValue(expression.right, id);

        if (this.inOtherwiseExpression && leftHandSide.type === ValueType.Null) {
            if (leftHandSide.type === ValueType.Null) {
                return leftHandSide;
            }
        
            if (rightHandSide.type === ValueType.Null) {
                return rightHandSide;
            }
        }

        if (leftHandSide.type !== ValueType.Boolean || rightHandSide.type !== ValueType.Boolean) {
            throw new ErrorRuntime("Logical expression requires boolean operands", expression.position);
        }

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

    private evaluateConditionalExpression(expression: ConditionalExpression, id: string): RuntimeValue {
        const condition = this.evaluateRuntimeValue(expression.condition, id);

        if (this.inOtherwiseExpression && condition.type === ValueType.Null) {
            return condition;
        }

        if (condition.type !== ValueType.Boolean) {
            throw new ErrorRuntime("Conditional expression requires a boolean expression as its condition", expression.position);
        }

        const result = (condition as BooleanValue).value ? expression.consequent : expression.alternate;

        return this.evaluateRuntimeValue(result, id);
    }

    private evaluateCallExpression(expression: CallExpression, id: string): RuntimeValue {
        if (expression.caller.type !== NodeType.Identifier) {
            throw new ErrorRuntime("Function caller must be an identifier", expression.position);
        }

        const identifier = (expression.caller as Identifier).identifier;
        const func = this.globalEnvironment.lookupVariable(identifier);

        if (!func) {
            throw new ErrorRuntime(`Function with identifier '${identifier}' does not exist`, expression.position);
        }

        if (func.type !== ValueType.Function) {
            throw new ErrorRuntime(`Identifier '${identifier}' is not a function`, expression.position);
        }

        const args: RuntimeValue[] = expression.args.map(expression => this.evaluateRuntimeValue(expression, id));

        return (func as FunctionValue).call(args);
    }

    private evaluateLambdaExpression(expression: LambdaExpression, id: string): RuntimeValue {
        const agents: RuntimeValue = this.evaluateRuntimeValue(expression.base, id);
        const param: IdentifierValue = { type: ValueType.Identifier, value: expression.param } as IdentifierValue;

        if (agents.type !== ValueType.Agents) {
            throw new ErrorRuntime("Lambda expression requires base argument of type 'agents'", expression.position);
        }

        const runtimeAgents = (agents as AgentsValue).value.filter((agent: RuntimeAgent) => agent.id !== id);
        const results: RuntimeValue[] = [];

        for (const agent of runtimeAgents) {
            this.lambdaEnvironment.declareVariable(param.value, { type: ValueType.Agent, value: agent } as AgentValue);
            results.push(this.evaluateRuntimeValue(expression.value, id));
        }

        const lambdaValue: LambdaValue = {
            type: ValueType.Lambda,
            agents: runtimeAgents,
            results
        };

        return lambdaValue;
    }

    private evaluateMemberExpression(expression: MemberExpression, id: string): RuntimeValue {
        const caller = this.evaluateRuntimeValue(expression.caller, id);

        if (this.inOtherwiseExpression && caller.type === ValueType.Null) {
            return caller;
        }

        if (caller.type !== ValueType.Agent) {
            throw new ErrorRuntime("The caller of member expression must be of type 'agent'", expression.position);
        }

        if (expression.value.type !== NodeType.Identifier) {
            throw new ErrorRuntime("The value of member expression must be of type 'identifier'", expression.position);
        }

        const agent = (caller as AgentValue).value;
        const member = (expression.value as Identifier).identifier;

        const value = agent.variables.get(member);

        if (!value) {
            throw new ErrorRuntime(`Agent does not have variable with identifier '${member}' in member expression`, expression.position);
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

    // return DefineDeclaration if possible, throw an error otherwise
    private getDefineDeclaration(statement: Statement): DefineDeclaration {
        if (statement.type !== NodeType.DefineDeclaration) {
            throw new ErrorRuntime("Only object or define declarations are allowed in program body", statement.position);
        }

        return statement as DefineDeclaration;
    }

    // return ObjectDeclaration if possible, throw an error otherwise
    private getObjectDeclaration(statement: Statement): ObjectDeclaration {
        if (statement.type !== NodeType.ObjectDeclaration) {
            throw new ErrorRuntime("Only object or define declarations are allowed in program body", statement.position);
        }

        return statement as ObjectDeclaration;
    }

    // return VariableDeclaration if possible, throw an error otherwise
    private getVariableDeclaration(statement: Statement): VariableDeclaration {
        if (statement.type !== NodeType.VariableDeclaration) {
            throw new ErrorRuntime("Only variable declarations are allowed in object declaration body", statement.position);
        }

        return statement as VariableDeclaration;
    }

    private customModulo(a: number, b: number): number {
        return ((a % b) + b) % b;
    }

    // find agent by identifier
    private findAgent(id: string): RuntimeAgent {
        const agent = this.previousAgents.find((agent: RuntimeAgent) => agent.id === id);

        if (!agent) {
            throw new ErrorRuntime(`Agent with id '${id}' not found`);
        }

        return agent;
    }

    // generate custom agent identifier
    private generateAgentId(identifier: string, id: number): string {
        return `${identifier}-${id}`;
    }

    public setProgram(program: Program): void {
        this.program = program;
    }

    public reset(): void {
        this.output = { type: ValueType.Output, step: 0, agents: [] };
    }
    
    public updateAgentValue(agentIndex: number, propertyIdentifier: string, value: number): void {
        this.previousAgents[agentIndex].variables.set(propertyIdentifier, { type: ValueType.Number, value } as NumberValue);
    }

    // runtime functions

    private provideDataToIndexFunction(index: number): void {
        this.globalEnvironment.assignVariable("index", createGlobalFunction(this.createIndexFunction(index)));
    }

    private provideDataToAgentsFunction(agents: RuntimeAgent[], id: string): void {
        this.globalEnvironment.assignVariable("agents", createGlobalFunction(this.createAgentsFunction(agents, id)));
    }

    private provideDataToStepFunction(step: number): void {
        this.globalEnvironment.assignVariable("step", createGlobalFunction(this.createStepFunction(step)));
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