
export interface Position {
    line: number;
    character: number;
}

export interface Symbol {
    value: string;
    position: Position;
}

export enum TokenType {
    Null = "Null",

    Agent = "Agent",

    Variable = "Variable",
    Const = "Const",
    Dynamic = "Dynamic",

    If = "If",
    Then = "Then",
    Else = "Else",
    And = "And",
    Or = "Or",
    As = "As",

    Identifier = "Identifier",
    Number = "Number",

    Equals = "Equals",
    BinaryOperator = "BinaryOperator",

    OpenParen = "OpenParen",
    CloseParen = "CloseParen",
    OpenBrace = "OpenBrace",
    CloseBrace = "CloseBrace",

    Comma = "Comma",
    Dot = "Dot",
    Colon = "Colon",
    Semicolon = "Semicolon",

    EOF = "EOF"
}

export interface Token {
    value: string;
    type: TokenType;
    position: Position;
}