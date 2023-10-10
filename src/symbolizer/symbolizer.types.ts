
export interface Position {
    line: number;
    character: number;
}

export interface Symbol {
    value: string;
    position: Position;
}