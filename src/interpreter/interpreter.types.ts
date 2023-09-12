
export interface InterpreterConfiguration {
    steps: number;
    delay: number;
    width: number;
    height: number;
}

export interface Agent {
    identifier: string;
    variables: Object;
}

export interface AgentOutput {
    step: number;
    agents: Agent[];
}

export interface ExitStatus {
    code: number;
    message?: string;
}

export interface InterpreterOutput {
    status: ExitStatus;
    output?: AgentOutput;
}