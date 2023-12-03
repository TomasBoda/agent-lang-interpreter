import {
    AgentsValue,
    AgentValue,
    BooleanValue,
    FunctionCall,
    FunctionValue,
    LambdaValue,
    NullValue,
    NumberValue,
    RuntimeAgent,
    RuntimeValue,
    ValueType
} from "../runtime/runtime.types";
import { ErrorRuntime } from "./errors";

export function createGlobalFunction(call: FunctionCall): FunctionValue {
    return { type: ValueType.Function, call } as FunctionValue;
}

export function normalizeNumber(value: number, digits: number = 2): number {
    const pow = Math.pow(10, digits);
    return Math.round(value * pow) / pow;
}

function expectNumericArgs(args: RuntimeValue[], count: number): RuntimeValue[] {
    if (args.length !== count) {
        throw new ErrorRuntime("Number of arguments do not match, expected " + count + ", provided " + args.length + " in a function call");
    }

    const returnedArguments: RuntimeValue[] = [];

    for (const arg of args) {
        if (arg.type !== ValueType.Number) {
            throw new ErrorRuntime("Expected a numeric argument, did not get a number");
        }

        returnedArguments.push(arg as NumberValue);
    }

    return returnedArguments;
}

// GLOBAL FUNCTIONS

export function PROB(args: RuntimeValue[]): RuntimeValue {
    if (args.length !== 1) {
        throw new ErrorRuntime(`Function 'prob' expected 1 argument, ${args.length} provided`);
    }

    if (args[0].type !== ValueType.Number) {
        throw new ErrorRuntime(`Function 'prob' expected argument of type 'number', type '${args[0].type}' provided`);
    }

    const probability: NumberValue = args[0] as NumberValue;

    if (probability.value < 0 || probability.value > 1) {
        throw new ErrorRuntime(`Function 'prob' expected number between 0 and 1, ${probability.value} provided`);
    }

    const result = Math.random() < probability.value;

    return { type: ValueType.Boolean, value: result } as BooleanValue;
}

export function PI(args: RuntimeValue[]): RuntimeValue {
    if (args.length !== 0) {
        throw new ErrorRuntime(`Function 'pi' expected 0 arguments, ${args.length} provided`);
    }

    return { type: ValueType.Number, value: Math.PI } as NumberValue;
}

export function EMPTY(args: RuntimeValue[]): RuntimeValue {
    if (args.length !== 0) {
        throw new ErrorRuntime(`Function 'empty' expected 0 arguments, ${args.length} provided`);
    }

    return { type: ValueType.Agents, value: [] } as AgentsValue;
}

export function MIN(args: RuntimeValue[]): RuntimeValue {
    if (args.length !== 1) {
        throw new ErrorRuntime(`Function 'min' expected 1 argument, ${args.length} provided`);
    }

    if (args[0].type !== ValueType.Lambda) {
        throw new ErrorRuntime(`Function 'min' expected arguments of type 'lambda', ${args[0].type} provided`);
    }

    const lambda: LambdaValue = args[0] as LambdaValue;

    if (lambda.agents.length !== lambda.results.length) {
        throw new ErrorRuntime(`Number of agents does not equal the number of results in 'min' function.`);
    }

    for (let i = 0; i < lambda.results.length; i++) {
        const result: RuntimeValue = lambda.results[i];

        if (result.type !== ValueType.Number) {
            throw new ErrorRuntime(`Function 'min' requires a lambda expression that returns numeric values`);
        }
    }

    const results = lambda.results.map((result: RuntimeValue) => (result as NumberValue).value);
    const minValue = Math.min(...results);

    for (let i = 0; i < results.length; i++) {
        if (results[i] === minValue) {
            const agent: RuntimeAgent = lambda.agents[i];

            return { type: ValueType.Agent, value: agent } as AgentValue;
        }
    }

    return { type: ValueType.Null, value: {} } as NullValue;
}

export function MAX(args: RuntimeValue[]): RuntimeValue {
    if (args.length !== 1) {
        throw new ErrorRuntime(`Function 'max' expected 1 argument, ${args.length} provided`);
    }

    if (args[0].type !== ValueType.Lambda) {
        throw new ErrorRuntime(`Function 'max' expected arguments of type 'lambda', ${args[0].type} provided`);
    }

    const lambda: LambdaValue = args[0] as LambdaValue;

    if (lambda.agents.length !== lambda.results.length) {
        throw new ErrorRuntime(`Number of agents does not equal the number of results in 'max' function.`);
    }

    for (let i = 0; i < lambda.results.length; i++) {
        const result: RuntimeValue = lambda.results[i];

        if (result.type !== ValueType.Number) {
            throw new ErrorRuntime(`Function 'max' requires a lambda expression that returns numeric values`);
        }
    }

    const results = lambda.results.map((result: RuntimeValue) => (result as NumberValue).value);
    const maxValue = Math.max(...results);

    for (let i = 0; i < results.length; i++) {
        if (results[i] === maxValue) {
            const agent: RuntimeAgent = lambda.agents[i];

            return { type: ValueType.Agent, value: agent } as AgentValue;
        }
    }

    return { type: ValueType.Null, value: {} } as NullValue;
}

export function FILTER(args: RuntimeValue[]): RuntimeValue {
    if (args.length !== 1) {
        throw new ErrorRuntime(`Function 'filter' expected 1 argument, ${args.length} provided`);
    }

    if (args[0].type !== ValueType.Lambda) {
        throw new ErrorRuntime(`Function 'filter' expected arguments of type 'lambda', ${args[0].type} provided`);
    }

    const lambda: LambdaValue = args[0] as LambdaValue;

    if (lambda.agents.length !== lambda.results.length) {
        throw new ErrorRuntime(`Number of agents does not equal the number of results in 'filter' function.`);
    }

    const agents: RuntimeAgent[] = [];

    for (let i = 0; i < lambda.agents.length; i++) {
        if (lambda.results[i].type !== ValueType.Boolean) {
            throw new ErrorRuntime(`Function 'filter' requires lambda expression with boolean return value`);
        }

        const result: BooleanValue = lambda.results[i] as BooleanValue;

        if (result.value) {
            agents.push(lambda.agents[i] as RuntimeAgent);
        }
    }

    return { type: ValueType.Agents, value: agents } as AgentsValue;
}

export function COUNT(args: RuntimeValue[]): RuntimeValue {
    if (args.length !== 1) {
        throw new ErrorRuntime(`Function 'count' expected 1 argument, ${args.length} provided`);
    }

    if (args[0].type !== ValueType.Agents) {
        throw new ErrorRuntime(`Function 'count' expected arguments of type 'agents', ${args[0].type} provided`);
    }

    const agents: AgentsValue = args[0] as AgentsValue;
    const length = agents.value.length;

    return { type: ValueType.Number, value: length } as NumberValue;
}

export function RANDOM(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 2);

    const min: NumberValue = numericArgs[0] as NumberValue;
    const max: NumberValue = numericArgs[1] as NumberValue;

    if (min.value >= max.value) {
        throw new ErrorRuntime("In function call RANDOM the first argument must be less than the second argument");
    }

    const result = Math.random() * (max.value - min.value) + min.value;

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}

export function CHOICE(args: RuntimeValue[]): RuntimeValue {
    if (args.length !== 2) {
        throw new ErrorRuntime(`Function 'choice' requires 2 arguments, ${args.length} provided`);
    }

    if (args[0].type === ValueType.Number && args[1].type === ValueType.Number) {
        const first: NumberValue = args[0] as NumberValue;
        const second: NumberValue = args[1] as NumberValue;

        const result = Math.random() >= 0.5 ? first.value : second.value;

        return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
    }

    if (args[0].type === ValueType.Boolean && args[1].type === ValueType.Boolean) {
        const first: BooleanValue = args[0] as BooleanValue;
        const second: BooleanValue = args[1] as BooleanValue;

        const result = Math.random() >= 0.5 ? first.value : second.value;

        return { type: ValueType.Boolean, value: result } as BooleanValue;
    }

    throw new ErrorRuntime("Function 'choice' requires arguments of type 'number' or 'boolean'");
}

export function SQRT(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.sqrt(number.value);

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}

export function ABS(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.abs(number.value);

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}

export function FLOOR(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.floor(number.value);

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}

export function CEIL(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.ceil(number.value);

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}

export function ROUND(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.round(number.value);

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}

export function SIN(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.sin(number.value);

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}

export function COS(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.cos(number.value);

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}

export function TAN(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.tan(number.value);

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}