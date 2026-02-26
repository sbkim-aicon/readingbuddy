import { analyzeKoreanSentenceServer } from '../app/actions_kiwi';

export interface AnalyzedToken {
    text: string;     // The original word chunk (e.g., "데이터를")
    stem: string;     // The clickable stem (e.g., "데이터")
    particle: string; // The non-clickable trailing part (e.g., "를")
    lemma: string;    // The base form for dictionary lookup (e.g., "데이터")
    pos: string;      // Part of speech of the stem
}

export async function analyzeKoreanSentence(sentence: string): Promise<AnalyzedToken[]> {
    try {
        // Call the server action instead of loading 100MB in the browser
        const morphemes = await analyzeKoreanSentenceServer(sentence);
        if (!morphemes || morphemes.length === 0) return [];

        const tokens: AnalyzedToken[] = [];

        // Group morphemes by space-separated words (eojeols)
        // We split while keeping the delimiters (spaces)
        const eojeolParts = sentence.split(/(\s+)/);
        let mIdx = 0;
        let currentOffset = 0;

        for (const part of eojeolParts) {
            if (!part) continue;

            if (/^\s+$/.test(part)) {
                // It's a space or sequence of spaces
                tokens.push({
                    text: part,
                    stem: '',
                    particle: part,
                    lemma: '',
                    pos: 'SPACE'
                });
                currentOffset += part.length;
                continue;
            }

            // It's a word. Collect all morphemes that fall within this word's range.
            let wordMorphemes: any[] = [];
            const partEnd = currentOffset + part.length;

            while (mIdx < morphemes.length && morphemes[mIdx].position < partEnd) {
                wordMorphemes.push(morphemes[mIdx]);
                mIdx++;
            }

            if (wordMorphemes.length === 0) {
                // No Korean morphemes found (e.g., punctuation or foreign word)
                tokens.push({
                    text: part,
                    stem: '',
                    particle: part,
                    lemma: '',
                    pos: 'UNK'
                });
            } else {
                // Find the boundary between 'content' and 'particle'
                // Content = Noun, Verb, Modifier, Affix (N, V, M, X)
                let contentEndIdx = currentOffset;
                let lemma = '';
                let pos = '';
                let foundNonContent = false;

                for (const m of wordMorphemes) {
                    const isContent = m.tag.startsWith('N') || m.tag.startsWith('V') || m.tag.startsWith('M') || m.tag.startsWith('X');

                    if (isContent && !foundNonContent) {
                        contentEndIdx = m.position + m.length;
                        if (!lemma) {
                            lemma = m.tag.startsWith('V') ? m.str + '다' : m.str;
                            pos = m.tag;
                        }
                    } else {
                        foundNonContent = true;
                    }
                }

                tokens.push({
                    text: part,
                    stem: sentence.substring(currentOffset, contentEndIdx),
                    particle: sentence.substring(contentEndIdx, partEnd),
                    lemma: lemma || part,
                    pos: pos || 'UNK'
                });
            }
            currentOffset += part.length;
        }

        return tokens;
    } catch (err) {
        console.error("Analysis Failure (Client Bridge):", err);
        return [];
    }
}
