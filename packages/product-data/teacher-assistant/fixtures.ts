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

export const localWaterReportFixture: Assignment = {
  title: "Map My Water: Local Water Story",
  subject: "geography",
  topic: "local water cycle and supply",
  ageBucket: "14-16",
  duration: "2 weeks",
  outputType: "Report",
  difficulty: "standard",
  studentBrief:
    "Trace where the water in your home comes from and where it goes. Map the local water cycle in your suburb using observations, interviews with adults, and one online utility map. Then compare an AI summary of your local supply against what you actually documented.",
  learningObjective:
    "Describe the local water cycle, supply chain, and risks using observed evidence and primary interviews.",
  successCriteria: [
    "Hand-drawn or annotated map of the local water flow",
    "Three observations of water in your environment with photos",
    "Two short interviews with adults about water use or shortages",
    "AI summary documented and corrected against your evidence",
  ],
  tasks: [
    {
      step: 1,
      title: "Observe and photograph",
      studentInstruction:
        "Take three photos of water in your environment over two days — a tap, a drain or stormwater grid, and a natural water feature near your home or school. Record location, time, and weather for each.",
      requiredEvidence: ["photos", "GPS or address", "time", "weather"],
      reasoningPrompt: "What does each photo tell you about how water moves through your area?",
      aiCritique: null,
      reflectionPrompt: "Which photo surprised you most and why?",
    },
    {
      step: 2,
      title: "Interview two people",
      studentInstruction:
        "Interview two adults about water — one about their household water bill and any shortages they remember, one who works outside or at a school about how water is used at work. Record short notes and quotes.",
      requiredEvidence: ["interview notes", "two named sources", "quotes"],
      reasoningPrompt: "What do the two adults agree or disagree on about water in your area?",
      aiCritique: null,
      reflectionPrompt: "What new local information did the interviews give you that AI did not?",
    },
    {
      step: 3,
      title: "Map the local water cycle",
      studentInstruction:
        "Draw a simple map showing where your water comes from, the route it takes to your home, and where wastewater goes. Use one online utility/municipality map as a reference; cite it.",
      requiredEvidence: ["hand-drawn map", "labels", "cited reference"],
      reasoningPrompt: "Where on your map are the biggest unknowns or assumptions?",
      aiCritique: null,
      reflectionPrompt: "Which part of the map would change in a drought year?",
    },
    {
      step: 4,
      title: "Critique an AI summary",
      studentInstruction:
        "Ask AI to summarise the water supply, treatment, and risks for your suburb in 3 short paragraphs. Compare AI's summary to your evidence and interviews; correct or extend at least three statements.",
      requiredEvidence: ["AI prompt used", "AI output", "annotated corrections"],
      reasoningPrompt: "Where did AI generalise or miss your local context?",
      aiCritique: {
        promptToTry:
          "Summarise the water supply, treatment, and seasonal risks in [my suburb] in three short paragraphs.",
        documentPromptAndOutput: true,
        compareToEvidence: "Compare AI's summary to your map, photos, and interviews.",
        noteIssues: "Where did AI hallucinate, omit, or oversimplify?",
        improveWithPersonalInput:
          "Rewrite each paragraph with one specific local detail from your evidence.",
      },
      reflectionPrompt: "What is one thing AI got right that you would not have known yourself?",
    },
  ],
  aiUseRules: [
    "Use AI only after you have collected your own evidence.",
    "Always document the AI prompt and the full output.",
    "Mark AI-only claims you could not verify with a question mark.",
    "Cite primary sources (interviews, photos) before AI claims.",
  ],
  evidenceChecklist: [
    "Three water photos with metadata",
    "Two interview notes with named sources",
    "Hand-drawn local water map",
    "AI prompt + output + annotated corrections",
  ],
  finalSubmissionRequirements: [
    "Report (4-6 pages)",
    "Photo and map appendix",
    "Interview transcript notes",
    "Reflection paragraph",
  ],
  rubric: [
    {
      criterion: "Local evidence",
      excellent: "Detailed observations with named places and times.",
      good: "Observations with most metadata.",
      satisfactory: "Some observations recorded.",
      needsWork: "Generic or no observations.",
    },
    {
      criterion: "Interviews",
      excellent: "Two distinct sources, useful quotes, integrated into report.",
      good: "Two sources with notes.",
      satisfactory: "One usable interview.",
      needsWork: "No interviews or fabricated.",
    },
    {
      criterion: "Map quality",
      excellent: "Clear, labelled, traceable from source to drain.",
      good: "Most labels, clear route.",
      satisfactory: "Partial map.",
      needsWork: "No map or unclear.",
    },
    {
      criterion: "AI critique",
      excellent: "Three specific corrections with evidence.",
      good: "Two corrections with evidence.",
      satisfactory: "One correction.",
      needsWork: "Copies AI summary.",
    },
  ],
  teacherNotes: {
    setup:
      "Confirm safety boundaries before students photograph drains or visit water features. Provide an interview consent script.",
    setupTime: "20 minutes prep + safety brief in class",
    materialsNeeded: [
      "smartphone or camera",
      "interview consent slip",
      "printed worksheet",
      "coloured pens for the map",
    ],
    commonMisconceptions: [
      "Believing local tap water comes from a single dam.",
      "Assuming stormwater and sewage share one network in suburbs.",
    ],
    markingGuidance:
      "Reward specific local detail and corrected AI claims over textbook-style writing.",
    supportOption: "Provide a simplified map template with placeholders to label.",
    extensionOption: "Compare two adjacent suburbs and explain why their water risks differ.",
  },
  parentNote:
    "Your child will photograph water around the home, interview two adults briefly, and draw a map of the local water cycle.",
  studentAiPromptStarters: [
    "Summarise water supply and treatment for my suburb in three paragraphs.",
    "What seasonal water risks does my suburb face?",
    "Trace stormwater from a typical street to the nearest river.",
    "What questions should I ask an adult about household water?",
  ],
  partialExemplars: [
    {
      forCriterion: "AI critique",
      strongElement:
        "AI said our water comes from one dam, but the municipality map shows two reservoirs feeding our suburb. I corrected this with a citation to the map.",
      weakElement: "AI said our water comes from a dam. I agreed.",
    },
  ],
  optionalWorkbookPages: [],
};

export const reactionRatesLabFixture: Assignment = {
  title: "Reaction Detective: Find the Hidden Variable",
  subject: "science",
  topic: "factors affecting reaction rate",
  ageBucket: "14-16",
  duration: "3 days",
  outputType: "Lab worksheet",
  difficulty: "advanced",
  studentBrief:
    "Run three controlled experiments measuring how a single variable changes the rate of a reaction. Record measurements with uncertainty, identify which variable causes the biggest change, and compare an AI prediction against your real timing data.",
  learningObjective:
    "Identify the dominant factor affecting reaction rate using controlled experiments and uncertainty analysis.",
  successCriteria: [
    "Three controlled trials per variable with timed data",
    "Uncertainty estimate per measurement",
    "Graph of rate vs variable",
    "AI prediction documented and corrected against your data",
  ],
  tasks: [
    {
      step: 1,
      title: "Plan and predict",
      studentInstruction:
        "Choose three variables (concentration, temperature, surface area) and predict in writing how each will change the reaction rate before you start. Justify each prediction with a sentence.",
      requiredEvidence: ["written predictions", "justification per variable"],
      reasoningPrompt: "Which variable do you expect to dominate and why?",
      aiCritique: null,
      reflectionPrompt: "What would change your prediction if it were wrong?",
    },
    {
      step: 2,
      title: "Run the trials",
      studentInstruction:
        "For each variable, run three trials at three different levels (nine trials total). Time each trial with a stopwatch. Record measurements with uncertainty (e.g. 12.4 ± 0.2 s).",
      requiredEvidence: ["trial table", "stopwatch readings", "uncertainty per row"],
      reasoningPrompt: "Where did your timing uncertainty come from?",
      aiCritique: null,
      reflectionPrompt: "Did any trial fail in a way that taught you something?",
    },
    {
      step: 3,
      title: "Graph and analyse",
      studentInstruction:
        "Plot rate (1/time) against each variable. Identify the variable that causes the biggest change in rate; back this up with the gradient or ratio.",
      requiredEvidence: ["three graphs", "calculation of dominant variable"],
      reasoningPrompt: "Why does rate (1/time) make the comparison clearer than time alone?",
      aiCritique: null,
      reflectionPrompt: "Which graph surprised you most?",
    },
    {
      step: 4,
      title: "Critique an AI prediction",
      studentInstruction:
        "Describe your three variables to an AI tool and ask it to predict which one dominates and by how much. Compare its prediction to your measured graphs and explain any disagreement.",
      requiredEvidence: ["AI prompt used", "AI output", "annotated comparison"],
      reasoningPrompt: "Where did AI assume idealised conditions or ignore your apparatus?",
      aiCritique: {
        promptToTry:
          "Predict which of these three variables (concentration, temperature, surface area) most affects reaction rate and by what factor at typical school-lab levels.",
        documentPromptAndOutput: true,
        compareToEvidence: "Compare AI's predicted dominant variable to your measured graphs.",
        noteIssues:
          "Where did AI assume ideal conditions, ignore mixing, or miscalculate the rate ratio?",
        improveWithPersonalInput:
          "Rewrite AI's prediction using your real timing data and uncertainty.",
      },
      reflectionPrompt: "What did your data tell you that AI's prediction missed?",
    },
  ],
  aiUseRules: [
    "Run all trials before asking AI.",
    "Document the AI prompt and full output.",
    "Treat AI as one prediction among many.",
    "Explain every disagreement between AI and your data.",
  ],
  evidenceChecklist: [
    "Trial table with uncertainties",
    "Three rate vs variable graphs",
    "Identification of dominant variable",
    "AI prompt and output with corrections",
  ],
  finalSubmissionRequirements: [
    "Lab worksheet with all data",
    "Graphs",
    "AI critique paragraph",
    "Reflection on what changed",
  ],
  rubric: [
    {
      criterion: "Experimental control",
      excellent: "Only one variable changes per trial; uncertainty quoted.",
      good: "Mostly controlled, minor confounds.",
      satisfactory: "Trials run but control unclear.",
      needsWork: "Variables confounded.",
    },
    {
      criterion: "Data quality",
      excellent: "Clear table, uncertainties, repeats.",
      good: "Most data with uncertainties.",
      satisfactory: "Some data present.",
      needsWork: "Missing or sketchy data.",
    },
    {
      criterion: "Analysis",
      excellent: "Identifies dominant variable with calculation.",
      good: "Identifies dominant variable.",
      satisfactory: "Plots data only.",
      needsWork: "No analysis.",
    },
    {
      criterion: "AI critique",
      excellent: "Names the assumption AI made and why it failed.",
      good: "Notes the disagreement and explains it.",
      satisfactory: "Notes the disagreement only.",
      needsWork: "Copies AI prediction.",
    },
  ],
  teacherNotes: {
    setup:
      "Use sodium thiosulfate + HCl 'disappearing cross' reaction or alka-seltzer + water for safer alternatives. Pre-label all bottles.",
    setupTime: "45 minutes setup + safety brief",
    materialsNeeded: [
      "stopwatch (one per group)",
      "graduated cylinders 10 mL and 50 mL",
      "thermometer",
      "reaction beakers",
      "mortar and pestle (for surface area)",
      "graph paper or graphing tool",
    ],
    commonMisconceptions: [
      "Assuming temperature always doubles rate per 10°C in any reaction.",
      "Confusing concentration and amount.",
    ],
    markingGuidance:
      "Reward students who quote uncertainty and who name a specific assumption AI broke.",
    supportOption:
      "Reduce to two variables (temperature, concentration) with one trial level each.",
    extensionOption: "Add a catalyst trial and ask whether the same dominant variable still wins.",
  },
  parentNote:
    "Your child will run three timed lab experiments and compare the results to an AI's predictions. The reaction we use is safe at school-lab concentrations.",
  studentAiPromptStarters: [
    "Predict which of concentration, temperature, and surface area most affects reaction rate.",
    "By what factor does doubling concentration change the rate of a typical iodine clock reaction?",
    "Why might my measured rate be slower than your prediction?",
    "What assumptions does the rate equation make at school-lab scales?",
  ],
  partialExemplars: [
    {
      forCriterion: "AI critique",
      strongElement:
        "AI predicted temperature doubled the rate per 10°C. My data showed only a 1.6× rise per 10°C — AI used the simplified Arrhenius rule of thumb, ignoring our reaction's specific activation energy.",
      weakElement: "AI predicted temperature was strongest. My data agreed roughly.",
    },
  ],
  optionalWorkbookPages: [],
};

export const FIXTURES: Assignment[] = [
  skyInvestigatorFixture,
  electricalCircuitsFixture,
  localWaterReportFixture,
  reactionRatesLabFixture,
];
