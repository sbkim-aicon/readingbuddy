'use server'

import { XMLParser } from 'fast-xml-parser';
import { romanize } from '../utils/romanization';

const API_KEY = process.env.KRDICT_API_KEY;

export interface DictSense {
    order: number;
    definition: string;
    example?: string;
    translation?: {
        word: string;
        definition: string;
    };
}

export interface DictEntry {
    target_code: string;
    word: string;
    sup_no: string;
    pos: string;
    posVn?: string;
    pronunciation?: string;
    link: string;
    senses: DictSense[];
}

const posMap: Record<string, string> = {
    '명사': 'Danh từ',
    '대명사': 'Đại từ',
    '수사': 'Số từ',
    '조사': 'Trợ từ',
    '동사': 'Động từ',
    '형용사': 'Tính từ',
    '관형사': 'Định từ',
    '부사': 'Phó từ',
    '감탄사': 'Thán từ',
    '접사': 'Tiếp tố',
    '어미': 'Vĩ tố',
    '의존 명사': 'Danh từ phụ thuộc',
    '보조 동사': 'Trợ động từ',
    '보조 형용사': 'Trợ tính từ'
};

function getVnPos(koPos: string): string | undefined {
    return posMap[koPos];
}

export async function searchDictionary(word: string): Promise<{ success: boolean; data?: DictEntry[]; error?: string }> {
    if (!API_KEY) {
        return { success: false, error: "KRDICT_API_KEY is not configured in .env.local" };
    }

    try {
        // method=search (어휘 검색)
        // q=word
        // translated=y (번역 포함)
        // trans_lang=7 (베트남어)
        const url = `https://krdict.korean.go.kr/api/search?key=${API_KEY}&q=${encodeURIComponent(word)}&translated=y&trans_lang=7&part=word&sort=popular`;

        console.log(`[DictAPI] Fetching: ${url.replace(API_KEY, 'HIDDEN')}`);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API response error: ${response.status}`);
        }

        const xmlData = await response.text();
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
        const jsonObj = parser.parse(xmlData);

        if (jsonObj.error) {
            return { success: false, error: jsonObj.error.message || "API Error" };
        }

        const items = jsonObj.channel?.item;
        if (!items) {
            return { success: true, data: [] };
        }

        // Handle single item vs multiple items
        const itemArray = Array.isArray(items) ? items : [items];

        const formattedData: DictEntry[] = await Promise.all(itemArray.slice(0, 3).map(async (item: any) => {
            // Fetch detailed view information for examples
            let detailSenses: any[] = [];
            try {
                const viewUrl = `https://krdict.korean.go.kr/api/view?key=${API_KEY}&method=target_code&q=${item.target_code}`;
                const viewResponse = await fetch(viewUrl);
                if (viewResponse.ok) {
                    const viewXml = await viewResponse.text();
                    const detailObj = parser.parse(viewXml);
                    const itemDetail = detailObj.channel?.item;
                    if (itemDetail && itemDetail.word_info) {
                        detailSenses = Array.isArray(itemDetail.word_info.sense_info)
                            ? itemDetail.word_info.sense_info
                            : [itemDetail.word_info.sense_info];
                    }
                }
            } catch (e) {
                console.error("[DictAPI] Detail fetch error:", e);
            }

            const senses = Array.isArray(item.sense) ? item.sense : [item.sense];

            return {
                target_code: item.target_code,
                word: item.word,
                sup_no: item.sup_no,
                pos: item.pos,
                posVn: getVnPos(item.pos),
                pronunciation: item.pronunciation ? romanize(item.pronunciation) : undefined,
                link: item.link,
                senses: senses.slice(0, 2).map((s: any, idx: number) => {
                    let translation = undefined;
                    if (s.translation) {
                        const transArray = Array.isArray(s.translation) ? s.translation : [s.translation];
                        const vnTrans = transArray.find((t: any) => t.trans_lang === "베트남어") || transArray[0];
                        if (vnTrans) {
                            translation = {
                                word: vnTrans.trans_word,
                                definition: vnTrans.trans_dfn
                            };
                        }
                    }

                    // Get example from detailSenses if available
                    let example = undefined;
                    if (detailSenses[idx] && detailSenses[idx].example_info) {
                        const exInfo = Array.isArray(detailSenses[idx].example_info)
                            ? detailSenses[idx].example_info[0]
                            : detailSenses[idx].example_info;
                        example = exInfo.example;
                    }

                    return {
                        order: s.sense_order,
                        definition: s.definition,
                        translation,
                        example
                    };
                })
            };
        }));

        return { success: true, data: formattedData };
    } catch (error: any) {
        console.error("[DictAPI] Error:", error);
        return { success: false, error: error.message };
    }
}
