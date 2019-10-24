a = b
/hi/g.exec(c).map(d);

// where the first non-whitespace, non-comment code point after a LineTerminator is U+002F (SOLIDUS) and the syntactic context allows division or division-assignment, no semicolon is inserted at the LineTerminator. That is, the above example is interpreted in the same way as:

a = b / hi / g.exec(c).map(d);


// The source

{ 1 2 } 3
// is not a valid sentence in the ECMAScript grammar, even with the automatic semicolon insertion rules. In contrast, the source

{ 1
2 } 3
// is also not a valid ECMAScript sentence, but is transformed by automatic semicolon insertion into the following:

{ 1
;2 ;} 3;
// which is a valid ECMAScript sentence.

// The source

for (a; b
)
// is not a valid ECMAScript sentence and is not altered by automatic semicolon insertion because the semicolon is needed for the header of a  for statement. Automatic semicolon insertion never inserts one of the two semicolons in the header of a for statement.

// The source

return
a + b
// is transformed by automatic semicolon insertion into the following:

return;
a + b;
// NOTE 1
// The expression a + b is not treated as a value to be returned by the return statement, because a LineTerminator separates it from the token return.

// The source

a = b
++c
// is transformed by automatic semicolon insertion into the following:

a = b;
++c;
// NOTE 2
// The token ++ is not treated as a postfix operator applying to the variable b, because a LineTerminator occurs between b and ++.

// The source

if (a > b)
else c = d
// is not a valid ECMAScript sentence and is not altered by automatic semicolon insertion before the else token, even though no production of the grammar applies at that point, because an automatically inserted semicolon would then be parsed as an empty statement.

// The source

a = b + c
(d + e).print()
// is not transformed by automatic semicolon insertion, because the parenthesized expression that begins the second line can be interpreted as an argument list for a function call:

a = b + c(d + e).print()
// In the circumstance that an assignment statement must begin with a left parenthesis, it is a good idea for the programmer to provide an explicit semicolon at the end of the preceding statement rather than to rely on automatic semicolon insertion.
