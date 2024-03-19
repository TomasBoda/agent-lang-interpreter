
export enum TokenType {
    Agent = "Agent",
    Define = "Define",
    Property = "Property",
    Const = "Const",

    If = "If",
    Then = "Then",
    Else = "Else",

    Otherwise = "Otherwise",

    Identifier = "Identifier",
    Number = "Number",
    Boolean = "Boolean",

    BinaryOperator = "BinaryOperator",
    UnaryOperator = "UnaryOperator",
    RelationalOperator = "RelationalOperator",
    AssignmentOperator = "AssignmentOperator",

    Arrow = "Arrow",
    Divider = "Divider",

    OpenParen = "OpenParen",
    CloseParen = "CloseParen",
    OpenBrace = "OpenBrace",
    CloseBrace = "CloseBrace",

    Comma = "Comma",
    Dot = "Dot",
    Colon = "Colon",
    Semicolon = "Semicolon",

    Comment = "Comment",

    EOF = "EOF"
}