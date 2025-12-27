
import { GoogleGenAI } from "@google/genai";
import { DailyEntry } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateMonthlySummary = async (entries: DailyEntry[], monthName: string) => {
  if (entries.length === 0) return "时光未留痕迹，期待下月的相遇。";

  const photoParts = entries.map(entry => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: entry.imageUrl.split(',')[1]
    }
  }));

  const captions = entries.map(e => `${e.date}: ${e.caption}`).join('\n');

  const textPart = {
    text: `你是一位极具审美和温情的私人文学编辑。这是我在 ${monthName} 的生活切片。
    
    心情记录如下：
    ${captions}

    请为我这一个月写一段充满“电影感”和“散文诗”质感的总结。
    
    要求：
    1. 语气：像是在静谧的午后与旧友交谈，克制而深情。
    2. 结构：
       - 给这段记忆起一个优雅的【小标题】。
       - 分为两段：第一段从照片的光影和细节出发，第二段上升到人生的感悟。
       - 结尾提供一个具有电影谢幕感的短句。
    3. 风格：避免俗套，追求细腻的通感（如嗅觉、触觉、光照）。
    4. 字数：250字左右。`
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [...photoParts, textPart] },
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini summary error:", error);
    return "记忆在云端迷失了，请稍后再试。";
  }
};
