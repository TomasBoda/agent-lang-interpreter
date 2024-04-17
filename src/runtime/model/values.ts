import { ValueType } from "./value-type.ts";

/**
 * Generic runtime value
 */
export interface RuntimeValue {
    type: ValueType;
}

/**
 * Runtime value representing a number
 */
export interface NumberValue extends RuntimeValue {
    type: ValueType.Number;
    value: number;
}

/**
 * Runtime value representing a boolean
 */
export interface BooleanValue extends RuntimeValue {
    type: ValueType.Boolean;
    value: boolean;
}

/**
 * Runtime value representing an identifier
 */
export interface IdentifierValue extends RuntimeValue {
    type: ValueType.Identifier;
    value: string;
}

export type FunctionCall = (args: RuntimeValue[]) => RuntimeValue;

/**
 * Runtime value representing a function
 */
export interface FunctionValue extends RuntimeValue {
    type: ValueType.Function;
    call: FunctionCall;
}

/**
 * Runtime value representing a null value
 */
export interface NullValue extends RuntimeValue {
    type: ValueType.Null;
}

/**
 * Runtime value representing an agent
 */
export interface AgentValue extends RuntimeValue {
    type: ValueType.Agent;
    value: RuntimeAgent;
}

/**
 * Runtime value representing a list of agents
 */
export interface AgentsValue extends RuntimeValue {
    type: ValueType.Agents;
    value: RuntimeAgent[];
}

/**
 * Runtime value representing a set comprehension
 */
export interface SetComprehensionValue extends RuntimeValue {
    type: ValueType.SetComprehension;
    agents: RuntimeAgent[];
    results: RuntimeValue[];
}

/**
 * Runtime value representing an RGB colour
 */
export interface ColourValue extends RuntimeValue {
    type: ValueType.Colour;
    value: {
        red: number;
        green: number;
        blue: number;
    }
}

/**
 * Runtime value representing a runtime agent instance
 * This object is returned as part of the interpreter output
 */
export interface RuntimeAgent {
    /** unique id of the runtime agent instance */
    id: string;
    /** identifier of the agent */
    identifier: string;
    /** hash map containing the runtime values of the agent's properties */
    variables: Map<string, RuntimeValue>;
}

/**
 * Runtime value representing a runtime output
 * This object is returned as part of the interpreter output
 */
export interface RuntimeOutput extends RuntimeValue {
    type: ValueType.Output;
    /** the value of the current step */
    step: number;
    /** the list of runtime agent instances */
    agents: RuntimeAgent[];
}