import { AgentsValue, BooleanValue, FunctionCall, FunctionValue, LambdaValue, NumberValue, RuntimeAgent, RuntimeError, RuntimeValue, ValueType } from "../runtime/runtime.types";
import { Error } from "./error";

export function createGlobalFunction(call: FunctionCall): FunctionValue {
    return { type: ValueType.Function, call } as FunctionValue;
}

export function normalizeNumber(value: number, digits: number = 2): number {
    const pow = Math.pow(10, digits);
    return Math.round(value * pow) / pow;
}

function expectNumericArgs(args: RuntimeValue[], count: number): RuntimeValue[] {
    if (args.length !== count) {
        return [Error.runtime("Number of arguments do not match, expected " + count + ", provided " + args.length + " in a function call") as RuntimeError];
    }

    const returnedArguments: RuntimeValue[] = [];

    for (const arg of args) {
        if (arg.type !== ValueType.Number) {
            return [Error.runtime("Expected a numeric argument, did not get a number") as RuntimeError];
        }

        returnedArguments.push(arg as NumberValue);
    }

    return returnedArguments;
}

// GLOBAL FUNCTIONS

export function PI(args: RuntimeValue[]): RuntimeValue {
    if (args.length !== 0) {
        return Error.runtime(`Function 'pi' expected 0 arguments, ${args.length} provided`) as RuntimeError;
    }

    return { type: ValueType.Number, value: Math.PI } as NumberValue;
}

export function EMPTY(args: RuntimeValue[]): RuntimeValue {
    if (args.length !== 0) {
        return Error.runtime(`Function 'empty' expected 0 arguments, ${args.length} provided`) as RuntimeError;
    }

    return { type: ValueType.Agents, value: [] } as AgentsValue;
}

export function FILTER(args: RuntimeValue[]): RuntimeValue {
    if (args.length !== 1) {
        return Error.runtime(`Function 'filter' expected 1 argument, ${args.length} provided`) as RuntimeError;
    }

    if (args[0].type !== ValueType.Lambda) {
        return Error.runtime(`Function 'filter' expected arguments of type 'lambda', ${args[0].type} provided`) as RuntimeError;
    }

    const lambda: LambdaValue = args[0] as LambdaValue;

    if (lambda.agents.length !== lambda.results.length) {
        return Error.runtime(`Number of agents does not equal the number of results in 'filter' function.`) as RuntimeError;
    }

    const agents: RuntimeAgent[] = [];

    for (let i = 0; i < lambda.agents.length; i++) {
        if (lambda.results[i].type !== ValueType.Boolean) {
            return Error.runtime(`Function 'filter' requires lambda expression with boolean return value`) as RuntimeError;
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
        return Error.runtime(`Function 'count' expected 1 argument, ${args.length} provided`) as RuntimeError;
    }

    if (args[0].type !== ValueType.Agents) {
        return Error.runtime(`Function 'count' expected arguments of type 'agents', ${args[0].type} provided`) as RuntimeError;
    }

    const agents: AgentsValue = args[0] as AgentsValue;
    const length = agents.value.length;

    return { type: ValueType.Number, value: length } as NumberValue;
}

export function RANDOM(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 2);

    if (numericArgs.length === 1 && numericArgs[0].type === ValueType.Error) {
        return numericArgs[0] as RuntimeError;
    }

    const min: NumberValue = numericArgs[0] as NumberValue;
    const max: NumberValue = numericArgs[1] as NumberValue;

    if (min.value >= max.value) {
        return Error.runtime("In function call RANDOM the first argument must be less than the second argument") as RuntimeError;
    }

    const result = Math.random() * (max.value - min.value) + min.value;

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}

export function CHOICE(args: RuntimeValue[]): RuntimeValue {
    if (args.length === 1 && args[0].type === ValueType.Error) {
        return args[0] as RuntimeError;
    }

    if (args.length !== 2) {
        return Error.runtime(`Function 'choice' requires 2 arguments, ${args.length} provided`) as RuntimeError;
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

    return Error.runtime("Function 'choice' requires arguments of type 'number' or 'boolean'") as RuntimeError;
}

export function SQRT(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    if (numericArgs.length === 1 && numericArgs[0].type === ValueType.Error) {
        return numericArgs[0] as RuntimeError;
    }

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.sqrt(number.value);

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}

export function ABS(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    if (numericArgs.length === 1 && numericArgs[0].type === ValueType.Error) {
        return numericArgs[0] as RuntimeError;
    }

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.abs(number.value);

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}

export function FLOOR(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    if (numericArgs.length === 1 && numericArgs[0].type === ValueType.Error) {
        return numericArgs[0] as RuntimeError;
    }

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.floor(number.value);

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}

export function CEIL(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    if (numericArgs.length === 1 && numericArgs[0].type === ValueType.Error) {
        return numericArgs[0] as RuntimeError;
    }

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.ceil(number.value);

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}

export function ROUND(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    if (numericArgs.length === 1 && numericArgs[0].type === ValueType.Error) {
        return numericArgs[0] as RuntimeError;
    }

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.round(number.value);

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}

export function SIN(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    if (numericArgs.length === 1 && numericArgs[0].type === ValueType.Error) {
        return numericArgs[0] as RuntimeError;
    }

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.sin(number.value);

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}

export function COS(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    if (numericArgs.length === 1 && numericArgs[0].type === ValueType.Error) {
        return numericArgs[0] as RuntimeError;
    }

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.cos(number.value);

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}

export function TAN(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    if (numericArgs.length === 1 && numericArgs[0].type === ValueType.Error) {
        return numericArgs[0] as RuntimeError;
    }

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.tan(number.value);

    return { type: ValueType.Number, value: normalizeNumber(result) } as NumberValue;
}