import { AgentsValue, BooleanValue, FunctionCall, FunctionValue, LambdaValue, NumberValue, RuntimeAgent, RuntimeError, RuntimeValue } from "../runtime/runtime.types";
import { Error } from "./error";

export function createGlobalFunction(call: FunctionCall): FunctionValue {
    return { type: "function", call } as FunctionValue;
}

export function normalizeNumber(value: number, digits: number = 2): number {
    const pow = Math.pow(10, digits);
    return Math.round(value * pow) / pow;
}

function expectNumericArgs(args: RuntimeValue[], count: number): RuntimeValue[] {
    if (args.length !== count) {
        return [{ type: "error", message: "Number of arguments do not match, expected " + count + ", provided " + args.length + " in a function call" } as RuntimeError]
    }

    const returnedArguments: RuntimeValue[] = [];

    for (const arg of args) {
        if (arg.type !== "number") {
            return [{ type: "error", message: "Expected a numeric argument, did not get a number" } as RuntimeError];
        }

        returnedArguments.push(arg as NumberValue);
    }

    return returnedArguments;
}

// GLOBAL FUNCTIONS

export function EMPTY(args: RuntimeValue[]): RuntimeValue {
    if (args.length !== 0) {
        return { type: "error", message: `Function 'empty' expected 0 arguments, ${args.length} provided` } as RuntimeError;
    }

    return { type: "agents", value: [] } as AgentsValue;
}

export function FILTER(args: RuntimeValue[]): RuntimeValue {
    if (args.length !== 1) {
        return { type: "error", message: `Function 'filter' expected 1 argument, ${args.length} provided` } as RuntimeError;
    }

    if (args[0].type !== "lambda") {
        return { type: "error", message: `Function 'filter' expected arguments of type 'lambda', ${args[0].type} provided` } as RuntimeError;
    }

    const lambda: LambdaValue = args[0] as LambdaValue;

    if (lambda.agents.length !== lambda.results.length) {
        return { type: "error", message: `Number of agents does not equal the number of results in 'filter' function.` } as RuntimeError;
    }

    const agents: RuntimeAgent[] = [];

    for (let i = 0; i < lambda.agents.length; i++) {
        if (lambda.results[i].type !== "boolean") {
            return { type: "error", message: `Function 'filter' requires lambda expression with boolean return valie` } as RuntimeError;
        }

        const result: BooleanValue = lambda.results[i] as BooleanValue;

        if (result.value) {
            agents.push(lambda.agents[i] as RuntimeAgent);
        }
    }

    return { type: "agents", value: agents } as AgentsValue;
}

export function COUNT(args: RuntimeValue[]): RuntimeValue {
    if (args.length !== 1) {
        return { type: "error", message: `Function 'count' expected 1 argument, ${args.length} provided` } as RuntimeError;
    }

    if (args[0].type !== "agents") {
        return { type: "error", message: `Function 'count' expected arguments of type 'agents', ${args[0].type} provided` } as RuntimeError;
    }

    const agents: AgentsValue = args[0] as AgentsValue;
    const length = agents.value.length;

    return { type: "number", value: length } as NumberValue;
}

export function RANDOM(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 2);

    if (numericArgs.length === 1 && numericArgs[0].type === "error") {
        return numericArgs[0] as RuntimeError;
    }

    const min: NumberValue = numericArgs[0] as NumberValue;
    const max: NumberValue = numericArgs[1] as NumberValue;

    if (min.value >= max.value) {
        return { type: "error", message: "In function call RANDOM the first argument must be less than the second argument" } as RuntimeError;
    }

    const result = Math.random() * (max.value - min.value) + min.value;

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function CHOICE(args: RuntimeValue[]): RuntimeValue {
    if (args.length === 1 && args[0].type === "error") {
        return args[0] as RuntimeError;
    }

    if (args.length !== 2) {
        return { type: "error", message: `Function 'choice' requires 2 arguments, ${args.length} provided` } as RuntimeError;
    }

    if (args[0].type === "number" && args[1].type === "number") {
        const first: NumberValue = args[0] as NumberValue;
        const second: NumberValue = args[1] as NumberValue;

        const result = Math.random() >= 0.5 ? first.value : second.value;

        return { type: "number", value: normalizeNumber(result) } as NumberValue;
    }

    if (args[0].type === "boolean" && args[1].type === "boolean") {
        const first: BooleanValue = args[0] as BooleanValue;
        const second: BooleanValue = args[1] as BooleanValue;

        const result = Math.random() >= 0.5 ? first.value : second.value;

        return { type: "boolean", value: result } as BooleanValue;
    }

    return { type: "error", message: "Function 'choice' requires arguments of type 'number' or 'boolean'" } as RuntimeError;
}

export function SQRT(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    if (numericArgs.length === 1 && numericArgs[0].type === "error") {
        return numericArgs[0] as RuntimeError;
    }

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.sqrt(number.value);

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function ABS(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    if (numericArgs.length === 1 && numericArgs[0].type === "error") {
        return numericArgs[0] as RuntimeError;
    }

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.abs(number.value);

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function FLOOR(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    if (numericArgs.length === 1 && numericArgs[0].type === "error") {
        return numericArgs[0] as RuntimeError;
    }

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.floor(number.value);

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function CEIL(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    if (numericArgs.length === 1 && numericArgs[0].type === "error") {
        return numericArgs[0] as RuntimeError;
    }

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.ceil(number.value);

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function ROUND(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    if (numericArgs.length === 1 && numericArgs[0].type === "error") {
        return numericArgs[0] as RuntimeError;
    }

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.round(number.value);

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function SIN(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    if (numericArgs.length === 1 && numericArgs[0].type === "error") {
        return numericArgs[0] as RuntimeError;
    }

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.sin(number.value);

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function COS(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    if (numericArgs.length === 1 && numericArgs[0].type === "error") {
        return numericArgs[0] as RuntimeError;
    }

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.cos(number.value);

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function TAN(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 1);

    if (numericArgs.length === 1 && numericArgs[0].type === "error") {
        return numericArgs[0] as RuntimeError;
    }

    const number: NumberValue = numericArgs[0] as NumberValue;
    const result = Math.tan(number.value);

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}