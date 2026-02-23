export type B16PressureClass = "150" | "300" | "400" | "600" | "900" | "1500" | "2500";
export type MaterialGroup = "1.1" | "1.2" | "1.3" | "1.4" | "1.5" | "1.7" | "1.9" | "1.10" | "1.13" | "1.14" | "2.1" | "2.2" | "2.3" | "2.4" | "2.5" | "2.6" | "2.7" | "2.8" | "2.9" | "2.10" | "2.11" | "3.1" | "3.2" | "3.3" | "3.4" | "3.5" | "3.6" | "3.7" | "3.8" | "3.10" | "3.12" | "3.14" | "3.16" | "3.17" | "3.18";

export interface PtRatingPoint {
  temperatureC: number;
  pressureBar: number;
}

export interface PtRatingTable {
  materialGroup: MaterialGroup;
  pressureClass: B16PressureClass;
  ratings: PtRatingPoint[];
}

export const B16_PRESSURE_CLASSES: B16PressureClass[] = ["150", "300", "400", "600", "900", "1500", "2500"];

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
    { temperatureC: 350, pressureBar: 8.4 },
    { temperatureC: 400, pressureBar: 6.5 },
    { temperatureC: 425, pressureBar: 5.5 },
    { temperatureC: 450, pressureBar: 4.5 },
    { temperatureC: 475, pressureBar: 3.2 },
    { temperatureC: 500, pressureBar: 1.7 },
    { temperatureC: 538, pressureBar: 0.0 },
  ],
  "300": [
    { temperatureC: -29, pressureBar: 51.1 },
    { temperatureC: 38, pressureBar: 51.1 },
    { temperatureC: 50, pressureBar: 50.1 },
    { temperatureC: 100, pressureBar: 46.6 },
    { temperatureC: 150, pressureBar: 45.1 },
    { temperatureC: 200, pressureBar: 43.8 },
    { temperatureC: 250, pressureBar: 41.9 },
    { temperatureC: 300, pressureBar: 39.3 },
    { temperatureC: 350, pressureBar: 36.0 },
    { temperatureC: 400, pressureBar: 31.5 },
    { temperatureC: 425, pressureBar: 28.6 },
    { temperatureC: 450, pressureBar: 24.5 },
    { temperatureC: 475, pressureBar: 18.5 },
    { temperatureC: 500, pressureBar: 11.3 },
    { temperatureC: 538, pressureBar: 0.0 },
  ],
  "400": [
    { temperatureC: -29, pressureBar: 68.1 },
    { temperatureC: 38, pressureBar: 68.1 },
    { temperatureC: 50, pressureBar: 66.8 },
    { temperatureC: 100, pressureBar: 62.1 },
    { temperatureC: 150, pressureBar: 60.1 },
    { temperatureC: 200, pressureBar: 58.4 },
    { temperatureC: 250, pressureBar: 55.9 },
    { temperatureC: 300, pressureBar: 52.4 },
    { temperatureC: 350, pressureBar: 48.0 },
    { temperatureC: 400, pressureBar: 42.0 },
    { temperatureC: 425, pressureBar: 38.1 },
    { temperatureC: 450, pressureBar: 32.7 },
    { temperatureC: 475, pressureBar: 24.7 },
    { temperatureC: 500, pressureBar: 15.1 },
    { temperatureC: 538, pressureBar: 0.0 },
  ],
  "600": [
    { temperatureC: -29, pressureBar: 102.1 },
    { temperatureC: 38, pressureBar: 102.1 },
    { temperatureC: 50, pressureBar: 100.2 },
    { temperatureC: 100, pressureBar: 93.2 },
    { temperatureC: 150, pressureBar: 90.2 },
    { temperatureC: 200, pressureBar: 87.6 },
    { temperatureC: 250, pressureBar: 83.8 },
    { temperatureC: 300, pressureBar: 78.5 },
    { temperatureC: 350, pressureBar: 72.0 },
    { temperatureC: 400, pressureBar: 62.9 },
    { temperatureC: 425, pressureBar: 57.1 },
    { temperatureC: 450, pressureBar: 49.0 },
    { temperatureC: 475, pressureBar: 37.0 },
    { temperatureC: 500, pressureBar: 22.6 },
    { temperatureC: 538, pressureBar: 0.0 },
  ],
  "900": [
    { temperatureC: -29, pressureBar: 153.2 },
    { temperatureC: 38, pressureBar: 153.2 },
    { temperatureC: 50, pressureBar: 150.3 },
    { temperatureC: 100, pressureBar: 139.8 },
    { temperatureC: 150, pressureBar: 135.2 },
    { temperatureC: 200, pressureBar: 131.4 },
    { temperatureC: 250, pressureBar: 125.7 },
    { temperatureC: 300, pressureBar: 117.8 },
    { temperatureC: 350, pressureBar: 108.0 },
    { temperatureC: 400, pressureBar: 94.4 },
    { temperatureC: 425, pressureBar: 85.7 },
    { temperatureC: 450, pressureBar: 73.5 },
    { temperatureC: 475, pressureBar: 55.5 },
    { temperatureC: 500, pressureBar: 33.9 },
    { temperatureC: 538, pressureBar: 0.0 },
  ],
  "1500": [
    { temperatureC: -29, pressureBar: 255.3 },
    { temperatureC: 38, pressureBar: 255.3 },
    { temperatureC: 50, pressureBar: 250.5 },
    { temperatureC: 100, pressureBar: 233.0 },
    { temperatureC: 150, pressureBar: 225.4 },
    { temperatureC: 200, pressureBar: 219.0 },
    { temperatureC: 250, pressureBar: 209.5 },
    { temperatureC: 300, pressureBar: 196.3 },
    { temperatureC: 350, pressureBar: 180.0 },
    { temperatureC: 400, pressureBar: 157.4 },
    { temperatureC: 425, pressureBar: 142.8 },
    { temperatureC: 450, pressureBar: 122.5 },
    { temperatureC: 475, pressureBar: 92.5 },
    { temperatureC: 500, pressureBar: 56.5 },
    { temperatureC: 538, pressureBar: 0.0 },
  ],
  "2500": [
    { temperatureC: -29, pressureBar: 425.5 },
    { temperatureC: 38, pressureBar: 425.5 },
    { temperatureC: 50, pressureBar: 417.5 },
    { temperatureC: 100, pressureBar: 388.3 },
    { temperatureC: 150, pressureBar: 375.7 },
    { temperatureC: 200, pressureBar: 365.0 },
    { temperatureC: 250, pressureBar: 349.2 },
    { temperatureC: 300, pressureBar: 327.2 },
    { temperatureC: 350, pressureBar: 300.0 },
    { temperatureC: 400, pressureBar: 262.3 },
    { temperatureC: 425, pressureBar: 238.0 },
    { temperatureC: 450, pressureBar: 204.2 },
    { temperatureC: 475, pressureBar: 154.2 },
    { temperatureC: 500, pressureBar: 94.2 },
    { temperatureC: 538, pressureBar: 0.0 },
  ],
};

const GROUP_2_1_RATINGS: Record<B16PressureClass, PtRatingPoint[]> = {
  "150": [
    { temperatureC: -254, pressureBar: 19.6 },
    { temperatureC: -29, pressureBar: 19.6 },
    { temperatureC: 38, pressureBar: 19.6 },
    { temperatureC: 100, pressureBar: 16.5 },
    { temperatureC: 150, pressureBar: 14.9 },
    { temperatureC: 200, pressureBar: 13.6 },
    { temperatureC: 250, pressureBar: 12.7 },
    { temperatureC: 300, pressureBar: 11.9 },
    { temperatureC: 350, pressureBar: 11.4 },
    { temperatureC: 400, pressureBar: 10.9 },
    { temperatureC: 425, pressureBar: 10.7 },
    { temperatureC: 450, pressureBar: 10.5 },
    { temperatureC: 475, pressureBar: 10.3 },
    { temperatureC: 500, pressureBar: 10.0 },
    { temperatureC: 538, pressureBar: 9.5 },
    { temperatureC: 566, pressureBar: 9.1 },
    { temperatureC: 593, pressureBar: 8.7 },
    { temperatureC: 621, pressureBar: 8.2 },
    { temperatureC: 649, pressureBar: 7.7 },
    { temperatureC: 677, pressureBar: 7.2 },
    { temperatureC: 704, pressureBar: 6.6 },
    { temperatureC: 732, pressureBar: 5.8 },
    { temperatureC: 760, pressureBar: 4.8 },
    { temperatureC: 816, pressureBar: 2.4 },
  ],
  "300": [
    { temperatureC: -254, pressureBar: 51.1 },
    { temperatureC: -29, pressureBar: 51.1 },
    { temperatureC: 38, pressureBar: 51.1 },
    { temperatureC: 100, pressureBar: 43.1 },
    { temperatureC: 150, pressureBar: 38.9 },
    { temperatureC: 200, pressureBar: 35.5 },
    { temperatureC: 250, pressureBar: 33.1 },
    { temperatureC: 300, pressureBar: 31.1 },
    { temperatureC: 350, pressureBar: 29.6 },
    { temperatureC: 400, pressureBar: 28.4 },
    { temperatureC: 425, pressureBar: 27.9 },
    { temperatureC: 450, pressureBar: 27.4 },
    { temperatureC: 475, pressureBar: 26.8 },
    { temperatureC: 500, pressureBar: 26.0 },
    { temperatureC: 538, pressureBar: 24.8 },
    { temperatureC: 566, pressureBar: 23.7 },
    { temperatureC: 593, pressureBar: 22.6 },
    { temperatureC: 621, pressureBar: 21.4 },
    { temperatureC: 649, pressureBar: 20.1 },
    { temperatureC: 677, pressureBar: 18.7 },
    { temperatureC: 704, pressureBar: 17.2 },
    { temperatureC: 732, pressureBar: 15.1 },
    { temperatureC: 760, pressureBar: 12.4 },
    { temperatureC: 816, pressureBar: 6.2 },
  ],
  "400": [
    { temperatureC: -254, pressureBar: 68.1 },
    { temperatureC: -29, pressureBar: 68.1 },
    { temperatureC: 38, pressureBar: 68.1 },
    { temperatureC: 100, pressureBar: 57.4 },
    { temperatureC: 150, pressureBar: 51.8 },
    { temperatureC: 200, pressureBar: 47.4 },
    { temperatureC: 250, pressureBar: 44.1 },
    { temperatureC: 300, pressureBar: 41.5 },
    { temperatureC: 350, pressureBar: 39.5 },
    { temperatureC: 400, pressureBar: 37.9 },
    { temperatureC: 425, pressureBar: 37.2 },
    { temperatureC: 450, pressureBar: 36.5 },
    { temperatureC: 475, pressureBar: 35.7 },
    { temperatureC: 500, pressureBar: 34.7 },
    { temperatureC: 538, pressureBar: 33.1 },
    { temperatureC: 566, pressureBar: 31.6 },
    { temperatureC: 593, pressureBar: 30.1 },
    { temperatureC: 621, pressureBar: 28.5 },
    { temperatureC: 649, pressureBar: 26.8 },
    { temperatureC: 677, pressureBar: 25.0 },
    { temperatureC: 704, pressureBar: 23.0 },
    { temperatureC: 732, pressureBar: 20.1 },
    { temperatureC: 760, pressureBar: 16.5 },
    { temperatureC: 816, pressureBar: 8.3 },
  ],
  "600": [
    { temperatureC: -254, pressureBar: 102.1 },
    { temperatureC: -29, pressureBar: 102.1 },
    { temperatureC: 38, pressureBar: 102.1 },
    { temperatureC: 100, pressureBar: 86.1 },
    { temperatureC: 150, pressureBar: 77.7 },
    { temperatureC: 200, pressureBar: 71.1 },
    { temperatureC: 250, pressureBar: 66.2 },
    { temperatureC: 300, pressureBar: 62.2 },
    { temperatureC: 350, pressureBar: 59.3 },
    { temperatureC: 400, pressureBar: 56.9 },
    { temperatureC: 425, pressureBar: 55.8 },
    { temperatureC: 450, pressureBar: 54.7 },
    { temperatureC: 475, pressureBar: 53.6 },
    { temperatureC: 500, pressureBar: 52.0 },
    { temperatureC: 538, pressureBar: 49.6 },
    { temperatureC: 566, pressureBar: 47.4 },
    { temperatureC: 593, pressureBar: 45.2 },
    { temperatureC: 621, pressureBar: 42.8 },
    { temperatureC: 649, pressureBar: 40.2 },
    { temperatureC: 677, pressureBar: 37.5 },
    { temperatureC: 704, pressureBar: 34.5 },
    { temperatureC: 732, pressureBar: 30.2 },
    { temperatureC: 760, pressureBar: 24.8 },
    { temperatureC: 816, pressureBar: 12.4 },
  ],
  "900": [
    { temperatureC: -254, pressureBar: 153.2 },
    { temperatureC: -29, pressureBar: 153.2 },
    { temperatureC: 38, pressureBar: 153.2 },
    { temperatureC: 100, pressureBar: 129.2 },
    { temperatureC: 150, pressureBar: 116.6 },
    { temperatureC: 200, pressureBar: 106.6 },
    { temperatureC: 250, pressureBar: 99.3 },
    { temperatureC: 300, pressureBar: 93.3 },
    { temperatureC: 350, pressureBar: 88.9 },
    { temperatureC: 400, pressureBar: 85.3 },
    { temperatureC: 425, pressureBar: 83.7 },
    { temperatureC: 450, pressureBar: 82.1 },
    { temperatureC: 475, pressureBar: 80.4 },
    { temperatureC: 500, pressureBar: 78.0 },
    { temperatureC: 538, pressureBar: 74.4 },
    { temperatureC: 566, pressureBar: 71.1 },
    { temperatureC: 593, pressureBar: 67.8 },
    { temperatureC: 621, pressureBar: 64.2 },
    { temperatureC: 649, pressureBar: 60.3 },
    { temperatureC: 677, pressureBar: 56.2 },
    { temperatureC: 704, pressureBar: 51.7 },
    { temperatureC: 732, pressureBar: 45.3 },
    { temperatureC: 760, pressureBar: 37.2 },
    { temperatureC: 816, pressureBar: 18.6 },
  ],
  "1500": [
    { temperatureC: -254, pressureBar: 255.3 },
    { temperatureC: -29, pressureBar: 255.3 },
    { temperatureC: 38, pressureBar: 255.3 },
    { temperatureC: 100, pressureBar: 215.3 },
    { temperatureC: 150, pressureBar: 194.3 },
    { temperatureC: 200, pressureBar: 177.7 },
    { temperatureC: 250, pressureBar: 165.5 },
    { temperatureC: 300, pressureBar: 155.6 },
    { temperatureC: 350, pressureBar: 148.2 },
    { temperatureC: 400, pressureBar: 142.2 },
    { temperatureC: 425, pressureBar: 139.5 },
    { temperatureC: 450, pressureBar: 136.8 },
    { temperatureC: 475, pressureBar: 134.0 },
    { temperatureC: 500, pressureBar: 130.0 },
    { temperatureC: 538, pressureBar: 124.0 },
    { temperatureC: 566, pressureBar: 118.5 },
    { temperatureC: 593, pressureBar: 113.0 },
    { temperatureC: 621, pressureBar: 107.0 },
    { temperatureC: 649, pressureBar: 100.5 },
    { temperatureC: 677, pressureBar: 93.7 },
    { temperatureC: 704, pressureBar: 86.2 },
    { temperatureC: 732, pressureBar: 75.5 },
    { temperatureC: 760, pressureBar: 62.0 },
    { temperatureC: 816, pressureBar: 31.0 },
  ],
  "2500": [
    { temperatureC: -254, pressureBar: 425.5 },
    { temperatureC: -29, pressureBar: 425.5 },
    { temperatureC: 38, pressureBar: 425.5 },
    { temperatureC: 100, pressureBar: 358.8 },
    { temperatureC: 150, pressureBar: 323.8 },
    { temperatureC: 200, pressureBar: 296.2 },
    { temperatureC: 250, pressureBar: 275.9 },
    { temperatureC: 300, pressureBar: 259.3 },
    { temperatureC: 350, pressureBar: 247.0 },
    { temperatureC: 400, pressureBar: 237.0 },
    { temperatureC: 425, pressureBar: 232.5 },
    { temperatureC: 450, pressureBar: 228.0 },
    { temperatureC: 475, pressureBar: 223.3 },
    { temperatureC: 500, pressureBar: 216.7 },
    { temperatureC: 538, pressureBar: 206.7 },
    { temperatureC: 566, pressureBar: 197.5 },
    { temperatureC: 593, pressureBar: 188.3 },
    { temperatureC: 621, pressureBar: 178.3 },
    { temperatureC: 649, pressureBar: 167.5 },
    { temperatureC: 677, pressureBar: 156.2 },
    { temperatureC: 704, pressureBar: 143.7 },
    { temperatureC: 732, pressureBar: 125.8 },
    { temperatureC: 760, pressureBar: 103.3 },
    { temperatureC: 816, pressureBar: 51.7 },
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
  "1.7": GROUP_1_1_RATINGS,
  "1.9": GROUP_1_1_RATINGS,
  "1.10": GROUP_1_1_RATINGS,
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

export const temperatureRange = (materialGroup: string, pressureClass: B16PressureClass): { minC: number; maxC: number } | null => {
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
