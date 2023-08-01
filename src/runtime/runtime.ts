import { BinaryExpression, BooleanLiteral, ConditionalExpression, Expression, Identifier, LogicalExpression, NodeType, NumericLiteral, ObjectDeclaration, Program, Statement, VariableDeclaration, VariableType } from "../parser/parser.types";
import { RuntimeValue, NumberValue, BooleanValue, RuntimeVariable } from "./runtime.types";
import { Error } from "../lib/error";
import { InterpreterConfiguration } from "../interpreter/interpreter.types";
import { Agent, AgentVariableIdentifier, AgentVariableValue, AgentVariables, InterpreterOutput } from "../interpreter/interpreter.types";

export class Runtime {

    private program: Program;

    private previousOutput: InterpreterOutput = { step: 0, agents: [] };
    private currentOutput: InterpreterOutput = { step: 0, agents: [] };

    constructor(program: Program) {
        this.program = program;
    }

    public run(config: InterpreterConfiguration, step: number): InterpreterOutput {
        this.previousOutput = this.deepCopyOutput(this.currentOutput);
        this.currentOutput.step = step;
        this.currentOutput.agents = [];

        return this.evaluateProgram(this.program, config);
    }

    private evaluateProgram(program: Program, config: InterpreterConfiguration): InterpreterOutput {
        for (const statement of program.body) {
            if (statement.type !== NodeType.ObjectDeclaration) {
                Error.runtime(statement.position, "Only object declarations allowed in program body");
            }

            const agentCount: number = (statement as ObjectDeclaration).count;

            for (let id = 0; id < agentCount; id++) {
                const agentId: string = (statement as ObjectDeclaration).identifier + "-" + id;
                this.evaluateObjectDeclaration(statement as ObjectDeclaration, agentId);
            }
        }

        return this.currentOutput;
    }

    private evaluateObjectDeclaration(declaration: ObjectDeclaration, id: string): void {
        const identifier: string = declaration.identifier;
        const variables: AgentVariables = new Map<AgentVariableIdentifier, AgentVariableValue>();

        this.currentOutput.agents.push({ id, identifier, variables } as Agent);

        for (const statement of declaration.body) {
            if (statement.type !== NodeType.VariableDeclaration) {
                Error.runtime(statement.position, "Only variable declarations allowed in object body");
            }

            const variable: RuntimeVariable = this.evaluateVariableDeclaration(statement as VariableDeclaration, id);
            variables.set(variable.identifier, variable.value);
        }
    }

    private evaluateVariableDeclaration(declaration: VariableDeclaration, id: string): RuntimeVariable {
        const identifier: string = declaration.identifier;
        let value: RuntimeValue;

        // evaluate VARIABLE in step 0
        if (declaration.variableType === VariableType.Variable && declaration.default && this.currentOutput.step === 0) {
            value = this.evaluateRuntimeValue(declaration.default, id);
        } else {
            value = this.evaluateRuntimeValue(declaration.value, id);
        }

        return { identifier, value: this.getRawRuntimeValue(value) } as RuntimeVariable;
    }

    private getRawRuntimeValue(value: RuntimeValue): AgentVariableValue {
        if (value.type === "number") {
            return (value as NumberValue).value;
        }

        return (value as BooleanValue).value;
    }

    private evaluateRuntimeValue(node: Expression, id: string): RuntimeValue {
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

    private evaluateIdentifier(identifier: Identifier, id: string): RuntimeValue {
        let agents: Agent[] = [];

        if (this.currentOutput.step === 0) {
            agents = this.currentOutput.agents.filter((agent: Agent) => agent.id == id);
        } else {
            agents = this.previousOutput.agents.filter((agent: Agent) => agent.id == id);
        }

        if (agents.length === 0) {
            Error.runtime(identifier.position, "Agent with the provided id does not exist");
            return {} as RuntimeValue;
        }

        if (agents.length > 1) {
            Error.runtime(identifier.position, "Multiple agents with the provided id found");
            return {} as RuntimeValue;
        }

        const agent: Agent = agents[0];

        if (!agent.variables.has(identifier.identifier)) {
            Error.runtime(identifier.position, "Agent variable with the provided identifier not found");
        }

        const value = agent.variables.get(identifier.identifier);

        if (typeof value === "number") {
            return { type: "number", value } as RuntimeValue;
        }

        if (typeof value === "boolean") {
            return { type: "boolean", value } as RuntimeValue;
        }

        Error.runtime(identifier.position, "Variable identifier has unknown type, expected number or boolean");
        return {} as RuntimeValue;
    }

    private evaluateBinaryExpression(expression: BinaryExpression, id: string): RuntimeValue {
        const leftHandSide = this.evaluateRuntimeValue(expression.left, id);
        const rightHandSide = this.evaluateRuntimeValue(expression.right, id);
    
        if (leftHandSide.type === "number" && rightHandSide.type === "number") {
            if (expression.operator === "==" || expression.operator === ">" || expression.operator === ">=" || expression.operator === "<" || expression.operator === "<=") {
                return this.evaluateComparisonBinaryExpression(leftHandSide as NumberValue, rightHandSide as NumberValue, expression.operator);
            } else {
                return this.evaluateNumericBinaryExpression(leftHandSide as NumberValue, rightHandSide as NumberValue, expression.operator);
            }
        }
    
        Error.runtime(expression.position, "Only numbers allowed in binary expression");
        return {} as RuntimeValue;
    }

    private evaluateComparisonBinaryExpression(leftHandSide: NumberValue, rightHandSide: NumberValue, operator: string): BooleanValue {
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

    private evaluateLogicalExpression(expression: LogicalExpression, id: string): RuntimeValue {
        const leftHandSide = this.evaluateRuntimeValue(expression.left, id);
        const rightHandSide = this.evaluateRuntimeValue(expression.right, id);

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

        Error.runtime(expression.position, "Only booleans allowed in logical expression");
        return {} as RuntimeValue;
    }

    private evaluateConditionalExpression(expression: ConditionalExpression, id: string): RuntimeValue {
        const condition = this.evaluateRuntimeValue(expression.condition, id);

        if (condition.type !== "boolean") {
            Error.runtime(expression.position, "Conditional expression requires a boolean value as a condition");
            return {} as RuntimeValue;
        }

        const option = (condition as BooleanValue).value ? expression.consequent : expression.alternate;
        const value = this.evaluateRuntimeValue(option, id);

        return value as RuntimeValue;
    }

    private deepCopyOutput(output: InterpreterOutput): InterpreterOutput {
        const newOutput: InterpreterOutput = { step: output.step, agents: [] };

        for (const agent of output.agents) {
            newOutput.agents.push({
                id: agent.id,
                identifier: agent.identifier,
                variables: new Map(agent.variables)
            } as Agent);
        }

        return newOutput;
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