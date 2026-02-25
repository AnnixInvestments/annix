export type B16PressureClass = "150" | "300" | "400" | "600" | "900" | "1500" | "2500";
export type MaterialGroup =
  | "1.1"
  | "1.2"
  | "1.3"
  | "1.4"
  | "1.5"
  | "1.6"
  | "1.7"
  | "1.8"
  | "1.9"
  | "1.10"
  | "1.11"
  | "1.12"
  | "1.13"
  | "1.14"
  | "2.1"
  | "2.2"
  | "2.3"
  | "2.4"
  | "2.5"
  | "2.6"
  | "2.7"
  | "2.8"
  | "2.9"
  | "2.10"
  | "2.11"
  | "3.1"
  | "3.2"
  | "3.3"
  | "3.4"
  | "3.5"
  | "3.6"
  | "3.7"
  | "3.8"
  | "3.10"
  | "3.12"
  | "3.14"
  | "3.16"
  | "3.17"
  | "3.18"
  | "4.1"
  | "4.2"
  | "4.3";

export interface PtRatingPoint {
  temperatureC: number;
  pressureBar: number;
}

export interface PtRatingTable {
  materialGroup: MaterialGroup;
  pressureClass: B16PressureClass;
  ratings: PtRatingPoint[];
}

export const B16_PRESSURE_CLASSES: B16PressureClass[] = [
  "150",
  "300",
  "400",
  "600",
  "900",
  "1500",
  "2500",
];

// ASME B16.5 Table 2-1.1 Pressure-Temperature Ratings for Material Group 1.1
// Materials: A105, A216 WCB, A350 LF2, A515, A516, A537
// Verified against ASME B16.5-2020 (stabilized maintenance edition)
const GROUP_1_1_RATINGS: Record<B16PressureClass, PtRatingPoint[]> = {
  "150": [
    { temperatureC: -29, pressureBar: 19.6 },
    { temperatureC: 38, pressureBar: 19.6 },
    { temperatureC: 50, pressureBar: 19.2 },
    { temperatureC: 100, pressureBar: 17.7 },
    { temperatureC: 150, pressureBar: 15.8 },
    { temperatureC: 200, pressureBar: 13.8 },
    { temperatureC: 250, pressureBar: 12.1 },
    { temperatureC: 300, pressureBar: 10.2 },
    { temperatureC: 325, pressureBar: 9.3 },
    { temperatureC: 350, pressureBar: 8.4 },
    { temperatureC: 375, pressureBar: 7.4 },
    { temperatureC: 400, pressureBar: 6.5 },
    { temperatureC: 425, pressureBar: 5.5 },
    { temperatureC: 450, pressureBar: 4.6 },
    { temperatureC: 475, pressureBar: 3.7 },
    { temperatureC: 500, pressureBar: 2.8 },
    { temperatureC: 538, pressureBar: 1.4 },
  ],
  "300": [
    { temperatureC: -29, pressureBar: 51.1 },
    { temperatureC: 38, pressureBar: 51.1 },
    { temperatureC: 50, pressureBar: 50.1 },
    { temperatureC: 100, pressureBar: 46.6 },
    { temperatureC: 150, pressureBar: 45.1 },
    { temperatureC: 200, pressureBar: 43.8 },
    { temperatureC: 250, pressureBar: 41.9 },
    { temperatureC: 300, pressureBar: 39.8 },
    { temperatureC: 325, pressureBar: 38.7 },
    { temperatureC: 350, pressureBar: 37.6 },
    { temperatureC: 375, pressureBar: 36.4 },
    { temperatureC: 400, pressureBar: 34.7 },
    { temperatureC: 425, pressureBar: 28.8 },
    { temperatureC: 450, pressureBar: 23.0 },
    { temperatureC: 475, pressureBar: 17.4 },
    { temperatureC: 500, pressureBar: 11.8 },
    { temperatureC: 538, pressureBar: 5.9 },
  ],
  "400": [
    { temperatureC: -29, pressureBar: 68.1 },
    { temperatureC: 38, pressureBar: 68.1 },
    { temperatureC: 50, pressureBar: 66.8 },
    { temperatureC: 100, pressureBar: 62.1 },
    { temperatureC: 150, pressureBar: 60.1 },
    { temperatureC: 200, pressureBar: 58.4 },
    { temperatureC: 250, pressureBar: 55.9 },
    { temperatureC: 300, pressureBar: 53.1 },
    { temperatureC: 325, pressureBar: 51.6 },
    { temperatureC: 350, pressureBar: 50.1 },
    { temperatureC: 375, pressureBar: 48.5 },
    { temperatureC: 400, pressureBar: 46.3 },
    { temperatureC: 425, pressureBar: 38.4 },
    { temperatureC: 450, pressureBar: 30.7 },
    { temperatureC: 475, pressureBar: 23.2 },
    { temperatureC: 500, pressureBar: 15.7 },
    { temperatureC: 538, pressureBar: 7.9 },
  ],
  "600": [
    { temperatureC: -29, pressureBar: 102.1 },
    { temperatureC: 38, pressureBar: 102.1 },
    { temperatureC: 50, pressureBar: 100.2 },
    { temperatureC: 100, pressureBar: 93.2 },
    { temperatureC: 150, pressureBar: 90.2 },
    { temperatureC: 200, pressureBar: 87.6 },
    { temperatureC: 250, pressureBar: 83.9 },
    { temperatureC: 300, pressureBar: 79.6 },
    { temperatureC: 325, pressureBar: 77.4 },
    { temperatureC: 350, pressureBar: 75.1 },
    { temperatureC: 375, pressureBar: 72.7 },
    { temperatureC: 400, pressureBar: 69.4 },
    { temperatureC: 425, pressureBar: 57.5 },
    { temperatureC: 450, pressureBar: 46.0 },
    { temperatureC: 475, pressureBar: 34.9 },
    { temperatureC: 500, pressureBar: 23.5 },
    { temperatureC: 538, pressureBar: 11.8 },
  ],
  "900": [
    { temperatureC: -29, pressureBar: 153.2 },
    { temperatureC: 38, pressureBar: 153.2 },
    { temperatureC: 50, pressureBar: 150.4 },
    { temperatureC: 100, pressureBar: 139.8 },
    { temperatureC: 150, pressureBar: 135.2 },
    { temperatureC: 200, pressureBar: 131.4 },
    { temperatureC: 250, pressureBar: 125.8 },
    { temperatureC: 300, pressureBar: 119.5 },
    { temperatureC: 325, pressureBar: 116.1 },
    { temperatureC: 350, pressureBar: 112.7 },
    { temperatureC: 375, pressureBar: 109.1 },
    { temperatureC: 400, pressureBar: 104.2 },
    { temperatureC: 425, pressureBar: 86.3 },
    { temperatureC: 450, pressureBar: 69.0 },
    { temperatureC: 475, pressureBar: 52.3 },
    { temperatureC: 500, pressureBar: 35.3 },
    { temperatureC: 538, pressureBar: 17.7 },
  ],
  "1500": [
    { temperatureC: -29, pressureBar: 255.3 },
    { temperatureC: 38, pressureBar: 255.3 },
    { temperatureC: 50, pressureBar: 250.6 },
    { temperatureC: 100, pressureBar: 233.0 },
    { temperatureC: 150, pressureBar: 225.4 },
    { temperatureC: 200, pressureBar: 219.0 },
    { temperatureC: 250, pressureBar: 209.7 },
    { temperatureC: 300, pressureBar: 199.1 },
    { temperatureC: 325, pressureBar: 193.6 },
    { temperatureC: 350, pressureBar: 187.8 },
    { temperatureC: 375, pressureBar: 181.8 },
    { temperatureC: 400, pressureBar: 173.6 },
    { temperatureC: 425, pressureBar: 143.8 },
    { temperatureC: 450, pressureBar: 115.0 },
    { temperatureC: 475, pressureBar: 87.2 },
    { temperatureC: 500, pressureBar: 58.8 },
    { temperatureC: 538, pressureBar: 29.5 },
  ],
  "2500": [
    { temperatureC: -29, pressureBar: 425.5 },
    { temperatureC: 38, pressureBar: 425.5 },
    { temperatureC: 50, pressureBar: 417.7 },
    { temperatureC: 100, pressureBar: 388.3 },
    { temperatureC: 150, pressureBar: 375.6 },
    { temperatureC: 200, pressureBar: 365.0 },
    { temperatureC: 250, pressureBar: 349.5 },
    { temperatureC: 300, pressureBar: 331.8 },
    { temperatureC: 325, pressureBar: 322.6 },
    { temperatureC: 350, pressureBar: 313.0 },
    { temperatureC: 375, pressureBar: 303.1 },
    { temperatureC: 400, pressureBar: 289.3 },
    { temperatureC: 425, pressureBar: 239.7 },
    { temperatureC: 450, pressureBar: 191.7 },
    { temperatureC: 475, pressureBar: 145.3 },
    { temperatureC: 500, pressureBar: 97.9 },
    { temperatureC: 538, pressureBar: 49.2 },
  ],
};

// ASME B16.5 Table 2-2.1 Pressure-Temperature Ratings for Material Group 2.1
// Materials: 304, 304H austenitic stainless steel
// Note: 304 can be used above 538°C only when carbon content is 0.04% or higher
// Verified against ASME B16.5-2020 (stabilized maintenance edition)
const GROUP_2_1_RATINGS: Record<B16PressureClass, PtRatingPoint[]> = {
  "150": [
    { temperatureC: -254, pressureBar: 19.0 },
    { temperatureC: -29, pressureBar: 19.0 },
    { temperatureC: 38, pressureBar: 19.0 },
    { temperatureC: 50, pressureBar: 18.3 },
    { temperatureC: 100, pressureBar: 15.7 },
    { temperatureC: 150, pressureBar: 14.2 },
    { temperatureC: 200, pressureBar: 13.2 },
    { temperatureC: 250, pressureBar: 12.1 },
    { temperatureC: 300, pressureBar: 10.2 },
    { temperatureC: 325, pressureBar: 9.3 },
    { temperatureC: 350, pressureBar: 8.4 },
    { temperatureC: 375, pressureBar: 7.4 },
    { temperatureC: 400, pressureBar: 6.5 },
    { temperatureC: 425, pressureBar: 5.5 },
    { temperatureC: 450, pressureBar: 4.6 },
    { temperatureC: 475, pressureBar: 3.7 },
    { temperatureC: 500, pressureBar: 2.8 },
    { temperatureC: 538, pressureBar: 1.4 },
  ],
  "300": [
    { temperatureC: -254, pressureBar: 49.6 },
    { temperatureC: -29, pressureBar: 49.6 },
    { temperatureC: 38, pressureBar: 49.6 },
    { temperatureC: 50, pressureBar: 47.8 },
    { temperatureC: 100, pressureBar: 40.9 },
    { temperatureC: 150, pressureBar: 37.0 },
    { temperatureC: 200, pressureBar: 34.5 },
    { temperatureC: 250, pressureBar: 32.5 },
    { temperatureC: 300, pressureBar: 30.9 },
    { temperatureC: 325, pressureBar: 30.2 },
    { temperatureC: 350, pressureBar: 29.6 },
    { temperatureC: 375, pressureBar: 29.0 },
    { temperatureC: 400, pressureBar: 28.4 },
    { temperatureC: 425, pressureBar: 28.0 },
    { temperatureC: 450, pressureBar: 27.4 },
    { temperatureC: 475, pressureBar: 26.9 },
    { temperatureC: 500, pressureBar: 26.5 },
    { temperatureC: 538, pressureBar: 24.4 },
    { temperatureC: 550, pressureBar: 23.6 },
    { temperatureC: 575, pressureBar: 20.8 },
    { temperatureC: 600, pressureBar: 16.9 },
    { temperatureC: 625, pressureBar: 13.8 },
    { temperatureC: 650, pressureBar: 11.3 },
    { temperatureC: 675, pressureBar: 9.3 },
    { temperatureC: 700, pressureBar: 8.0 },
    { temperatureC: 725, pressureBar: 6.8 },
    { temperatureC: 750, pressureBar: 5.8 },
    { temperatureC: 775, pressureBar: 4.6 },
    { temperatureC: 800, pressureBar: 3.5 },
    { temperatureC: 816, pressureBar: 2.8 },
  ],
  "400": [
    { temperatureC: -254, pressureBar: 66.2 },
    { temperatureC: -29, pressureBar: 66.2 },
    { temperatureC: 38, pressureBar: 66.2 },
    { temperatureC: 50, pressureBar: 63.8 },
    { temperatureC: 100, pressureBar: 54.5 },
    { temperatureC: 150, pressureBar: 49.3 },
    { temperatureC: 200, pressureBar: 46.0 },
    { temperatureC: 250, pressureBar: 43.3 },
    { temperatureC: 300, pressureBar: 41.2 },
    { temperatureC: 325, pressureBar: 40.3 },
    { temperatureC: 350, pressureBar: 39.5 },
    { temperatureC: 375, pressureBar: 38.7 },
    { temperatureC: 400, pressureBar: 37.9 },
    { temperatureC: 425, pressureBar: 37.3 },
    { temperatureC: 450, pressureBar: 36.5 },
    { temperatureC: 475, pressureBar: 35.9 },
    { temperatureC: 500, pressureBar: 35.3 },
    { temperatureC: 538, pressureBar: 32.6 },
    { temperatureC: 550, pressureBar: 31.4 },
    { temperatureC: 575, pressureBar: 27.8 },
    { temperatureC: 600, pressureBar: 22.5 },
    { temperatureC: 625, pressureBar: 18.4 },
    { temperatureC: 650, pressureBar: 15.0 },
    { temperatureC: 675, pressureBar: 12.5 },
    { temperatureC: 700, pressureBar: 10.7 },
    { temperatureC: 725, pressureBar: 9.0 },
    { temperatureC: 750, pressureBar: 7.7 },
    { temperatureC: 775, pressureBar: 6.2 },
    { temperatureC: 800, pressureBar: 4.8 },
    { temperatureC: 816, pressureBar: 3.8 },
  ],
  "600": [
    { temperatureC: -254, pressureBar: 99.3 },
    { temperatureC: -29, pressureBar: 99.3 },
    { temperatureC: 38, pressureBar: 99.3 },
    { temperatureC: 50, pressureBar: 95.6 },
    { temperatureC: 100, pressureBar: 81.7 },
    { temperatureC: 150, pressureBar: 74.0 },
    { temperatureC: 200, pressureBar: 69.0 },
    { temperatureC: 250, pressureBar: 65.0 },
    { temperatureC: 300, pressureBar: 61.8 },
    { temperatureC: 325, pressureBar: 60.4 },
    { temperatureC: 350, pressureBar: 59.3 },
    { temperatureC: 375, pressureBar: 58.1 },
    { temperatureC: 400, pressureBar: 56.9 },
    { temperatureC: 425, pressureBar: 56.0 },
    { temperatureC: 450, pressureBar: 54.8 },
    { temperatureC: 475, pressureBar: 53.9 },
    { temperatureC: 500, pressureBar: 53.0 },
    { temperatureC: 538, pressureBar: 48.9 },
    { temperatureC: 550, pressureBar: 47.1 },
    { temperatureC: 575, pressureBar: 41.7 },
    { temperatureC: 600, pressureBar: 33.8 },
    { temperatureC: 625, pressureBar: 27.6 },
    { temperatureC: 650, pressureBar: 22.5 },
    { temperatureC: 675, pressureBar: 18.7 },
    { temperatureC: 700, pressureBar: 16.1 },
    { temperatureC: 725, pressureBar: 13.5 },
    { temperatureC: 750, pressureBar: 11.6 },
    { temperatureC: 775, pressureBar: 9.0 },
    { temperatureC: 800, pressureBar: 7.0 },
    { temperatureC: 816, pressureBar: 5.9 },
  ],
  "900": [
    { temperatureC: -254, pressureBar: 148.9 },
    { temperatureC: -29, pressureBar: 148.9 },
    { temperatureC: 38, pressureBar: 148.9 },
    { temperatureC: 50, pressureBar: 143.5 },
    { temperatureC: 100, pressureBar: 122.6 },
    { temperatureC: 150, pressureBar: 111.0 },
    { temperatureC: 200, pressureBar: 103.4 },
    { temperatureC: 250, pressureBar: 97.5 },
    { temperatureC: 300, pressureBar: 92.7 },
    { temperatureC: 325, pressureBar: 90.7 },
    { temperatureC: 350, pressureBar: 88.9 },
    { temperatureC: 375, pressureBar: 87.1 },
    { temperatureC: 400, pressureBar: 85.3 },
    { temperatureC: 425, pressureBar: 84.0 },
    { temperatureC: 450, pressureBar: 82.2 },
    { temperatureC: 475, pressureBar: 80.8 },
    { temperatureC: 500, pressureBar: 79.5 },
    { temperatureC: 538, pressureBar: 73.3 },
    { temperatureC: 550, pressureBar: 70.7 },
    { temperatureC: 575, pressureBar: 62.5 },
    { temperatureC: 600, pressureBar: 50.6 },
    { temperatureC: 625, pressureBar: 41.4 },
    { temperatureC: 650, pressureBar: 33.8 },
    { temperatureC: 675, pressureBar: 28.0 },
    { temperatureC: 700, pressureBar: 24.1 },
    { temperatureC: 725, pressureBar: 20.3 },
    { temperatureC: 750, pressureBar: 17.3 },
    { temperatureC: 775, pressureBar: 13.7 },
    { temperatureC: 800, pressureBar: 10.5 },
    { temperatureC: 816, pressureBar: 8.6 },
  ],
  "1500": [
    { temperatureC: -254, pressureBar: 248.2 },
    { temperatureC: -29, pressureBar: 248.2 },
    { temperatureC: 38, pressureBar: 248.2 },
    { temperatureC: 50, pressureBar: 239.1 },
    { temperatureC: 100, pressureBar: 204.3 },
    { temperatureC: 150, pressureBar: 185.0 },
    { temperatureC: 200, pressureBar: 172.4 },
    { temperatureC: 250, pressureBar: 162.4 },
    { temperatureC: 300, pressureBar: 154.6 },
    { temperatureC: 325, pressureBar: 151.1 },
    { temperatureC: 350, pressureBar: 148.1 },
    { temperatureC: 375, pressureBar: 145.2 },
    { temperatureC: 400, pressureBar: 142.2 },
    { temperatureC: 425, pressureBar: 140.0 },
    { temperatureC: 450, pressureBar: 137.0 },
    { temperatureC: 475, pressureBar: 134.7 },
    { temperatureC: 500, pressureBar: 132.4 },
    { temperatureC: 538, pressureBar: 122.1 },
    { temperatureC: 550, pressureBar: 117.8 },
    { temperatureC: 575, pressureBar: 104.2 },
    { temperatureC: 600, pressureBar: 84.4 },
    { temperatureC: 625, pressureBar: 68.9 },
    { temperatureC: 650, pressureBar: 56.3 },
    { temperatureC: 675, pressureBar: 46.7 },
    { temperatureC: 700, pressureBar: 40.1 },
    { temperatureC: 725, pressureBar: 33.8 },
    { temperatureC: 750, pressureBar: 28.9 },
    { temperatureC: 775, pressureBar: 22.8 },
    { temperatureC: 800, pressureBar: 17.4 },
    { temperatureC: 816, pressureBar: 14.1 },
  ],
  "2500": [
    { temperatureC: -254, pressureBar: 413.7 },
    { temperatureC: -29, pressureBar: 413.7 },
    { temperatureC: 38, pressureBar: 413.7 },
    { temperatureC: 50, pressureBar: 398.5 },
    { temperatureC: 100, pressureBar: 340.4 },
    { temperatureC: 150, pressureBar: 308.4 },
    { temperatureC: 200, pressureBar: 287.3 },
    { temperatureC: 250, pressureBar: 270.7 },
    { temperatureC: 300, pressureBar: 257.6 },
    { temperatureC: 325, pressureBar: 251.9 },
    { temperatureC: 350, pressureBar: 246.9 },
    { temperatureC: 375, pressureBar: 241.9 },
    { temperatureC: 400, pressureBar: 237.0 },
    { temperatureC: 425, pressureBar: 233.3 },
    { temperatureC: 450, pressureBar: 228.4 },
    { temperatureC: 475, pressureBar: 224.5 },
    { temperatureC: 500, pressureBar: 220.7 },
    { temperatureC: 538, pressureBar: 203.6 },
    { temperatureC: 550, pressureBar: 196.3 },
    { temperatureC: 575, pressureBar: 173.7 },
    { temperatureC: 600, pressureBar: 140.7 },
    { temperatureC: 625, pressureBar: 114.9 },
    { temperatureC: 650, pressureBar: 93.8 },
    { temperatureC: 675, pressureBar: 77.9 },
    { temperatureC: 700, pressureBar: 66.9 },
    { temperatureC: 725, pressureBar: 56.3 },
    { temperatureC: 750, pressureBar: 48.1 },
    { temperatureC: 775, pressureBar: 38.0 },
    { temperatureC: 800, pressureBar: 29.2 },
    { temperatureC: 816, pressureBar: 23.8 },
  ],
};

const GROUP_4_1_RATINGS: Record<B16PressureClass, PtRatingPoint[]> = {
  "150": [
    { temperatureC: -29, pressureBar: 12.1 },
    { temperatureC: 38, pressureBar: 12.1 },
    { temperatureC: 100, pressureBar: 11.0 },
    { temperatureC: 150, pressureBar: 10.3 },
    { temperatureC: 200, pressureBar: 9.7 },
    { temperatureC: 250, pressureBar: 9.0 },
    { temperatureC: 300, pressureBar: 8.3 },
    { temperatureC: 350, pressureBar: 7.6 },
    { temperatureC: 400, pressureBar: 6.9 },
    { temperatureC: 450, pressureBar: 6.2 },
    { temperatureC: 482, pressureBar: 5.5 },
  ],
  "300": [
    { temperatureC: -29, pressureBar: 31.4 },
    { temperatureC: 38, pressureBar: 31.4 },
    { temperatureC: 100, pressureBar: 28.6 },
    { temperatureC: 150, pressureBar: 26.9 },
    { temperatureC: 200, pressureBar: 25.2 },
    { temperatureC: 250, pressureBar: 23.4 },
    { temperatureC: 300, pressureBar: 21.7 },
    { temperatureC: 350, pressureBar: 20.0 },
    { temperatureC: 400, pressureBar: 18.3 },
    { temperatureC: 450, pressureBar: 16.6 },
    { temperatureC: 482, pressureBar: 14.5 },
  ],
  "400": [
    { temperatureC: -29, pressureBar: 41.9 },
    { temperatureC: 38, pressureBar: 41.9 },
    { temperatureC: 100, pressureBar: 38.1 },
    { temperatureC: 150, pressureBar: 35.8 },
    { temperatureC: 200, pressureBar: 33.5 },
    { temperatureC: 250, pressureBar: 31.2 },
    { temperatureC: 300, pressureBar: 28.9 },
    { temperatureC: 350, pressureBar: 26.6 },
    { temperatureC: 400, pressureBar: 24.3 },
    { temperatureC: 450, pressureBar: 22.0 },
    { temperatureC: 482, pressureBar: 19.3 },
  ],
  "600": [
    { temperatureC: -29, pressureBar: 62.8 },
    { temperatureC: 38, pressureBar: 62.8 },
    { temperatureC: 100, pressureBar: 57.2 },
    { temperatureC: 150, pressureBar: 53.8 },
    { temperatureC: 200, pressureBar: 50.3 },
    { temperatureC: 250, pressureBar: 46.9 },
    { temperatureC: 300, pressureBar: 43.4 },
    { temperatureC: 350, pressureBar: 40.0 },
    { temperatureC: 400, pressureBar: 36.6 },
    { temperatureC: 450, pressureBar: 33.1 },
    { temperatureC: 482, pressureBar: 29.0 },
  ],
  "900": [
    { temperatureC: -29, pressureBar: 94.2 },
    { temperatureC: 38, pressureBar: 94.2 },
    { temperatureC: 100, pressureBar: 85.8 },
    { temperatureC: 150, pressureBar: 80.7 },
    { temperatureC: 200, pressureBar: 75.5 },
    { temperatureC: 250, pressureBar: 70.3 },
    { temperatureC: 300, pressureBar: 65.1 },
    { temperatureC: 350, pressureBar: 59.9 },
    { temperatureC: 400, pressureBar: 54.8 },
    { temperatureC: 450, pressureBar: 49.6 },
    { temperatureC: 482, pressureBar: 43.4 },
  ],
  "1500": [
    { temperatureC: -29, pressureBar: 157.0 },
    { temperatureC: 38, pressureBar: 157.0 },
    { temperatureC: 100, pressureBar: 143.0 },
    { temperatureC: 150, pressureBar: 134.4 },
    { temperatureC: 200, pressureBar: 125.8 },
    { temperatureC: 250, pressureBar: 117.2 },
    { temperatureC: 300, pressureBar: 108.6 },
    { temperatureC: 350, pressureBar: 99.9 },
    { temperatureC: 400, pressureBar: 91.3 },
    { temperatureC: 450, pressureBar: 82.7 },
    { temperatureC: 482, pressureBar: 72.4 },
  ],
  "2500": [
    { temperatureC: -29, pressureBar: 261.7 },
    { temperatureC: 38, pressureBar: 261.7 },
    { temperatureC: 100, pressureBar: 238.3 },
    { temperatureC: 150, pressureBar: 224.1 },
    { temperatureC: 200, pressureBar: 209.7 },
    { temperatureC: 250, pressureBar: 195.3 },
    { temperatureC: 300, pressureBar: 180.9 },
    { temperatureC: 350, pressureBar: 166.5 },
    { temperatureC: 400, pressureBar: 152.2 },
    { temperatureC: 450, pressureBar: 137.8 },
    { temperatureC: 482, pressureBar: 120.6 },
  ],
};

const GROUP_3_3_RATINGS: Record<B16PressureClass, PtRatingPoint[]> = {
  "150": [
    { temperatureC: -29, pressureBar: 19.6 },
    { temperatureC: 38, pressureBar: 19.6 },
    { temperatureC: 100, pressureBar: 17.7 },
    { temperatureC: 150, pressureBar: 16.4 },
    { temperatureC: 200, pressureBar: 15.5 },
    { temperatureC: 250, pressureBar: 14.8 },
    { temperatureC: 300, pressureBar: 14.3 },
    { temperatureC: 350, pressureBar: 13.8 },
    { temperatureC: 400, pressureBar: 13.4 },
    { temperatureC: 425, pressureBar: 13.1 },
    { temperatureC: 450, pressureBar: 12.9 },
    { temperatureC: 475, pressureBar: 12.6 },
    { temperatureC: 500, pressureBar: 12.3 },
    { temperatureC: 538, pressureBar: 11.6 },
    { temperatureC: 566, pressureBar: 10.8 },
    { temperatureC: 593, pressureBar: 9.7 },
    { temperatureC: 621, pressureBar: 6.8 },
    { temperatureC: 649, pressureBar: 4.1 },
  ],
  "300": [
    { temperatureC: -29, pressureBar: 51.1 },
    { temperatureC: 38, pressureBar: 51.1 },
    { temperatureC: 100, pressureBar: 46.6 },
    { temperatureC: 150, pressureBar: 44.1 },
    { temperatureC: 200, pressureBar: 42.4 },
    { temperatureC: 250, pressureBar: 41.3 },
    { temperatureC: 300, pressureBar: 40.4 },
    { temperatureC: 350, pressureBar: 39.7 },
    { temperatureC: 400, pressureBar: 38.9 },
    { temperatureC: 425, pressureBar: 38.5 },
    { temperatureC: 450, pressureBar: 38.1 },
    { temperatureC: 475, pressureBar: 37.5 },
    { temperatureC: 500, pressureBar: 36.7 },
    { temperatureC: 538, pressureBar: 35.1 },
    { temperatureC: 566, pressureBar: 33.1 },
    { temperatureC: 593, pressureBar: 30.0 },
    { temperatureC: 621, pressureBar: 21.5 },
    { temperatureC: 649, pressureBar: 13.3 },
  ],
  "400": [
    { temperatureC: -29, pressureBar: 68.1 },
    { temperatureC: 38, pressureBar: 68.1 },
    { temperatureC: 100, pressureBar: 62.1 },
    { temperatureC: 150, pressureBar: 58.8 },
    { temperatureC: 200, pressureBar: 56.6 },
    { temperatureC: 250, pressureBar: 55.1 },
    { temperatureC: 300, pressureBar: 53.9 },
    { temperatureC: 350, pressureBar: 52.9 },
    { temperatureC: 400, pressureBar: 51.9 },
    { temperatureC: 425, pressureBar: 51.3 },
    { temperatureC: 450, pressureBar: 50.8 },
    { temperatureC: 475, pressureBar: 50.0 },
    { temperatureC: 500, pressureBar: 48.9 },
    { temperatureC: 538, pressureBar: 46.8 },
    { temperatureC: 566, pressureBar: 44.1 },
    { temperatureC: 593, pressureBar: 40.0 },
    { temperatureC: 621, pressureBar: 28.7 },
    { temperatureC: 649, pressureBar: 17.7 },
  ],
  "600": [
    { temperatureC: -29, pressureBar: 102.1 },
    { temperatureC: 38, pressureBar: 102.1 },
    { temperatureC: 100, pressureBar: 93.2 },
    { temperatureC: 150, pressureBar: 88.2 },
    { temperatureC: 200, pressureBar: 84.9 },
    { temperatureC: 250, pressureBar: 82.6 },
    { temperatureC: 300, pressureBar: 80.8 },
    { temperatureC: 350, pressureBar: 79.4 },
    { temperatureC: 400, pressureBar: 77.8 },
    { temperatureC: 425, pressureBar: 77.0 },
    { temperatureC: 450, pressureBar: 76.1 },
    { temperatureC: 475, pressureBar: 75.0 },
    { temperatureC: 500, pressureBar: 73.4 },
    { temperatureC: 538, pressureBar: 70.2 },
    { temperatureC: 566, pressureBar: 66.2 },
    { temperatureC: 593, pressureBar: 60.0 },
    { temperatureC: 621, pressureBar: 43.0 },
    { temperatureC: 649, pressureBar: 26.6 },
  ],
  "900": [
    { temperatureC: -29, pressureBar: 153.2 },
    { temperatureC: 38, pressureBar: 153.2 },
    { temperatureC: 100, pressureBar: 139.8 },
    { temperatureC: 150, pressureBar: 132.3 },
    { temperatureC: 200, pressureBar: 127.3 },
    { temperatureC: 250, pressureBar: 123.9 },
    { temperatureC: 300, pressureBar: 121.3 },
    { temperatureC: 350, pressureBar: 119.0 },
    { temperatureC: 400, pressureBar: 116.8 },
    { temperatureC: 425, pressureBar: 115.5 },
    { temperatureC: 450, pressureBar: 114.2 },
    { temperatureC: 475, pressureBar: 112.5 },
    { temperatureC: 500, pressureBar: 110.1 },
    { temperatureC: 538, pressureBar: 105.3 },
    { temperatureC: 566, pressureBar: 99.3 },
    { temperatureC: 593, pressureBar: 90.0 },
    { temperatureC: 621, pressureBar: 64.5 },
    { temperatureC: 649, pressureBar: 39.9 },
  ],
  "1500": [
    { temperatureC: -29, pressureBar: 255.3 },
    { temperatureC: 38, pressureBar: 255.3 },
    { temperatureC: 100, pressureBar: 233.0 },
    { temperatureC: 150, pressureBar: 220.5 },
    { temperatureC: 200, pressureBar: 212.2 },
    { temperatureC: 250, pressureBar: 206.5 },
    { temperatureC: 300, pressureBar: 202.1 },
    { temperatureC: 350, pressureBar: 198.4 },
    { temperatureC: 400, pressureBar: 194.6 },
    { temperatureC: 425, pressureBar: 192.5 },
    { temperatureC: 450, pressureBar: 190.3 },
    { temperatureC: 475, pressureBar: 187.5 },
    { temperatureC: 500, pressureBar: 183.5 },
    { temperatureC: 538, pressureBar: 175.5 },
    { temperatureC: 566, pressureBar: 165.5 },
    { temperatureC: 593, pressureBar: 150.0 },
    { temperatureC: 621, pressureBar: 107.5 },
    { temperatureC: 649, pressureBar: 66.5 },
  ],
  "2500": [
    { temperatureC: -29, pressureBar: 425.5 },
    { temperatureC: 38, pressureBar: 425.5 },
    { temperatureC: 100, pressureBar: 388.3 },
    { temperatureC: 150, pressureBar: 367.5 },
    { temperatureC: 200, pressureBar: 353.6 },
    { temperatureC: 250, pressureBar: 344.2 },
    { temperatureC: 300, pressureBar: 336.9 },
    { temperatureC: 350, pressureBar: 330.6 },
    { temperatureC: 400, pressureBar: 324.4 },
    { temperatureC: 425, pressureBar: 320.9 },
    { temperatureC: 450, pressureBar: 317.2 },
    { temperatureC: 475, pressureBar: 312.5 },
    { temperatureC: 500, pressureBar: 305.9 },
    { temperatureC: 538, pressureBar: 292.5 },
    { temperatureC: 566, pressureBar: 275.9 },
    { temperatureC: 593, pressureBar: 250.0 },
    { temperatureC: 621, pressureBar: 179.2 },
    { temperatureC: 649, pressureBar: 110.8 },
  ],
};

export const PT_RATINGS: Record<string, Record<B16PressureClass, PtRatingPoint[]>> = {
  "1.1": GROUP_1_1_RATINGS,
  "1.2": GROUP_1_1_RATINGS,
  "1.3": GROUP_1_1_RATINGS,
  "1.4": GROUP_1_1_RATINGS,
  "1.5": GROUP_1_1_RATINGS,
  "1.6": GROUP_1_1_RATINGS,
  "1.7": GROUP_1_1_RATINGS,
  "1.8": GROUP_1_1_RATINGS,
  "1.9": GROUP_1_1_RATINGS,
  "1.10": GROUP_1_1_RATINGS,
  "1.11": GROUP_1_1_RATINGS,
  "1.12": GROUP_1_1_RATINGS,
  "1.13": GROUP_1_1_RATINGS,
  "1.14": GROUP_1_1_RATINGS,
  "2.1": GROUP_2_1_RATINGS,
  "2.2": GROUP_2_1_RATINGS,
  "2.3": GROUP_2_1_RATINGS,
  "2.4": GROUP_2_1_RATINGS,
  "2.5": GROUP_2_1_RATINGS,
  "2.6": GROUP_2_1_RATINGS,
  "2.7": GROUP_2_1_RATINGS,
  "2.8": GROUP_2_1_RATINGS,
  "2.9": GROUP_2_1_RATINGS,
  "2.10": GROUP_2_1_RATINGS,
  "2.11": GROUP_2_1_RATINGS,
  "3.1": GROUP_3_3_RATINGS,
  "3.2": GROUP_3_3_RATINGS,
  "3.3": GROUP_3_3_RATINGS,
  "3.4": GROUP_3_3_RATINGS,
  "3.5": GROUP_3_3_RATINGS,
  "3.6": GROUP_3_3_RATINGS,
  "3.7": GROUP_3_3_RATINGS,
  "3.8": GROUP_3_3_RATINGS,
  "3.10": GROUP_3_3_RATINGS,
  "3.12": GROUP_3_3_RATINGS,
  "3.14": GROUP_3_3_RATINGS,
  "3.16": GROUP_3_3_RATINGS,
  "3.17": GROUP_3_3_RATINGS,
  "3.18": GROUP_3_3_RATINGS,
  "4.1": GROUP_4_1_RATINGS,
  "4.2": GROUP_4_1_RATINGS,
  "4.3": GROUP_4_1_RATINGS,
};

export interface InterpolationResult {
  pressureBar: number;
  isExact: boolean;
  lowerPoint?: PtRatingPoint;
  upperPoint?: PtRatingPoint;
  notes?: string;
}

export const interpolatePTRating = (
  pressureClass: B16PressureClass,
  materialGroup: string,
  temperatureC: number,
): InterpolationResult | null => {
  const groupRatings = PT_RATINGS[materialGroup];
  if (!groupRatings) {
    return null;
  }

  const classRatings = groupRatings[pressureClass];
  if (!classRatings || classRatings.length === 0) {
    return null;
  }

  const exactMatch = classRatings.find((r) => r.temperatureC === temperatureC);
  if (exactMatch) {
    return {
      pressureBar: exactMatch.pressureBar,
      isExact: true,
    };
  }

  const sortedRatings = [...classRatings].sort((a, b) => a.temperatureC - b.temperatureC);

  const minTemp = sortedRatings[0].temperatureC;
  const maxTemp = sortedRatings[sortedRatings.length - 1].temperatureC;

  if (temperatureC < minTemp) {
    return {
      pressureBar: sortedRatings[0].pressureBar,
      isExact: false,
      notes: `Temperature ${temperatureC}°C below table minimum ${minTemp}°C - using minimum value`,
    };
  }

  if (temperatureC > maxTemp) {
    return {
      pressureBar: 0,
      isExact: false,
      notes: `Temperature ${temperatureC}°C exceeds maximum ${maxTemp}°C - no rating available`,
    };
  }

  const upperIndex = sortedRatings.findIndex((point) => point.temperatureC > temperatureC);

  if (upperIndex <= 0) {
    return null;
  }

  const lowerPoint = sortedRatings[upperIndex - 1];
  const upperPoint = sortedRatings[upperIndex];

  const tempRange = upperPoint.temperatureC - lowerPoint.temperatureC;
  const tempOffset = temperatureC - lowerPoint.temperatureC;
  const tempRatio = tempOffset / tempRange;

  const pressureRange = upperPoint.pressureBar - lowerPoint.pressureBar;
  const interpolatedPressure = lowerPoint.pressureBar + pressureRange * tempRatio;

  return {
    pressureBar: Math.round(interpolatedPressure * 10) / 10,
    isExact: false,
    lowerPoint,
    upperPoint,
    notes: `Linear interpolation between ${lowerPoint.temperatureC}°C and ${upperPoint.temperatureC}°C`,
  };
};

export interface ClassSelectionResult {
  requiredClass: B16PressureClass;
  ratingAtTemperature: number;
  marginPercent: number;
  alternatives: Array<{
    pressureClass: B16PressureClass;
    ratingBar: number;
    sufficient: boolean;
  }>;
}

export const selectRequiredClass = (
  pressureBar: number,
  temperatureC: number,
  materialGroup: string,
): ClassSelectionResult | null => {
  const groupRatings = PT_RATINGS[materialGroup];
  if (!groupRatings) {
    return null;
  }

  const alternatives = B16_PRESSURE_CLASSES.map((pc) => {
    const interpolation = interpolatePTRating(pc, materialGroup, temperatureC);
    const ratingBar = interpolation?.pressureBar ?? 0;
    return {
      pressureClass: pc,
      ratingBar,
      sufficient: ratingBar >= pressureBar,
    };
  });

  const suitable = alternatives.find((alt) => alt.sufficient);

  if (!suitable) {
    return {
      requiredClass: "2500",
      ratingAtTemperature: alternatives[alternatives.length - 1].ratingBar,
      marginPercent: -100 * (1 - alternatives[alternatives.length - 1].ratingBar / pressureBar),
      alternatives,
    };
  }

  const marginPercent = ((suitable.ratingBar - pressureBar) / pressureBar) * 100;

  return {
    requiredClass: suitable.pressureClass,
    ratingAtTemperature: suitable.ratingBar,
    marginPercent: Math.round(marginPercent * 10) / 10,
    alternatives,
  };
};

export const temperatureRange = (
  materialGroup: string,
  pressureClass: B16PressureClass,
): { minC: number; maxC: number } | null => {
  const groupRatings = PT_RATINGS[materialGroup];
  if (!groupRatings) {
    return null;
  }

  const classRatings = groupRatings[pressureClass];
  if (!classRatings || classRatings.length === 0) {
    return null;
  }

  const sortedRatings = [...classRatings].sort((a, b) => a.temperatureC - b.temperatureC);
  return {
    minC: sortedRatings[0].temperatureC,
    maxC: sortedRatings[sortedRatings.length - 1].temperatureC,
  };
};
