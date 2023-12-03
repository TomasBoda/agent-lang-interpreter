import { TokenType } from "./lexer.types";

export const ReservedKeywords: Record<string, TokenType> = {
    "agent": TokenType.Agent,

    "property": TokenType.Property,
    "const": TokenType.Const,
    
    "if": TokenType.If,
    "then": TokenType.Then,
    "else": TokenType.Else,

    "otherwise": TokenType.Otherwise,

    "and": TokenType.RelationalOperator,
    "or": TokenType.RelationalOperator,

    "true": TokenType.Boolean,
    "false": TokenType.Boolean,
}