import { Position } from "../symbolizer/index.ts";
import { BinaryExpression, BooleanLiteral, CallExpression, ConditionalExpression, DefineDeclaration, Identifier, SetComprehensionExpression, LogicalExpression, MemberExpression, NodeType, NumericLiteral, ObjectDeclaration, OtherwiseExpression, ParserValue, Program, Statement, UnaryExpression, VariableDeclaration, VariableType } from "../parser/index.ts";
import { AgentsValue, AgentValue, BooleanValue, FunctionCall, FunctionValue, IdentifierValue, SetComprehensionValue, NumberValue, RuntimeAgent, RuntimeOutput, RuntimeValue, ValueType } from "./model/index.ts";
import { Environment } from "./environment.ts";
import { ErrorRuntime } from "../utils/index.ts";
import { createGlobalFunction } from "./functions/index.ts";

export class Runtime {

    private program: Program;

    private globalEnvironment: Environment;
    private setComprehensionEnvironment = new Environment();

    private previousAgents: RuntimeAgent[] = [];
    private output: RuntimeOutput = { type: ValueType.Output, step: 0, agents: [] };

    private inOtherwiseExpression = false;

    constructor(program: Program, environment: Environment) {
        this.program = program;
        this.globalEnvironment = environment;
        this.initializeRuntimeFunctions();
    }

    /**
     * Evaluates one step of the simulation
     * 
     * @param step step of the simulation to be evaluated
     * @returns output of the given step of the simulation
     */
    public run(step: number): RuntimeOutput {
        this.output.step = step;
        this.updateStepFunction(step);

        const evaluation = { ...this.evaluateProgram(this.program) };
        this.updateOutput();
        return evaluation;
    }

    /**
     * Evaluates the program AST node
     * 
     * @param program program AST node
     * @returns output of the given step of the simulation
     */
    private evaluateProgram(program: Program): RuntimeOutput {
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
                    throw new ErrorRuntime("Only object and define declarations are allowed in program body", statement.position);
            }
        }

        return this.output;
    }

    /**
     * Evaluates the define declaration AST node
     * 
     * @param declaration define declaration AST node
     */
    private evaluateDefineDeclaration(declaration: DefineDeclaration): void {
        if (this.output.step > 0) {
            return;
        }

        const { identifier, value, position } = declaration;

        let defineDeclarationValue: RuntimeValue;

        switch (value.type) {
            case NodeType.NumericLiteral:
                defineDeclarationValue = this.evaluateNumericLiteral(value as NumericLiteral);
                break;
            case NodeType.BooleanLiteral:
                defineDeclarationValue = this.evaluateBooleanLiteral(value as BooleanLiteral);
                break;
            default:
                throw new ErrorRuntime(`Only numeric and boolean literals are allowed in define declaration`, position);
        }

        this.globalEnvironment.declareVariable(identifier, defineDeclarationValue);
    }

    /**
     * Evaluates the object declaration AST node
     * 
     * @param declaration object declaration AST node
     */
    private evaluateObjectDeclarationList(declaration: ObjectDeclaration): void {
        const count = this.evaluateAgentCount(declaration);

        for (let i = 0; i < count.value; i++) {
            const id = this.generateAgentId(declaration.identifier, i);

            this.updateIndexFunction(i);
            this.updateAgentsFunction(this.previousAgents, id);

            this.evaluateObjectDeclaration(declaration, id);
        }
    }

    /**
     * Evaluates the agent count of the object declaration AST node
     * 
     * @param declaration define declaration AST node
     * @returns numeric runtime value
     */
    private evaluateAgentCount(declaration: ObjectDeclaration): NumberValue {
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

        return count as NumberValue;
    }

    /**
     * Evaluates the object declaration AST node
     * 
     * @param declaration object declaration AST node
     */
    private evaluateObjectDeclaration(declaration: ObjectDeclaration, id: string): void {
        const objectIdentifier = declaration.identifier;
        const objectVariables = new Map<string, RuntimeValue>();

        this.globalEnvironment.declareVariable(objectIdentifier, { type: ValueType.Identifier, value: objectIdentifier } as IdentifierValue);

        if (this.output.step === 0) {
            this.previousAgents.push({
                id,
                identifier: objectIdentifier,
                variables: objectVariables
            } as RuntimeAgent);
        } else {
            this.output.agents.push({
                id,
                identifier: objectIdentifier,
                variables: objectVariables
            } as RuntimeAgent);
        }

        for (const statement of declaration.body) {
            const variableDeclaration: VariableDeclaration = this.getVariableDeclaration(statement);

            const variableIdentifier = variableDeclaration.identifier;
            const variableValue = this.evaluateVariableDeclaration(variableDeclaration, id);

            objectVariables.set(variableIdentifier, variableValue);
        }
    }

    /**
     * Evaluates the variable declaration AST node
     * 
     * @param declaration variable declaration AST node
     * @param id id of the current agent
     * @returns runtime value of the variable declaration
     */
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

    /**
     * Evaluates the variable declaration AST node representing a property declaration
     * 
     * @param declaration variable declaration AST node representing a property declaration
     * @param id id of the current agent
     * @returns runtime value of the variable declaration representing a property declaration
     */
    private evaluatePropertyDeclaration(declaration: VariableDeclaration, id: string): RuntimeValue {
        let expression = declaration.value;

        if (declaration.default && this.output.step === 0) {
            expression = declaration.default;
        }

        return this.evaluateRuntimeValue(expression, id);
    }

    /**
     * Evaluates the variable declaration AST node representing a const declaration
     * 
     * @param declaration variable declaration AST node representing a const declaration
     * @param id id of the current agent
     * @returns runtime value of the variable declaration representing a const declaration
     */
    private evaluateConstDeclaration(declaration: VariableDeclaration, id: string): RuntimeValue {
        if (this.output.step === 0) {
            return this.evaluateRuntimeValue(declaration.value, id);
        }

        const agent = this.findAgent(id);
        const value = agent.variables.get(declaration.identifier);

        if (!value) {
            throw new ErrorRuntime(`Previous value of const '${declaration.identifier}' in agent '${id}' not found`, declaration.position);
        }

        return value;
    }

    /**
     * Evaluates a generic AST node
     * 
     * @param node generic AST node
     * @param id id of the current agent
     * @returns runtime value of the given AST node
     */
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
            case NodeType.SetComprehensionExpression:
                return this.evaluateSetComprehensionExpression(node as SetComprehensionExpression, id);
            case NodeType.MemberExpression:
                return this.evaluateMemberExpression(node as MemberExpression, id);
            case NodeType.OtherwiseExpression:
                return this.evaluateOtherwiseExpression(node as OtherwiseExpression, id);
            default:
                throw new ErrorRuntime(`Unknown runtime node '${node.type}'`, node.position);
        }
    }

    /**
     * Evaluates a numeric literal AST node
     * 
     * @param numericLiteral numeric literal AST node
     * @returns runtime value of the numeric literal AST node
     */
    private evaluateNumericLiteral(numericLiteral: NumericLiteral): RuntimeValue {
        const numberValue: NumberValue = {
            type: ValueType.Number,
            value: numericLiteral.value
        };

        return numberValue;
    }

    /**
     * Evaluates a boolean literal AST node
     * 
     * @param booleanLiteral boolean literal AST node
     * @returns runtime value of the boolean literal AST node
     */
    private evaluateBooleanLiteral(booleanLiteral: BooleanLiteral): RuntimeValue {
        const booleanValue: BooleanValue = {
            type: ValueType.Boolean,
            value: booleanLiteral.value
        };

        return booleanValue;
    }

    /**
     * Evaluates an identifier AST node
     * 
     * @param identifier identifier AST node
     * @returns runtime value of the identifier AST node
     */
    private evaluateIdentifier(identifier: Identifier, id: string): RuntimeValue {
        const setComprehensionLookup = this.setComprehensionEnvironment.lookupVariable(identifier.identifier);
        if (setComprehensionLookup) {
            return setComprehensionLookup;
        }

        const variableLookup = this.globalEnvironment.lookupVariable(identifier.identifier);
        if (variableLookup) {
            return variableLookup;
        }

        const agent = this.findAgent(id);
        const value = agent.variables.get(identifier.identifier);

        if (!value) {
            throw new ErrorRuntime(`Variable '${identifier.identifier}' in agent '${id}' does not exist`, identifier.position);
        }

        return value;
    }

    /**
     * Evaluates an identifier AST node representing a global variable declaration
     * 
     * @param identifier identifier AST node
     * @returns runtime value of the identifier AST node
     */
    private evaluateGlobalIdentifier(identifier: Identifier): RuntimeValue {
        const variableLookup = this.globalEnvironment.lookupVariable(identifier.identifier);

        if (!variableLookup) {
            throw new ErrorRuntime("Agent count identifier does not exist", identifier.position);
        }

        return variableLookup;
    }

    /**
     * Evaluates a binary expression AST node
     * 
     * @param expression binary expression AST node
     * @param id id of the current agent
     * @returns runtime value of the binary expression AST node
     */
    private evaluateBinaryExpression(expression: BinaryExpression, id: string): RuntimeValue {
        const leftHandSide = this.evaluateRuntimeValue(expression.left, id);
        const rightHandSide = this.evaluateRuntimeValue(expression.right, id);

        if (this.inOtherwiseExpression && (leftHandSide.type === ValueType.Null || rightHandSide.type === ValueType.Null)) {
            return { type: ValueType.Null };
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

    /**
     * Evaluates a comparison binary expression AST node
     * 
     * @param expression comparison binary expression AST node
     * @param id id of the current agent
     * @returns runtime value of the comparison binary expression AST node
     */
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

    /**
     * Evaluates a numeric binary expression AST node
     * 
     * @param expression numeric binary expression AST node
     * @param id id of the current agent
     * @returns runtime value of the numeric binary expression AST node
     */
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

            result = this.modulo(leftHandSide.value, rightHandSide.value);
        }
    
        return { type: ValueType.Number, value: result } as NumberValue;
    }

    /**
     * Evaluates a unary expression AST node
     * 
     * @param expression unary expression AST node
     * @param id id of the current agent
     * @returns runtime value of the unary expression AST node
     */
    private evaluateUnaryExpression(expression: UnaryExpression, id: string): RuntimeValue {
        const { operator } = expression;
        const value = this.evaluateRuntimeValue(expression.value, id);

        if (this.inOtherwiseExpression && value.type === ValueType.Null) {
            return { type: ValueType.Null };
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

    /**
     * Evaluates a logical expression AST node
     * 
     * @param expression logical expression AST node
     * @param id id of the current agent
     * @returns runtime value of the logical expression AST node
     */
    private evaluateLogicalExpression(expression: LogicalExpression, id: string): RuntimeValue {
        const leftHandSide = this.evaluateRuntimeValue(expression.left, id);
        const rightHandSide = this.evaluateRuntimeValue(expression.right, id);

        if (this.inOtherwiseExpression && (leftHandSide.type === ValueType.Null || rightHandSide.type === ValueType.Null)) {
            return { type: ValueType.Null };
        }

        if (leftHandSide.type !== ValueType.Boolean || rightHandSide.type !== ValueType.Boolean) {
            throw new ErrorRuntime("Logical expression requires boolean operands", expression.position);
        }

        let result;

        switch (expression.operator) {
            case "and": {
                const leftValue = (leftHandSide as BooleanValue).value;
                const rightValue = (rightHandSide as BooleanValue).value;
                result = leftValue && rightValue;
                break;
            }
            case "or": {
                const leftValue = (leftHandSide as BooleanValue).value;
                const rightValue = (rightHandSide as BooleanValue).value;
                result = leftValue || rightValue;
                break;
            }
        }

        return { type: ValueType.Boolean, value: result } as BooleanValue;
    }

    /**
     * Evaluates a conditional expression AST node
     * 
     * @param expression conditional expression AST node
     * @param id id of the current agent
     * @returns runtime value of the conditional expression AST node
     */
    private evaluateConditionalExpression(expression: ConditionalExpression, id: string): RuntimeValue {
        const condition = this.evaluateRuntimeValue(expression.condition, id);

        if (this.inOtherwiseExpression && condition.type === ValueType.Null) {
            return { type: ValueType.Null };
        }

        if (condition.type !== ValueType.Boolean) {
            throw new ErrorRuntime("Conditional expression requires a boolean expression as its condition", expression.position);
        }

        const result = (condition as BooleanValue).value ? expression.consequent : expression.alternate;

        return this.evaluateRuntimeValue(result, id);
    }

    /**
     * Evaluates a call expression AST node
     * 
     * @param expression call expression AST node
     * @param id id of the current agent
     * @returns runtime value of the call expression AST node
     */
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

    /**
     * Evaluates a set comprehension expression AST node
     * 
     * @param expression set comprehension expression AST node
     * @param id id of the current agent
     * @returns runtime value of the set comprehension expression AST node
     */
    private evaluateSetComprehensionExpression(expression: SetComprehensionExpression, id: string): RuntimeValue {
        const agents: RuntimeValue = this.evaluateRuntimeValue(expression.base, id);
        const param: IdentifierValue = {
            type: ValueType.Identifier,
            value: expression.param
        } as IdentifierValue;

        if (agents.type !== ValueType.Agents) {
            throw new ErrorRuntime("Set comprehension expression requires base argument of type 'agents'", expression.position);
        }

        const runtimeAgents = (agents as AgentsValue).value.filter((agent: RuntimeAgent) => agent.id !== id);
        const results: RuntimeValue[] = [];

        for (const agent of runtimeAgents) {
            this.setComprehensionEnvironment.declareVariable(param.value, { type: ValueType.Agent, value: agent } as AgentValue);
            results.push(this.evaluateRuntimeValue(expression.value, id));
        }

        const setComprehensionValue: SetComprehensionValue = {
            type: ValueType.SetComprehension,
            agents: runtimeAgents,
            results
        };

        return setComprehensionValue;
    }

    /**
     * Evaluates a member expression AST node
     * 
     * @param expression member expression AST node
     * @param id id of the current agent
     * @returns runtime value of the member expression AST node
     */
    private evaluateMemberExpression(expression: MemberExpression, id: string): RuntimeValue {
        const caller = this.evaluateRuntimeValue(expression.caller, id);

        if (this.inOtherwiseExpression && caller.type === ValueType.Null) {
            return { type: ValueType.Null };
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

    /**
     * Evaluates an otherwise expression AST node
     * 
     * @param expression otherwise expression AST node
     * @param id id of the current agent
     * @returns runtime value of the otherwise expression AST node
     */
    private evaluateOtherwiseExpression(expression: OtherwiseExpression, id: string): RuntimeValue {
        this.inOtherwiseExpression = true;
        const left = this.evaluateRuntimeValue(expression.left, id);
        this.inOtherwiseExpression = false;

        if (left.type === ValueType.Null) {
            return this.evaluateRuntimeValue(expression.right, id);
        }

        return left;
    }

    /**
     * Asserts a statement AST node to be a define declaration AST node
     * 
     * @param statement statement AST node to assert
     * @returns define declaration AST node
     */
    private getDefineDeclaration(statement: Statement): DefineDeclaration {
        if (statement.type !== NodeType.DefineDeclaration) {
            throw new ErrorRuntime("Only object or define declarations are allowed in program body", statement.position);
        }

        return statement as DefineDeclaration;
    }

    /**
     * Asserts a statement AST node to be an object declaration AST node
     * 
     * @param statement statement AST node to assert
     * @returns object declaration AST node
     */
    private getObjectDeclaration(statement: Statement): ObjectDeclaration {
        if (statement.type !== NodeType.ObjectDeclaration) {
            throw new ErrorRuntime("Only object or define declarations are allowed in program body", statement.position);
        }

        return statement as ObjectDeclaration;
    }

    /**
     * Asserts a statement AST node to be a variable declaration AST node
     * 
     * @param statement statement AST node to assert
     * @returns variable declaration AST node
     */
    private getVariableDeclaration(statement: Statement): VariableDeclaration {
        if (statement.type !== NodeType.VariableDeclaration) {
            throw new ErrorRuntime("Only variable declarations are allowed in object declaration body", statement.position);
        }

        return statement as VariableDeclaration;
    }

    /**
     * Custom modulo used in modulo binary expression evaluation
     * 
     * @param a left numeric operand
     * @param b right numeric operand
     * @returns result of the modulo arithmetic operation
     */
    private modulo(a: number, b: number): number {
        return ((a % b) + b) % b;
    }

    /**
     * Finds an agent in the array of agents from the previous step
     * 
     * @param id id of the agent
     * @throws runtime error if the agent with the given id was not found
     * @returns agent with the specified id
     */
    private findAgent(id: string): RuntimeAgent {
        const agent = this.previousAgents.find((agent: RuntimeAgent) => agent.id === id);

        if (!agent) {
            throw new ErrorRuntime(`Agent with id '${id}' not found`);
        }

        return agent;
    }

    /**
     * Generates a unique agent identifier (id)
     * 
     * @param identifier object declaration identifier
     * @param id numeric identifier (index)
     * @returns unique agent identifier
     */
    private generateAgentId(identifier: string, id: number): string {
        return `${identifier}-${id}`;
    }

    /**
     * Replaces the current program AST node with the given program AST node
     * 
     * @param program program AST node to use as replacement
     */
    public setProgram(program: Program): void {
        this.program = program;
    }

    /**
     * Resets the current simulation output
     */
    public reset(): void {
        this.output = { type: ValueType.Output, step: 0, agents: [] };
    }
    
    /**
     * Updates a specific property value in a specific agent instance
     * 
     * @param agentIndex index of the agent
     * @param propertyIdentifier identifier of the property
     * @param value new value to be used for the agent's property value
     */
    public updateAgentValue(agentIndex: number, propertyIdentifier: string, value: number): void {
        this.previousAgents[agentIndex].variables.set(propertyIdentifier, { type: ValueType.Number, value } as NumberValue);
    }

    /**
     * Updates the previous and current output at the end of a step
     */
    private updateOutput(): void {
        if (this.output.step === 0) {
            return;
        }

        this.previousAgents = [ ...this.output.agents ];
        this.output.agents = [];
    }

    /**
     * Initializes runtime functions (step, index, agents)
     */
    private initializeRuntimeFunctions(): void {
        this.globalEnvironment.declareVariable("step", createGlobalFunction(this.createStepFunction(0)));
        this.globalEnvironment.declareVariable("agents", createGlobalFunction(this.createAgentsFunction([], "")));
        this.globalEnvironment.declareVariable("index", createGlobalFunction(this.createIndexFunction(0)));
    }

    /**
     * Provides new data to the index function
     * 
     * @param index index value to provide
     */
    private updateIndexFunction(index: number): void {
        this.globalEnvironment.assignVariable("index", createGlobalFunction(this.createIndexFunction(index)));
    }

    /**
     * Provides new data to the agents function
     * 
     * @param agents agents value to provide
     * @param id id of the current agent
     */
    private updateAgentsFunction(agents: RuntimeAgent[], id: string): void {
        this.globalEnvironment.assignVariable("agents", createGlobalFunction(this.createAgentsFunction(agents, id)));
    }

    /**
     * Provides new data to the step function
     * 
     * @param step step value to provide
     */
    private updateStepFunction(step: number): void {
        this.globalEnvironment.assignVariable("step", createGlobalFunction(this.createStepFunction(step)));
    }

    /**
     * Creates the global index function
     * 
     * @param index initial index value
     * @returns reference to the index function
     */
    private createIndexFunction(index: number): FunctionCall {
        function indexFunction(args: RuntimeValue[]): RuntimeValue {
            if (args.length !== 0) {
                throw new ErrorRuntime(`Function 'index' requires 0 arguments, ${args.length} provided`);
            }

            return { type: ValueType.Number, value: index } as NumberValue;
        }

        return indexFunction;
    }

    /**
     * Creates the global agents function
     * 
     * @param index initial agents value
     * @param id id of the current agent
     * @returns reference to the agents function
     */
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

    /**
     * Creates the global step function
     * 
     * @param index initial step value
     * @returns reference to the step function
     */
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