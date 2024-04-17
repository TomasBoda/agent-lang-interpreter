import { ErrorRuntime } from "../../utils/index.ts";
import { AgentValue, AgentsValue, BooleanValue, ColourValue, FunctionCall, FunctionValue, NullValue, NumberValue, RuntimeAgent, RuntimeValue, ValueType } from "../model/index.ts";

export const NUMERIC_LITERAL_MAX_DECIMAL_PLACES = 8;

/**
 * Creates a global function
 * 
 * @param call function call to execute on using the function
 * @returns function call value
 */
export function createGlobalFunction(call: FunctionCall): FunctionValue {
    return { type: ValueType.Function, call } as FunctionValue;
}

/**
 * Asserts the correct argument count of a function
 * 
 * @param identifier identifier of the function
 * @param expected expected argument count
 * @param provided provided argument count
 */
export function expectArgumentCount(identifier: string, expected: number, provided: number): void {
    if (expected !== provided) {
        throw new ErrorRuntime(`Function '${identifier}' expected ${expected} arguments, ${provided} provided`);
    }
}

/**
 * Asserts the correct argument type of a function
 * 
 * @param identifier identifier of the function
 * @param argument argument to assert
 * @param type expected type of the argument
 */
export function expectArgumentType(identifier: string, argument: RuntimeValue, type: ValueType): void {
    if (argument.type !== type) {
        throw new ErrorRuntime(`Function '${identifier}' expected argument of type '${type}', '${argument.type}' provided`);
    }
}

/**
 * Creates a runtime value of type number
 * 
 * @param value numeric value to provide
 * @returns number runtime value
 */
export function createNumberValue(value: number): NumberValue {
    return { type: ValueType.Number, value: value };
}

/**
 * Creates a runtime value of type boolean
 * 
 * @param value boolean value to provide
 * @returns boolean runtime value
 */
export function createBooleanValue(value: boolean): BooleanValue {
    return { type: ValueType.Boolean, value };
}

/**
 * Creates a runtime value of type agent
 * 
 * @param value agent value to provide
 * @returns agent runtime value
 */
export function createAgentValue(value: RuntimeAgent): AgentValue {
    return { type: ValueType.Agent, value };
}

/**
 * Creates a runtime value of type agent list
 * 
 * @param value agent list value to provide
 * @returns agent list runtime value
 */
export function createAgentsValue(value: RuntimeAgent[]): AgentsValue {
    return { type: ValueType.Agents, value };
}

/**
 * Creates a runtime value of type null
 * 
 * @returns null runtime value
 */
export function createNullValue(): NullValue {
    return { type: ValueType.Null };
}

/**
 * Creates a runtime value of type colour
 * 
 * @param red red colour value
 * @param green green colour value
 * @param blue blue colour value
 * @returns colour runtime value
 */
export function createColourValue(red: number, green: number, blue: number): ColourValue {
    return { type: ValueType.Colour, value: { red, green, blue } };
}

/**
 * Normalizes the given decimal number to given number of decimal digits
 * 
 * @param value numeric value to normalize
 * @param digits number of digits to keep
 * @returns normalized numeric value
 */
export function normalizeNumber(value: number, digits: number = NUMERIC_LITERAL_MAX_DECIMAL_PLACES): number {
    const pow = Math.pow(10, digits);
    return Math.round(value * pow) / pow;
}