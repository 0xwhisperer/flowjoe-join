// dictationUtils.js - Shared speech transcript cleanup for FlowJoe dictation inputs
const SPOKEN_LINE_BREAKS = [
  ["new paragraph", "\n\n"],
  ["new para", "\n\n"],
  ["new line", "\n"],
  ["newline", "\n"],
  ["line break", "\n"]
];

const SPOKEN_PUNCTUATION = [
  ["question mark", "?"],
  ["exclamation point", "!"],
  ["exclamation mark", "!"],
  ["ellipsis", "..."],
  ["elipse", "..."],
  ["ellipse", "..."],
  ["dot", "."],
  ["full stop", "."],
  ["period", "."],
  ["comma", ","],
  ["semicolon", ";"],
  ["semi colon", ";"],
  ["colon", ":"],
  ["forward slash", "/"],
  ["slash", "/"],
  ["back slash", "\\"],
  ["backslash", "\\"],
  ["ampersand", "&"],
  ["and symbol", "&"],
  ["dollar sign", "$"],
  ["asterisk", "*"],
  ["astrics", "*"],
  ["asterix", "*"],
  ["percent symbol", "%"],
  ["percent sign", "%"],
  ["tilde", "~"],
  ["tilda", "~"],
  ["pound sign", "#"],
  ["hash sign", "#"],
  ["number sign", "#"],
  ["at symbol", "@"],
  ["at sign", "@"],
  ["pipe symbol", "|"],
  ["pipe sign", "|"],
  ["vertical bar", "|"],
  ["greater than symbol", ">"],
  ["greater than sign", ">"],
  ["greater then symbol", ">"],
  ["less than symbol", "<"],
  ["less than sign", "<"],
  ["dash", "-"],
  ["hyphen", "-"],
  ["single quote", "'"],
  ["apostrophe", "'"],
  ["open parenthesis", "("],
  ["open parentheiss", "("],
  ["left parenthesis", "("],
  ["open parentheses", "("],
  ["left parentheses", "("],
  ["open paren", "("],
  ["open parens", "("],
  ["open parns", "("],
  ["open bracket", "["],
  ["left bracket", "["],
  ["open brakcet", "["],
  ["close bracket", "]"],
  ["right bracket", "]"],
  ["closed bracket", "]"],
  ["open curly brace", "{"],
  ["left curly brace", "{"],
  ["open brace", "{"],
  ["close curly brace", "}"],
  ["right curly brace", "}"],
  ["close brace", "}"],
  ["close parenthesis", ")"],
  ["clos parenthesis", ")"],
  ["right parenthesis", ")"],
  ["close parentheses", ")"],
  ["right parentheses", ")"],
  ["closed parenthesis", ")"],
  ["closed parentheses", ")"],
  ["close paren", ")"],
  ["close parens", ")"],
  ["close parsn", ")"],
  ["close pernethesis", ")"],
  ["open quote", '"'],
  ["close quote", '"'],
  ["quote", '"'],
  ["em space", "\u2003"],
  ["m space", "\u2003"],
  ["bullet point", "\u2022 "]
];

const DIGIT_WORDS = [
  ["zero", "0"],
  ["one", "1"],
  ["two", "2"],
  ["three", "3"],
  ["four", "4"],
  ["five", "5"],
  ["six", "6"],
  ["seven", "7"],
  ["eight", "8"],
  ["nine", "9"]
];

DIGIT_WORDS.forEach(([word, digit]) => {
  SPOKEN_PUNCTUATION.push([`numeral ${word}`, digit], [`number ${word}`, digit], [`digit ${word}`, digit]);
  SPOKEN_PUNCTUATION.push([`numeral ${digit}`, digit], [`number ${digit}`, digit], [`digit ${digit}`, digit]);
});

const BACKSPACE_COUNTS = new Map([
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10]
]);

for (let i = 1; i <= 10; i += 1) {
  BACKSPACE_COUNTS.set(String(i), i);
}

"abcdefghijklmnopqrstuvwxyz".split("").forEach((letter) => {
  SPOKEN_PUNCTUATION.push([`capital letter ${letter}`, letter.toUpperCase()]);
  SPOKEN_PUNCTUATION.push([`capital latter ${letter}`, letter.toUpperCase()]);
  SPOKEN_PUNCTUATION.push([`capital ${letter}`, letter.toUpperCase()]);
  SPOKEN_PUNCTUATION.push([`uppercase letter ${letter}`, letter.toUpperCase()]);
  SPOKEN_PUNCTUATION.push([`uppercase ${letter}`, letter.toUpperCase()]);
  SPOKEN_PUNCTUATION.push([`lowercase letter ${letter}`, letter]);
  SPOKEN_PUNCTUATION.push([`lowercase ${letter}`, letter]);
  SPOKEN_PUNCTUATION.push([`letter ${letter}`, letter]);
});

function escapeRegExp(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phrasePattern(phrase) {
  return String(phrase || "")
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join("\\s+");
}

function replaceSpokenPhrase(text, phrase, replacement) {
  const pattern = phrasePattern(phrase);
  if (!pattern) return text;
  const regex = new RegExp(`(^|[\\s\\u00a0])${pattern}(?=$|[\\s\\u00a0.,!?;:)\\]}])`, "gi");
  return String(text || "").replace(regex, (_match, prefix) => `${prefix || ""}${replacement}`);
}

function normalizeCommandKey(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function replaceWrappedCommandTokens(text, commandEntries) {
  const replacements = new Map();
  for (const [phrase, replacement] of commandEntries) {
    const key = normalizeCommandKey(phrase);
    if (key) replacements.set(key, replacement);
  }
  return String(text || "").replace(/\{([^{}\n]{1,80})\}/g, (match, command) => {
    const key = normalizeCommandKey(command);
    return replacements.has(key) ? replacements.get(key) : match;
  });
}

function parseBackspaceCommand(command) {
  const key = normalizeCommandKey(command);
  if (key === "backspace" || key === "back space") return 1;
  if (key === "go back") return 1;
  const match = key.match(/^(?:go\s+)?back\s+(.+)$/);
  if (!match) return 0;
  return BACKSPACE_COUNTS.get(match[1]) || 0;
}

function replaceWrappedBackspaceCommands(text) {
  return String(text || "").replace(/\{([^{}\n]{1,80})\}/g, (match, command) => {
    return parseBackspaceCommand(command) > 0 ? ` ${normalizeCommandKey(command)} ` : match;
  });
}

function addSpaceAfterPunctuation(text) {
  return String(text || "").replace(/([,.;:!?])(\S)/g, (match, punct, next, offset, fullText) => {
    if (/[)\]}.,;:!?]/.test(next)) return match;
    const previous = offset > 0 ? fullText.charAt(offset - 1) : "";
    if (punct === "." && /\d/.test(next)) return match;
    if ((punct === "." || punct === ",") && /\d/.test(previous) && /\d/.test(next)) {
      return match;
    }
    return `${punct} ${next}`;
  });
}

function replaceDecimalPointBeforeNumber(text) {
  return String(text || "").replace(/(^|[\s\u00a0])decimal\s+point[\s\u00a0]+(\d|zero|one|two|three|four|five|six|seven|eight|nine)\b/gi, (_match, prefix, numberToken) => {
    const token = normalizeCommandKey(numberToken);
    const digitPair = DIGIT_WORDS.find(([word]) => word === token);
    return `${prefix || ""}.${digitPair ? digitPair[1] : token}`;
  });
}

function normalizeTranscript(text) {
  let normalized = String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ");

  const lineBreaks = SPOKEN_LINE_BREAKS.slice().sort((a, b) => b[0].length - a[0].length);
  const punctuation = SPOKEN_PUNCTUATION.slice().sort((a, b) => b[0].length - a[0].length);
  normalized = replaceWrappedCommandTokens(normalized, lineBreaks.concat(punctuation));
  normalized = replaceDecimalPointBeforeNumber(normalized);

  for (const [phrase, replacement] of lineBreaks) {
    normalized = replaceSpokenPhrase(normalized, phrase, replacement);
  }
  for (const [phrase, replacement] of punctuation) {
    normalized = replaceSpokenPhrase(normalized, phrase, replacement);
  }

  normalized = normalized
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/(\d)\.[ \t]+(?=\d)/g, "$1.")
    .replace(/(^|[\s\u00a0])\.[ \t]+(?=\d)/g, "$1.")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s+([)\]}])/g, "$1")
    .replace(/[ \t]+-/g, " -")
    .replace(/-[ \t]+/g, "- ")
    .replace(/\n{3,}/g, "\n\n");

  normalized = addSpaceAfterPunctuation(normalized)
    .replace(/"\s+([^"\n]*?)\s+"/g, '"$1"')
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/^[ \t]+|[ \t]+$/g, "");

  return normalized;
}

function appendDictationText(buffer, text) {
  const nextText = String(text || "");
  if (!nextText) return buffer;
  if (buffer && !/\s$/.test(buffer) && !/^(\s|[.,!?;:)\]}])/.test(nextText)) {
    return `${buffer} ${nextText}`;
  }
  return `${buffer}${nextText}`;
}

function createTextEdit(options = {}) {
  const prefix = String(options.prefix || "");
  const suffix = String(options.suffix || "");
  const rawTranscript = replaceWrappedBackspaceCommands(String(options.transcript || ""));
  const commandRegex = /\b(backspace|back\s+space|(?:go\s+)?back\s+(?:10|[1-9]|one|two|three|four|five|six|seven|eight|nine|ten)|go\s+back)\b/gi;
  let buffer = prefix;
  let deleteBefore = 0;
  let lastIndex = 0;

  function appendSegment(segment) {
    const normalizedSegment = normalizeTranscript(segment);
    if (normalizedSegment) {
      buffer = appendDictationText(buffer, normalizedSegment);
    }
  }

  function deleteFromBuffer(count) {
    const targetCount = Math.max(0, Math.min(10, Number(count) || 0));
    if (!targetCount) return;
    const nextLength = Math.max(0, buffer.length - targetCount);
    const removed = buffer.length - nextLength;
    buffer = buffer.slice(0, nextLength);
    deleteBefore += Math.max(0, targetCount - removed);
  }

  rawTranscript.replace(commandRegex, (match, command, offset) => {
    appendSegment(rawTranscript.slice(lastIndex, offset));
    deleteFromBuffer(parseBackspaceCommand(command));
    lastIndex = offset + match.length;
    return match;
  });

  appendSegment(rawTranscript.slice(lastIndex));

  return {
    value: `${buffer}${suffix}`,
    cursor: buffer.length,
    text: buffer.slice(prefix.length),
    deleteBefore
  };
}

const api = Object.assign({}, (typeof window !== "undefined" ? window : globalThis).FlowJoeDictation || {}, {
  normalizeTranscript,
  createTextEdit
});

export {normalizeTranscript, createTextEdit};
export default api;
