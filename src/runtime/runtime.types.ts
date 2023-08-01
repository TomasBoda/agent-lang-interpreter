
export type ValueType = "number" | "boolean";

export interface RuntimeValue {
    type: ValueType;
}

export interface NumberValue extends RuntimeValue {
    type: "number";
    value: number;
}

export interface BooleanValue extends RuntimeValue {
    type: "boolean";
    value: boolean;
}

export interface RuntimeVariable {
    identifier: string;
    value: number | boolean;
}

export type AgentVariableIdentifier = string;
export type AgentVariableValue = number | boolean;
export type AgentVariables = Map<AgentVariableIdentifier, AgentVariableValue>;

export interface RuntimeAgent {
    id: string;
    identifier: string;
    variables: AgentVariables;
}

export interface RuntimeOutput {
    step: number;
    agents: RuntimeAgent[];
}