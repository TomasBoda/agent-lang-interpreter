import { ExitStatus } from "../interpreter/interpreter.types";
import { Position } from "../symbolizer/symbolizer.types";

export enum TokenType {
    Agent = "Agent",
    Property = "Property",
    Const = "Const",

    If = "If",
    Then = "Then",
    Else = "Else",

    Identifier = "Identifier",
    Number = "Number",
    Boolean = "Boolean",

    BinaryOperator = "BinaryOperator",
    UnaryOperator = "UnaryOperator",
    RelationalOperator = "RelationalOperator",
    AssignmentOperator = "AssignmentOperator",

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

export interface LexerOutput {
    status: ExitStatus;
    tokens?: Token[];
}