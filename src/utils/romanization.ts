
/**
 * Simple Revised Romanization of Korean implementation.
 * Handles basic mappings and simple batchim rules.
 */

const INITIALS = [
    'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'
];

const VOWELS = [
    'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'
];

const FINALS = [
    '', 'k', 'k', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 't', 'ss', 'ng', 't', 'ch', 'k', 't', 'p', 'h'
];

// Special case for ㄹ when it's at the end of a syllable or between vowels
// This implementation is a simplified version.

export function romanize(hangeul: string): string {
    if (!hangeul) return '';

    let result = '';

    for (let i = 0; i < hangeul.length; i++) {
        const char = hangeul[i];
        const code = char.charCodeAt(0);

        if (code >= 0xAC00 && code <= 0xD7A3) {
            const hIndex = code - 0xAC00;
            const final = hIndex % 28;
            const vowel = ((hIndex - final) / 28) % 21;
            const initial = Math.floor(((hIndex - final) / 28) / 21);

            let romanInitial = INITIALS[initial];
            let romanVowel = VOWELS[vowel];
            let romanFinal = FINALS[final];

            // Adjustments for 'ㄹ' (initial/final)
            if (romanInitial === 'r' && i > 0) {
                // If previous char had a final consonant, r might become n (assimilation)
                // but usually r is 'l' if it's following another l.
                // Simplified: use 'r' for initial.
            }

            result += romanInitial + romanVowel + romanFinal;
        } else {
            result += char;
        }
    }

    return result;
}
