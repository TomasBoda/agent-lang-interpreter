
export enum ValueType {
    Error = "Error",
    
    Number = "Number",
    Boolean = "Boolean",
    Function = "Function",
    Void = "Void",
    Agent = "Agent",
    Agents = "Agents",
    Lambda = "Lambda",
    Identifier = "Identifier",
    Output = "Output",
}

export interface RuntimeValue {
    type: ValueType;
}

export interface RuntimeError extends RuntimeValue {
    type: ValueType.Error;
    message: string;
}

export interface VoidValue extends RuntimeValue {
    type: ValueType.Void;
    value: void;
}

export interface NumberValue extends RuntimeValue {
    type: ValueType.Number;
    value: number;
}

export interface BooleanValue extends RuntimeValue {
    type: ValueType.Boolean;
    value: boolean;
}

export interface IdentifierValue extends RuntimeValue {
    type: ValueType.Identifier;
    value: string;
}

export type FunctionCall = (args: RuntimeValue[]) => RuntimeValue;

export interface FunctionValue extends RuntimeValue {
    type: ValueType.Function;
    call: FunctionCall;
}

export interface RuntimeAgent {
    id: string;
    identifier: string;
    variables: Map<string, RuntimeValue>;
}

export interface AgentValue extends RuntimeValue {
    type: ValueType.Agent;
    value: RuntimeAgent;
}

export interface AgentsValue extends RuntimeValue {
    type: ValueType.Agents;
    value: RuntimeAgent[];
}

export interface LambdaValue extends RuntimeValue {
    type: ValueType.Lambda;
    agents: RuntimeAgent[];
    results: RuntimeValue[];
}

export interface RuntimeOutput extends RuntimeValue {
    type: ValueType.Output;
    step: number;
    agents: RuntimeAgent[];
}