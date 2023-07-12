
export enum TokenType {
    Agent,

    Variable,
    Const,
    Dynamic,

    If,
    Then,
    Else,
    And,
    Or,
    As,

    Identifier,
    Number,

    Equals,
    BinaryOperator,

    OpenParen,
    CloseParen,
    OpenBrace,
    CloseBrace,

    Comma,
    Dot,
    Colon,
    Semicolon,
}

export interface Token {
    value: string;
    type: TokenType;
}