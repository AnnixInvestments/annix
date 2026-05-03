import type { Assignment } from "./assignment";

export const skyInvestigatorFixture: Assignment = {
  title: "Sky Investigator: Can You Prove What Is Above You?",
  subject: "geography",
  topic: "cloud types",
  ageBucket: "12-14",
  duration: "1 week",
  outputType: "Poster",
  difficulty: "standard",
  studentBrief:
    "Investigate cloud types by photographing the sky at different times of day. Record what you observe. Then ask an AI tool to identify the same clouds and compare its answer with your evidence — explain where you agree, where you disagree, and what changed your thinking.",
  learningObjective: "Identify five cloud types and link them to weather patterns.",
  successCriteria: [
    "Three sky photos with date, time, weather, and location",
    "Five cloud types identified with heights and weather links",
    "AI critique table showing agreement and disagreement",
    "Reflection paragraph that names what changed",
  ],
  tasks: [
    {
      step: 1,
      title: "Observe",
      studentInstruction:
        "Take three photos of the sky at different times of day. For each photo record date, time, weather conditions, and location on the worksheet. Sketch what you see if a photo is not possible.",
      requiredEvidence: ["photo", "date", "time", "weather", "location"],
      reasoningPrompt: "Why did you pick these times? What did you expect to see?",
      aiCritique: null,
      reflectionPrompt: "What changed in the sky between your three photos?",
    },
    {
      step: 2,
      title: "Identify five cloud types",
      studentInstruction:
        "Choose five cloud types and record name, approximate height, appearance, and the weather usually linked to each one. Sketch each cloud or attach a picture you took.",
      requiredEvidence: ["names", "heights", "appearance notes", "sketches"],
      reasoningPrompt: "Why do you think this is the correct cloud type for each photo?",
      aiCritique: null,
      reflectionPrompt: "Which cloud was hardest to identify and why?",
    },
    {
      step: 3,
      title: "Critique an AI identification",
      studentInstruction:
        "Ask an AI tool to identify the same five cloud types from your photos and explain how each one forms. Note where AI was right, where it was wrong, and where it was too general for your local sky.",
      requiredEvidence: ["AI prompt used", "AI output", "comparison table"],
      reasoningPrompt: "Where did AI miss local context that you could see in your photos?",
      aiCritique: {
        promptToTry:
          "Identify the cloud types in these photos and explain how each one forms in 2 sentences.",
        documentPromptAndOutput: true,
        compareToEvidence: "Compare AI's identifications to your own observations and notes.",
        noteIssues: "Where did AI hallucinate, oversimplify, or miss local context?",
        improveWithPersonalInput:
          "Rewrite AI's explanation using your specific observations and the local weather.",
      },
      reflectionPrompt: "What did you change in your own answer after seeing AI's response?",
    },
    {
      step: 4,
      title: "Build the final poster",
      studentInstruction:
        "Build a poster combining your observations, the five cloud types, the AI critique, and your reflection. Use your photos and sketches as evidence. Cite where AI helped and where you corrected it.",
      requiredEvidence: ["poster", "evidence appendix", "AI comparison"],
      reasoningPrompt: "How does your poster prove your reasoning to a reader who wasn't there?",
      aiCritique: null,
      reflectionPrompt: "What surprised you most during this project?",
    },
  ],
  aiUseRules: [
    "Do not copy AI answers directly into your poster.",
    "Always compare AI with your own evidence and note where they disagree.",
    "Document every AI prompt you used and the response you received.",
    "Note where AI is helpful and where it is wrong or too general.",
  ],
  evidenceChecklist: [
    "Sky photos with date/time/location",
    "Names and descriptions of 5 cloud types",
    "Sketches or attached pictures",
    "Comparison table of own notes vs AI response",
    "Final poster",
  ],
  finalSubmissionRequirements: [
    "All raw evidence (photos, notes, drafts)",
    "Final polished poster",
    "Short reflection paragraph",
  ],
  rubric: [
    {
      criterion: "Observation",
      excellent: "Detailed real-world observations with rich context.",
      good: "Includes some observations with detail.",
      satisfactory: "Basic observations recorded.",
      needsWork: "Little or no observation; mostly copied.",
    },
    {
      criterion: "Cloud knowledge",
      excellent: "Correctly explains types, heights, and weather links.",
      good: "Mostly correct with minor gaps.",
      satisfactory: "Partly correct.",
      needsWork: "Incorrect or copied.",
    },
    {
      criterion: "Reasoning",
      excellent: "Clearly explains why choices were made and what could be wrong.",
      good: "Some explanation given.",
      satisfactory: "Limited explanation.",
      needsWork: "Little reasoning.",
    },
    {
      criterion: "AI comparison",
      excellent: "Critiques AI thoughtfully and revises own work.",
      good: "Basic comparison.",
      satisfactory: "Notes one or two differences.",
      needsWork: "Copies AI without critique.",
    },
    {
      criterion: "Presentation",
      excellent: "Clear, neat, well organised, and engaging.",
      good: "Understandable and tidy.",
      satisfactory: "Readable.",
      needsWork: "Poorly organised.",
    },
  ],
  teacherNotes: {
    setup:
      "Photo-based fieldwork; remind students to take photos at different times of day and different weather points.",
    setupTime: "10 minutes prep + students gather photos at home",
    materialsNeeded: ["smartphone or camera", "printed worksheet", "poster paper", "coloured pens"],
    commonMisconceptions: [
      "Confusing low-altitude clouds with high-altitude clouds because of lighting.",
      "Assuming fluffy cumulus clouds always mean good weather.",
    ],
    markingGuidance:
      "Focus on evidence and reasoning rather than neatness alone. The AI critique is the most important rubric row.",
    supportOption: "Provide a 3-cloud cheat sheet with simpler categories instead of 5.",
    extensionOption:
      "Ask students to predict the weather for the next 2-3 days from the cloud patterns they observed.",
  },
  parentNote:
    "Your child will photograph the sky at different times this week and use those photos to identify cloud types. They will also compare their work to an AI's answer.",
  studentAiPromptStarters: [
    "Identify the cloud type in this photo and explain how it forms.",
    "What weather is usually linked to cumulus humilis clouds?",
    "Compare cirrus and cirrostratus clouds.",
    "Why are altostratus clouds often a sign of approaching rain?",
    "What questions should I ask to confirm a cloud type from a photo?",
  ],
  partialExemplars: [
    {
      forCriterion: "Reasoning",
      strongElement:
        "I picked cumulus humilis because the cloud was small, puffy, well below 2 km, and the weather was sunny.",
      weakElement: "I picked cumulus because the AI said cumulus.",
    },
    {
      forCriterion: "AI comparison",
      strongElement:
        "AI said all five were cumulus but Photo 3 was clearly stratus — flat and low covering the whole sky. I corrected this in my poster.",
      weakElement: "AI agreed with me so I did not check.",
    },
  ],
  optionalWorkbookPages: [],
};

export const electricalCircuitsFixture: Assignment = {
  title: "Circuit Detective: Build, Break, and Diagnose",
  subject: "science",
  topic: "electrical circuits",
  ageBucket: "14-16",
  duration: "1 week",
  outputType: "Lab worksheet",
  difficulty: "standard",
  studentBrief:
    "Build three small circuits at home or at school using a battery, wires, a bulb or buzzer, and a switch. Record measurements and observations at each stage. Then ask an AI to predict what would happen in each circuit and compare its predictions with your own results.",
  learningObjective:
    "Use Ohm's law and series/parallel rules to predict and measure circuit behaviour.",
  successCriteria: [
    "Three circuits built and photographed",
    "Voltage and current measured at three points each",
    "AI prediction table with comparison",
    "Explanation of any disagreement between AI and the measured result",
  ],
  tasks: [
    {
      step: 1,
      title: "Build a basic series circuit",
      studentInstruction:
        "Build a series circuit with one battery, one bulb, and a switch. Measure voltage across the bulb and current in the loop. Record both measurements with units and uncertainty.",
      requiredEvidence: ["circuit photo", "measurements table", "diagram"],
      reasoningPrompt: "Why does removing one bulb stop the whole loop?",
      aiCritique: null,
      reflectionPrompt: "What did your measurements tell you about how voltage divides?",
    },
    {
      step: 2,
      title: "Build a parallel circuit",
      studentInstruction:
        "Add a second bulb in parallel. Measure the voltage across each bulb and the current in each branch. Compare to the series circuit.",
      requiredEvidence: ["circuit photo", "measurements table"],
      reasoningPrompt: "Why does the voltage stay roughly the same across each branch?",
      aiCritique: null,
      reflectionPrompt: "Where did your measurements differ from the textbook prediction?",
    },
    {
      step: 3,
      title: "Critique an AI prediction",
      studentInstruction:
        "Describe both circuits in text to an AI tool and ask it to predict the voltage and current at each point. Compare AI's predictions to your measurements and note any disagreements.",
      requiredEvidence: ["AI prompt used", "AI output", "comparison table"],
      reasoningPrompt: "Where did AI use idealised values that ignored real-world losses?",
      aiCritique: {
        promptToTry:
          "Predict the voltage across each bulb and the current in each branch for these two circuits, given a 9V battery and 100 ohm resistors.",
        documentPromptAndOutput: true,
        compareToEvidence: "Compare AI's predicted values to your measured values.",
        noteIssues:
          "Where did AI assume ideal components, ignore wire resistance, or use the wrong rule?",
        improveWithPersonalInput:
          "Rewrite AI's prediction using your real measurements and explain why the difference appeared.",
      },
      reflectionPrompt: "What did you change in your understanding after the AI comparison?",
    },
    {
      step: 4,
      title: "Diagnose a fault",
      studentInstruction:
        "Deliberately break one circuit (loose wire, dead battery, swapped lead). Measure what happens, photograph the broken state, and explain how a real engineer would diagnose the fault from the measurements alone.",
      requiredEvidence: ["fault photo", "measurements before and after", "diagnosis statement"],
      reasoningPrompt: "How would the same measurements look if the battery were the fault?",
      aiCritique: null,
      reflectionPrompt: "What single measurement told you the most?",
    },
  ],
  aiUseRules: [
    "Always measure first, then ask AI.",
    "Document the AI prompt and the full AI output.",
    "Treat AI as one possible answer, not the ground truth.",
    "Explain every disagreement between AI and your measurements.",
  ],
  evidenceChecklist: [
    "Photos of each circuit",
    "Voltage and current measurements with units",
    "AI prompt used and AI output",
    "Comparison table of AI predictions vs measurements",
    "Diagnosis statement for the broken circuit",
  ],
  finalSubmissionRequirements: [
    "Lab worksheet with all measurements",
    "AI comparison table",
    "Diagnosis paragraph",
    "Reflection on what changed",
  ],
  rubric: [
    {
      criterion: "Measurement quality",
      excellent: "All measurements with units and clear uncertainty.",
      good: "Most measurements correct, minor gaps.",
      satisfactory: "Some measurements present.",
      needsWork: "Few or no measurements.",
    },
    {
      criterion: "Circuit reasoning",
      excellent: "Correctly applies Ohm's law and series/parallel rules.",
      good: "Mostly correct with minor errors.",
      satisfactory: "Partial application.",
      needsWork: "Incorrect or missing.",
    },
    {
      criterion: "AI critique",
      excellent: "Names the specific AI assumption that broke and why.",
      good: "Notes the disagreement and explains it.",
      satisfactory: "Notes the disagreement only.",
      needsWork: "Copies AI prediction without checking.",
    },
    {
      criterion: "Diagnosis",
      excellent: "Correctly identifies the fault from measurements alone.",
      good: "Identifies the fault with one measurement clue.",
      satisfactory: "Partial identification.",
      needsWork: "Incorrect or guessed.",
    },
  ],
  teacherNotes: {
    setup:
      "Use 9V batteries and inexpensive 100 ohm resistors. Each student needs a basic multimeter or shared lab access.",
    setupTime: "30 minutes setup + 5 minutes per group safety brief",
    materialsNeeded: [
      "9V battery (per student)",
      "two bulbs or buzzers",
      "switch",
      "100 ohm resistor",
      "multimeter (one per group)",
      "alligator-clip leads",
    ],
    commonMisconceptions: [
      "Believing voltage is 'used up' rather than dropped across components.",
      "Assuming current is the same in every branch of a parallel circuit.",
    ],
    markingGuidance:
      "The AI critique row carries the most weight. A measured-but-unexplained disagreement is worth more than a perfect AI answer copied verbatim.",
    supportOption: "Provide a partly-built circuit and ask students to measure only.",
    extensionOption:
      "Add a second battery and ask students to predict and measure the new currents using superposition.",
  },
  parentNote:
    "Your child will build small battery-powered circuits and measure them with a multimeter, then compare an AI's predictions to what they actually saw.",
  studentAiPromptStarters: [
    "Predict voltage across each bulb in this series circuit.",
    "What current would flow through a 100 ohm resistor with a 9V battery?",
    "Why might my measured current be lower than your predicted current?",
    "Diagnose this circuit fault from these measurements.",
    "What does Ohm's law predict for this parallel branch?",
  ],
  partialExemplars: [
    {
      forCriterion: "AI critique",
      strongElement:
        "AI assumed ideal wires and predicted 0.090 A. I measured 0.082 A. The difference is wire resistance plus battery internal resistance, which AI did not include.",
      weakElement: "AI predicted 0.090 A and I measured 0.082 A. They are different.",
    },
  ],
  optionalWorkbookPages: [],
};

export const FIXTURES: Assignment[] = [skyInvestigatorFixture, electricalCircuitsFixture];
