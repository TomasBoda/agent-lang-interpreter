import { AgentsValue, FunctionCall, FunctionValue, NumberValue, RuntimeError, RuntimeValue } from "../runtime/runtime.types";
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

export function COUNT(args: RuntimeValue[]): RuntimeValue {
    if (args.length !== 1) {
        return { type: "error", message: `Function 'count' expected 1 argument, ${args.length} provided` } as RuntimeError;
    }

    if (args[0].type !== "agents") {
        return { type: "error", message: `Function 'count' expected arguments of type 'agents', ${args[0].type} provided` } as RuntimeError;
    }

    const agents: AgentsValue = args[0] as AgentsValue;
    const length = agents.agents.length;

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
    const numericArgs: RuntimeValue[] = expectNumericArgs(args, 2);

    if (numericArgs.length === 1 && numericArgs[0].type === "error") {
        return numericArgs[0] as RuntimeError;
    }

    const first: NumberValue = numericArgs[0] as NumberValue;
    const second: NumberValue = numericArgs[1] as NumberValue;

    const result = Math.random() >= 0.5 ? first.value : second.value;

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
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