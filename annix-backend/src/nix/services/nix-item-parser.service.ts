import { Injectable, Logger } from '@nestjs/common';
import { ClaudeChatProvider, ChatMessage } from '../ai-providers/claude-chat.provider';

export interface ParsedItemIntent {
  action: 'create_item' | 'update_item' | 'delete_item' | 'question' | 'validation' | 'unknown';
  itemType?: 'pipe' | 'bend' | 'reducer' | 'tee' | 'flange' | 'expansion_joint' | 'valve' | 'instrument' | 'pump';
  specifications?: {
    diameter?: number;
    secondaryDiameter?: number;
    length?: number;
    schedule?: string;
    material?: string;
    materialGrade?: string;
    angle?: number;
    flangeConfig?: string;
    flangeRating?: string;
    quantity?: number;
    description?: string;
  };
  confidence: number;
  explanation: string;
}

@Injectable()
export class NixItemParserService {
  private readonly logger = new Logger(NixItemParserService.name);
  private readonly chatProvider: ClaudeChatProvider;

  constructor() {
    this.chatProvider = new ClaudeChatProvider({
      temperature: 0.3,
      maxTokens: 1024,
    });
  }

  async parseUserIntent(userMessage: string, context?: {
    currentItems?: any[];
    recentMessages?: string[];
  }): Promise<ParsedItemIntent> {
    const systemPrompt = this.buildParserSystemPrompt(context);

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: `Parse this user message and extract the intent and specifications:\n\n"${userMessage}"\n\nRespond with JSON only, no additional text.`,
      },
    ];

    try {
      const response = await this.chatProvider.chat(messages, systemPrompt);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('No JSON found in parser response');
        return this.unknownIntent(userMessage);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        action: parsed.action || 'unknown',
        itemType: parsed.itemType,
        specifications: parsed.specifications || {},
        confidence: parsed.confidence || 0.5,
        explanation: parsed.explanation || 'Parsed user intent',
      };
    } catch (error) {
      this.logger.error(`Failed to parse user intent: ${error.message}`);
      return this.unknownIntent(userMessage);
    }
  }

  private buildParserSystemPrompt(context?: { currentItems?: any[]; recentMessages?: string[] }): string {
    let prompt = `You are a natural language parser for piping RFQ item creation. Extract structured data from user messages.

## Output Format

Return ONLY a JSON object with this structure:
{
  "action": "create_item" | "update_item" | "delete_item" | "question" | "validation" | "unknown",
  "itemType": "pipe" | "bend" | "reducer" | "tee" | "flange" | "expansion_joint" | "valve" | "instrument" | "pump",
  "specifications": {
    "diameter": number (in mm, convert from inches if needed),
    "secondaryDiameter": number (for reducers),
    "length": number (in meters),
    "schedule": string ("Sch 10", "Sch 40", "Sch 80", etc.),
    "material": string ("Carbon Steel", "Stainless Steel", etc.),
    "materialGrade": string ("API 5L Grade B", "ASTM A106 Grade B", "ASTM A312 TP316", etc.),
    "angle": number (for bends, in degrees: 15, 30, 45, 60, 90),
    "flangeConfig": "none" | "one_end" | "both_ends" | "puddle" | "blind",
    "flangeRating": string ("PN16", "PN25", "Class 150", "Class 300", etc.),
    "quantity": number,
    "description": string (original user description)
  },
  "confidence": number (0.0-1.0),
  "explanation": string (brief explanation of what was understood)
}

## Parsing Rules

1. **Nominal Bore (NB) / Diameter**:
   - "200NB" → diameter: 200
   - "8 inch" or "8\"" → diameter: 200 (convert to mm: 8" × 25.4 ≈ 200mm)
   - "300mm" → diameter: 300

2. **Item Types**:
   - "pipe", "straight pipe" → itemType: "pipe"
   - "bend", "elbow", "90 degree elbow" → itemType: "bend"
   - "reducer", "concentric reducer", "eccentric reducer" → itemType: "reducer"
   - "tee", "equal tee", "reducing tee" → itemType: "tee"
   - "flange" → itemType: "flange"

3. **Schedules**:
   - "schedule 40", "sch 40", "sch40" → schedule: "Sch 40"
   - "schedule 80", "sch 80" → schedule: "Sch 80"

4. **Materials**:
   - "carbon steel", "CS", "A106" → material: "Carbon Steel", materialGrade: "ASTM A106 Grade B"
   - "stainless steel", "SS", "316", "316L" → material: "Stainless Steel", materialGrade: "ASTM A312 TP316L"
   - "API 5L Grade B" → materialGrade: "API 5L Grade B"

5. **Flange Configuration**:
   - "flanged both ends", "flanges both ends", "BE" → flangeConfig: "both_ends"
   - "flanged one end", "one end flanged" → flangeConfig: "one_end"
   - "plain ends", "PE", "no flanges" → flangeConfig: "none"

6. **Angles** (for bends):
   - "45 degrees", "45°", "45 deg" → angle: 45
   - "90 degree elbow" → angle: 90

7. **Quantities**:
   - "5 of", "5x", "qty 5" → quantity: 5
   - Default to 1 if not specified

8. **Context Awareness**:
   - If user says "add another", "add more", "same as before", reference recent items
   - If user says "change item 3" or "update the last one", action: "update_item"
   - If user says "delete item 5", action: "delete_item"

9. **Confidence Scoring**:
   - High confidence (0.8-1.0): All key fields extracted, clear and specific
   - Medium confidence (0.5-0.7): Most fields extracted, some ambiguity
   - Low confidence (0.0-0.4): Very ambiguous or incomplete

## Examples

User: "Add a 200NB bend at 45 degrees with flanges both ends"
{
  "action": "create_item",
  "itemType": "bend",
  "specifications": {
    "diameter": 200,
    "angle": 45,
    "flangeConfig": "both_ends",
    "quantity": 1
  },
  "confidence": 0.9,
  "explanation": "Creating a 200NB bend at 45° with flanges on both ends"
}

User: "I need 12 straight pipes, 200NB, schedule 40, A106 Grade B, 6 metres each"
{
  "action": "create_item",
  "itemType": "pipe",
  "specifications": {
    "diameter": 200,
    "length": 6,
    "schedule": "Sch 40",
    "material": "Carbon Steel",
    "materialGrade": "ASTM A106 Grade B",
    "quantity": 12
  },
  "confidence": 1.0,
  "explanation": "Creating 12x 200NB straight pipes, Sch 40, A106 Grade B, 6m each"
}

User: "Add a reducer from 300NB to 200NB"
{
  "action": "create_item",
  "itemType": "reducer",
  "specifications": {
    "diameter": 300,
    "secondaryDiameter": 200,
    "quantity": 1
  },
  "confidence": 0.9,
  "explanation": "Creating a reducer from 300NB to 200NB"
}

User: "What validation issues do I have?"
{
  "action": "question",
  "confidence": 1.0,
  "explanation": "User is asking about validation issues, not creating items"
}

User: "Add 4 more of those but at 300NB"
{
  "action": "create_item",
  "itemType": null,
  "specifications": {
    "diameter": 300,
    "quantity": 4
  },
  "confidence": 0.6,
  "explanation": "User wants to duplicate previous item with 300NB diameter (context required)"
}
`;

    if (context?.currentItems && context.currentItems.length > 0) {
      prompt += `\n\n## Current RFQ Context\n\nThe user is working on an RFQ with ${context.currentItems.length} items. The most recent item is:\n`;
      const lastItem = context.currentItems[context.currentItems.length - 1];
      prompt += `- ${lastItem.description || `${lastItem.diameter}NB ${lastItem.itemType}`}\n`;
    }

    return prompt;
  }

  private unknownIntent(message: string): ParsedItemIntent {
    return {
      action: 'unknown',
      confidence: 0.0,
      explanation: `Could not parse: "${message}"`,
    };
  }
}
