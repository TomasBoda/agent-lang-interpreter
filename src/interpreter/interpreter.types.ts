
export type AgentVariableIdentifier = string;
export type AgentVariableValue = number | boolean;

export type AgentVariables = Map<AgentVariableIdentifier, AgentVariableValue>;

export interface Agent {
    id: string;
    identifier: string;
    variables: AgentVariables;
}

export interface InterpreterConfiguration {
    steps: number;
    delay: number;
}

export interface InterpreterOutput {
    step: number;
    agents: Agent[];
}