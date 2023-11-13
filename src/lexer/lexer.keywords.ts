import { TokenType } from "./lexer.types";

export const ReservedKeywords: Record<string, TokenType> = {
    "agent": TokenType.Agent,

    "property": TokenType.Property,
    
    "if": TokenType.If,
    "then": TokenType.Then,
    "else": TokenType.Else,

    "and": TokenType.RelationalOperator,
    "or": TokenType.RelationalOperator,

    "true": TokenType.Boolean,
    "false": TokenType.Boolean,
}