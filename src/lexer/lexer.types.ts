import { ExitStatus } from "../interpreter/interpreter.types";

export enum TokenType {
    Agent = "Agent",

    Variable = "Variable",
    Const = "Const",
    Dynamic = "Dynamic",

    If = "If",
    Then = "Then",
    Else = "Else",
    And = "And",
    Or = "Or",

    Identifier = "Identifier",
    Number = "Number",
    Boolean = "Boolean",

    Equals = "Equals",
    BinaryOperator = "BinaryOperator",
    LambdaArrow = "LambdaArrow",

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

export interface Position {
    line: number;
    character: number;
}

export interface Symbol {
    value: string;
    position: Position;
}

export interface LexerValue {
    status: ExitStatus;
    tokens?: Token[];
}