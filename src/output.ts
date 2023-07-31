
export type AgentVariableIdentifier = string;
export type AgentVariableValue = number | boolean;

export type AgentVariables = Map<AgentVariableIdentifier, AgentVariableValue>;

export interface Agent {
    id: number;
    identifier: string;
    variables: AgentVariables;
}

export interface InterpreterOutput {
    step: number;
    agents: Agent[];
}