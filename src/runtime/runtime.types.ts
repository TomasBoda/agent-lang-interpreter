
export type ValueType = "error" | "number" | "boolean" | "function" | "output" | "void";

export interface RuntimeValue {
    type: ValueType;
}

export interface RuntimeError extends RuntimeValue {
    type: "error";
    message: string;
}

export interface VoidValue extends RuntimeValue {
    type: "void";
    value: void;
}

export interface NumberValue extends RuntimeValue {
    type: "number";
    value: number;
}

export interface BooleanValue extends RuntimeValue {
    type: "boolean";
    value: boolean;
}

export type FunctionCall = (args: RuntimeValue[]) => RuntimeValue;

export interface FunctionValue extends RuntimeValue {
    type: "function";
    call: FunctionCall;
}

export type AgentVariableIdentifier = string;
export type AgentVariableValue = number | boolean;
export type AgentVariables = Map<AgentVariableIdentifier, AgentVariableValue>;

export interface RuntimeAgent {
    id: string;
    identifier: string;
    variables: AgentVariables;
}

export interface RuntimeOutput extends RuntimeValue {
    type: "output";
    step: number;
    agents: RuntimeAgent[];
}