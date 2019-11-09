const defaults = {
  aliases: ['ps', 'eps'],
  syntax: 'postscript',
};

const keywords =
  'abs add aload anchorsearch and arc arcn arct arcto array ashow astore atan awidthshow begin bind bitshift bytesavailable cachestatus ceiling charpath clear cleartomark cleardictstack clip clippath closefile closepath colorimage concat concatmatrix condition configurationerror copy copypage cos count countdictstack countexecstack counttomark cshow currentblackgeneration currentcacheparams currentcmykcolor currentcolor currentcolorrendering currentcolorscreen currentcolorspace currentcolortransfer currentcontext currentdash currentdevparams currentdict currentfile currentflat currentfont currentglobal currentgray currentgstate currenthalftone currenthalftonephase currenthsbcolor currentlinecap currentlinejoin currentlinewidth currentmatrix currentmiterlimit currentobjectformat currentpacking currentpagedevice currentpoint currentrgbcolor currentscreen currentshared currentstrokeadjust currentsystemparams currenttransfer currentundercolorremoval currentuserparams curveto cvi cvlit cvn cvr cvrs cvs cvx def defaultmatrix definefont defineresource defineusername defineuserobject deletefile detach deviceinfo dict dictfull dictstack dictstackoverflow dictstackunderflow div dtransform dup echo eexec end eoclip eofill eoviewclip eq erasepage errordict exch exec execform execstack execstackoverflow execuserobject executeonly executive exit exp false file filenameforall fileposition fill filter findencoding findfont findresource flattenpath floor flush flushfile FontDirectory for forall fork ge get getinterval globaldict GlobalFontDirectory glyphshow grestore grestoreall gsave gstate gt handleerror identmatrix idiv idtransform if ifelse image imagemask index ineofill infill initclip initgraphics initmatrix initviewclip instroke internaldict interrupt inueofill inufill inustroke invalidaccess invalidcontext invalidexit invalidfileaccess invalidfont invalidid invalidrestore invertmatrix ioerror ISOLatin1Encoding itransform join kshow known languagelevel le length limitcheck lineto ln load lock log loop lt makefont makepattern mark matrix maxlength mod monitor moveto mul ne neg newpath noaccess nocurrentpoint not notify null nulldevice or packedarray pathbbox pathforall pop print printobject product prompt pstack put putinterval quit rand rangecheck rcurveto read readhexstring readline readonly readstring realtime rectclip rectfill rectstroke rectviewclip renamefile repeat resetfile resourceforall resourcestatus restore reversepath revision rlineto rmoveto roll rootfont rotate round rrand run save scale scalefont scheck search selectfont serialnumber setbbox setblackgeneration setcachedevice setcachedevice2 setcachelimit setcacheparams setcharwidth setcmykcolor setcolor setcolorrendering setcolorscreen setcolorspace setcolortransfer setdash setdevparams setfileposition setflat setfont setglobal setgray setgstate sethalftone sethalftonephase sethsbcolor setlinecap setlinejoin setlinewidth setmatrix setmiterlimit setobjectformat setoverprint setpacking setpagedevice setpattern setrgbcolor setscreen setshared setstrokeadjust setsystemparams settransfer setucacheparams setundercolorremoval setuserparams setvmthreshold shareddict show showpage sin sqrt srand stack stackoverflow stackunderflow StandardEncoding start startjob status statusdict stop stopped store string stringwidth stroke strokepath sub syntaxerror systemdict timeout transform translate true truncate type typecheck token uappend ucache ucachestatus ueofill ufill undef undefined undefinedfilename undefineresource undefinedresult undefinefont undefineresource undefinedresource undefineuserobject unmatchedmark unregistered upath userdict UserObjects usertime ustroke ustrokepath version viewclip viewclippath VMerror vmreclaim vmstatus wait wcheck where widthshow write writehexstring writeobject writestring wtranslation xcheck xor xshow xyshow yield yshow';
// const quotes = `(…) <…> <~…~>`;
const enclosures = `{…} […] <<…>> (…) <~…~> <…>`;
const comments = `%…\n`;

/// PATTERNS
const COMMENTS = /%/;
const OPERATORS = /\/\/|\/|={1,2}/;
const ENCLOSURES = /<<|>>|{|}|\[|\]/;
const QUOTES = /<~|~>|<|>|\(|\)/;
const WHITESPACE = /[\s\n]+/; // /[\0\x09\x0A\x0C\x0D\x20]/;

// NUMBERS
const DECIMAL = /[+\-]?\d+\.?|[+\-]?\d*\.\d+/;
const EXPONENTIAL = /\d+[eE]\-?\d+|\d+\.\d+[eE]\-?\d+/;
const RADIX = /[2-9]#\d+|1\d#[\da-jA-J]+|2\d#[\da-tA-T]+|3[0-6][\da-zA-Z]+/;

// NAMES
const NAME = /[\da-zA-Z$@.\-]+/;

// STRINGS
const ASCII16 = /(?:[\da-fA-F]{2})*[\da-fA-F]{1,2}/;
const ASCII85 = /(?:[!-uz]{4})*[!-uz]{1,4}/;
// const STRING = /\((?:[^\\]|\\.|\((?:[^\\]|\\.|.)*?\)[^()]+\))\)/
// const STRING = /\((?:[^\\]|\\.|\((?:[^\\]|\\.|.)*\)[^()]+\))\)/
// const STRING = /\((?:[^\\]|\\.|\((?:[^\\]*?|\\.)*?\)[^()\\]*\))+?\)/
// const STRING = /\((?:[^()]*|\(.*?\)[^()]*\))*\)/

export const postscript = Object.defineProperties(
  ({symbols, closures, sequence}, {aliases, syntax} = defaults) => ({
    syntax,
    keywords: Symbols.from(keywords),
    quotes: closures(quotes),
    closures: closures(enclosures),
    patterns: {
      maybeIdentifier: new RegExp(`^${NAME.source}$`),
    },
    matcher: sequence`(${WHITESPACE})|(${all(COMMENTS, OPERATORS, ENCLOSURES, QUOTES)})|(${all(
      DECIMAL,
      EXPONENTIAL,
      RADIX,
      NAME,
    )})`,
    matchers: {
      // '(': /(\\?\n)|(\\.|(?:[^()]+|\(.*\)|))/
    },
  }),
  {
    defaults: {get: () => ({...defaults})},
  },
);

// ...(modes[syntax] = {syntax}),

// ...(modes.html = {syntax: 'html'}),
// keywords: symbols('DOCTYPE doctype'),
// comments: closures('<!--…-->'),
// quotes: [],
// closures: closures('<%…%> <!…> <…/> </…> <…>'),
// patterns: {
//   ...patterns,
//   closeTag: /<\/\w[^<>{}]*?>/g,
//   maybeIdentifier: /^(?:(?:[a-z][\-a-z]*)?[a-z]+\:)?(?:[a-z][\-a-z]*)?[a-z]+$/,
// },
// matcher: matchers.xml,
// matchers: {
//   quote: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])|"|')/g,
//   comment: /(\n)|(-->)/g,
// },
// if (aliases) for (const mode of postscript.aliases) modes[id] = modes[syntax];
