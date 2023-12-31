import { ErrorRuntime } from "../../utils";
import { AgentValue, AgentsValue, BooleanValue, FunctionCall, FunctionValue, NullValue, NumberValue, RuntimeAgent, RuntimeValue, ValueType } from "../model";

export function createGlobalFunction(call: FunctionCall): FunctionValue {
    return { type: ValueType.Function, call } as FunctionValue;
}

export function expectArgumentCount(identifier: string, expected: number, provided: number): void {
    if (expected !== provided) {
        throw new ErrorRuntime(`Function '${identifier}' expected ${expected} arguments, ${provided} provided`);
    }
}

export function expectArgumentType(identifier: string, argument: RuntimeValue, type: ValueType): void {
    if (argument.type !== type) {
        throw new ErrorRuntime(`Function '${identifier}' expected argument of type '${type}', '${argument.type}' provided`);
    }
}

export function createNumberValue(value: number): NumberValue {
    return { type: ValueType.Number, value: normalizeNumber(value) };
}

export function createBooleanValue(value: boolean): BooleanValue {
    return { type: ValueType.Boolean, value };
}

export function createAgentValue(value: RuntimeAgent): AgentValue {
    return { type: ValueType.Agent, value };
}

export function createAgentsValue(value: RuntimeAgent[]): AgentsValue {
    return { type: ValueType.Agents, value };
}

export function createNullValue(): NullValue {
    return { type: ValueType.Null };
}

export function normalizeNumber(value: number, digits: number = 2): number {
    const pow = Math.pow(10, digits);
    return Math.round(value * pow) / pow;
}