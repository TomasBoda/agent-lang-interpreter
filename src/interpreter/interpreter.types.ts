
export interface InterpreterConfiguration {
    steps: number;
    delay: number;
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

export interface Agent {
    identifier: string;
    variables: Object;
}

export interface InterpreterOutput {
    step: number;
    agents: Agent[];
}