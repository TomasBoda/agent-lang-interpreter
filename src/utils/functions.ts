import { FunctionCall, FunctionValue, NumberValue, RuntimeValue } from "../runtime/runtime.types";
import { Error } from "./error";

export function createGlobalFunction(call: FunctionCall) {
    return { type: "function", call } as FunctionValue;
}

export function normalizeNumber(value: number, digits: number = 2){
    const pow = Math.pow(10, digits);
    return Math.round(value * pow) / pow;
}

function expectNumericArgs(args: RuntimeValue[], count: number): NumberValue[] {
    if (args.length !== count) {
        console.log(args);
        Error.runtime(null, "Expected " + count + " arguments, got " + args.length + " in function call");
    }

    return args.map((arg: RuntimeValue) => {
        if (arg.type !== "number") {
            Error.runtime(null, "Argument in function call is not a number");
        }

        return arg as NumberValue;
    });
}

export function RANDOM(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: NumberValue[] = expectNumericArgs(args, 2);

    const min: NumberValue = numericArgs[0];
    const max: NumberValue = numericArgs[1];

    if (min.value >= max.value) {
        Error.runtime(null, "In function call RANDOM the first argument must be less than the second argument");
    }

    const result = Math.random() * (max.value - min.value) + min.value;

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function CHOICE(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: NumberValue[] = expectNumericArgs(args, 2);

    const first: NumberValue = numericArgs[0];
    const second: NumberValue = numericArgs[1];

    const result = Math.random() >= 0.5 ? first.value : second.value;

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function SQRT(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: NumberValue[] = expectNumericArgs(args, 1);

    const number: NumberValue = numericArgs[0];
    const result = Math.sqrt(number.value);

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function ABS(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: NumberValue[] = expectNumericArgs(args, 1);

    const number: NumberValue = numericArgs[0];
    const result = Math.abs(number.value);

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function FLOOR(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: NumberValue[] = expectNumericArgs(args, 1);

    const number: NumberValue = numericArgs[0];
    const result = Math.floor(number.value);

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function CEIL(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: NumberValue[] = expectNumericArgs(args, 1);

    const number: NumberValue = numericArgs[0];
    const result = Math.ceil(number.value);

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function ROUND(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: NumberValue[] = expectNumericArgs(args, 1);

    const number: NumberValue = numericArgs[0];
    const result = Math.round(number.value);

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function SIN(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: NumberValue[] = expectNumericArgs(args, 1);

    const number: NumberValue = numericArgs[0];
    const result = Math.sin(number.value);

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function COS(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: NumberValue[] = expectNumericArgs(args, 1);

    const number: NumberValue = numericArgs[0];
    const result = Math.cos(number.value);

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}

export function TAN(args: RuntimeValue[]): RuntimeValue {
    const numericArgs: NumberValue[] = expectNumericArgs(args, 1);

    const number: NumberValue = numericArgs[0];
    const result = Math.tan(number.value);

    return { type: "number", value: normalizeNumber(result) } as NumberValue;
}