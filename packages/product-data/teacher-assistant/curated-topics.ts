import type { Subject } from "./enums";

export const CUSTOM_TOPIC_VALUE = "__custom__";

export const CURATED_TOPICS: Record<Subject, string[]> = {
  geography: [
    "Cloud types and weather patterns",
    "The local water cycle",
    "Volcanoes and tectonic plates",
    "Rivers, valleys, and erosion",
    "Climate zones around the world",
    "Coastal erosion and management",
    "Mapping your school grounds",
    "Urban heat islands in your city",
    "Population density in your area",
    "Renewable energy in your community",
    "Drought and water security",
    "Migration patterns in southern Africa",
    "Local food supply chains",
    "Tourism and local economies",
  ],
  science: [
    "Electrical circuits (series and parallel)",
    "States of matter and changes of state",
    "Forces and motion",
    "Photosynthesis and plant growth",
    "Cells and microscopes",
    "Acids, bases, and pH",
    "Reaction rates and what affects them",
    "Sound waves and how we hear",
    "Magnetism and electromagnets",
    "The solar system",
    "Energy transfers and efficiency",
    "Simple machines (levers, pulleys, gears)",
    "Ecology and food webs",
    "Genetics and inheritance basics",
  ],
};

export function isCuratedTopic(subject: Subject, topic: string): boolean {
  return CURATED_TOPICS[subject]?.includes(topic) ?? false;
}
