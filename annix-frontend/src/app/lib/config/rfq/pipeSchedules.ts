export const FALLBACK_PIPE_SCHEDULES: Record<
  number,
  Array<{ id: number; scheduleDesignation: string; wallThicknessMm: number }>
> = {
  15: [
    { id: 151, scheduleDesignation: "Sch 40/STD", wallThicknessMm: 2.77 },
    { id: 152, scheduleDesignation: "Sch 80/XS", wallThicknessMm: 3.73 },
    { id: 153, scheduleDesignation: "Sch 160", wallThicknessMm: 4.78 },
    { id: 154, scheduleDesignation: "XXS", wallThicknessMm: 7.47 },
  ],
  20: [
    { id: 201, scheduleDesignation: "Sch 40/STD", wallThicknessMm: 2.87 },
    { id: 202, scheduleDesignation: "Sch 80/XS", wallThicknessMm: 3.91 },
    { id: 203, scheduleDesignation: "Sch 160", wallThicknessMm: 5.56 },
    { id: 204, scheduleDesignation: "XXS", wallThicknessMm: 7.82 },
  ],
  25: [
    { id: 251, scheduleDesignation: "Sch 40/STD", wallThicknessMm: 3.38 },
    { id: 252, scheduleDesignation: "Sch 80/XS", wallThicknessMm: 4.55 },
    { id: 253, scheduleDesignation: "Sch 160", wallThicknessMm: 6.35 },
    { id: 254, scheduleDesignation: "XXS", wallThicknessMm: 9.09 },
  ],
  32: [
    { id: 321, scheduleDesignation: "Sch 40/STD", wallThicknessMm: 3.56 },
    { id: 322, scheduleDesignation: "Sch 80/XS", wallThicknessMm: 4.85 },
    { id: 323, scheduleDesignation: "Sch 160", wallThicknessMm: 6.35 },
    { id: 324, scheduleDesignation: "XXS", wallThicknessMm: 9.7 },
  ],
  40: [
    { id: 401, scheduleDesignation: "Sch 40/STD", wallThicknessMm: 3.68 },
    { id: 402, scheduleDesignation: "Sch 80/XS", wallThicknessMm: 5.08 },
    { id: 403, scheduleDesignation: "Sch 160", wallThicknessMm: 7.14 },
    { id: 404, scheduleDesignation: "XXS", wallThicknessMm: 10.15 },
  ],
  50: [
    { id: 501, scheduleDesignation: "Sch 40/STD", wallThicknessMm: 3.91 },
    { id: 502, scheduleDesignation: "Sch 80/XS", wallThicknessMm: 5.54 },
    { id: 503, scheduleDesignation: "Sch 160", wallThicknessMm: 8.74 },
    { id: 504, scheduleDesignation: "XXS", wallThicknessMm: 11.07 },
  ],
  65: [
    { id: 651, scheduleDesignation: "Sch 40/STD", wallThicknessMm: 5.16 },
    { id: 652, scheduleDesignation: "Sch 80/XS", wallThicknessMm: 7.01 },
    { id: 653, scheduleDesignation: "Sch 160", wallThicknessMm: 9.53 },
    { id: 654, scheduleDesignation: "XXS", wallThicknessMm: 14.02 },
  ],
  80: [
    { id: 801, scheduleDesignation: "Sch 40/STD", wallThicknessMm: 5.49 },
    { id: 802, scheduleDesignation: "Sch 80/XS", wallThicknessMm: 7.62 },
    { id: 803, scheduleDesignation: "Sch 160", wallThicknessMm: 11.13 },
    { id: 804, scheduleDesignation: "XXS", wallThicknessMm: 15.24 },
  ],
  100: [
    { id: 1001, scheduleDesignation: "Sch 40/STD", wallThicknessMm: 6.02 },
    { id: 1002, scheduleDesignation: "Sch 80/XS", wallThicknessMm: 8.56 },
    { id: 1003, scheduleDesignation: "Sch 120", wallThicknessMm: 11.13 },
    { id: 1004, scheduleDesignation: "Sch 160", wallThicknessMm: 13.49 },
    { id: 1005, scheduleDesignation: "XXS", wallThicknessMm: 17.12 },
  ],
  125: [
    { id: 1251, scheduleDesignation: "Sch 40/STD", wallThicknessMm: 6.55 },
    { id: 1252, scheduleDesignation: "Sch 80/XS", wallThicknessMm: 9.52 },
    { id: 1253, scheduleDesignation: "Sch 120", wallThicknessMm: 12.7 },
    { id: 1254, scheduleDesignation: "Sch 160", wallThicknessMm: 15.88 },
    { id: 1255, scheduleDesignation: "XXS", wallThicknessMm: 19.05 },
  ],
  150: [
    { id: 1501, scheduleDesignation: "Sch 40/STD", wallThicknessMm: 7.11 },
    { id: 1502, scheduleDesignation: "Sch 80/XS", wallThicknessMm: 10.97 },
    { id: 1503, scheduleDesignation: "Sch 120", wallThicknessMm: 14.27 },
    { id: 1504, scheduleDesignation: "Sch 160", wallThicknessMm: 18.26 },
    { id: 1505, scheduleDesignation: "XXS", wallThicknessMm: 21.95 },
  ],
  200: [
    { id: 2001, scheduleDesignation: "Sch 20", wallThicknessMm: 6.35 },
    { id: 2002, scheduleDesignation: "Sch 30", wallThicknessMm: 7.04 },
    { id: 2003, scheduleDesignation: "Sch 40/STD", wallThicknessMm: 8.18 },
    { id: 2004, scheduleDesignation: "Sch 60", wallThicknessMm: 10.31 },
    { id: 2005, scheduleDesignation: "Sch 80/XS", wallThicknessMm: 12.7 },
    { id: 2006, scheduleDesignation: "Sch 100", wallThicknessMm: 15.09 },
    { id: 2007, scheduleDesignation: "Sch 120", wallThicknessMm: 18.26 },
    { id: 2008, scheduleDesignation: "Sch 140", wallThicknessMm: 20.62 },
    { id: 2009, scheduleDesignation: "XXS", wallThicknessMm: 22.23 },
    { id: 2010, scheduleDesignation: "Sch 160", wallThicknessMm: 23.01 },
  ],
  250: [
    { id: 2501, scheduleDesignation: "Sch 20", wallThicknessMm: 6.35 },
    { id: 2502, scheduleDesignation: "Sch 30", wallThicknessMm: 7.8 },
    { id: 2503, scheduleDesignation: "Sch 40/STD", wallThicknessMm: 9.27 },
    { id: 2504, scheduleDesignation: "Sch 60/XS", wallThicknessMm: 12.7 },
    { id: 2505, scheduleDesignation: "Sch 80", wallThicknessMm: 15.09 },
    { id: 2506, scheduleDesignation: "Sch 100", wallThicknessMm: 18.26 },
    { id: 2507, scheduleDesignation: "Sch 120", wallThicknessMm: 21.44 },
    { id: 2508, scheduleDesignation: "Sch 140/XXS", wallThicknessMm: 25.4 },
    { id: 2509, scheduleDesignation: "Sch 160", wallThicknessMm: 28.58 },
  ],
  300: [
    { id: 3001, scheduleDesignation: "Sch 20", wallThicknessMm: 6.35 },
    { id: 3002, scheduleDesignation: "Sch 30", wallThicknessMm: 8.38 },
    { id: 3003, scheduleDesignation: "STD", wallThicknessMm: 9.52 },
    { id: 3004, scheduleDesignation: "Sch 40", wallThicknessMm: 10.31 },
    { id: 3005, scheduleDesignation: "XS", wallThicknessMm: 12.7 },
    { id: 3006, scheduleDesignation: "Sch 60", wallThicknessMm: 14.27 },
    { id: 3007, scheduleDesignation: "Sch 80", wallThicknessMm: 17.48 },
    { id: 3008, scheduleDesignation: "Sch 100", wallThicknessMm: 21.44 },
    { id: 3009, scheduleDesignation: "Sch 120/XXS", wallThicknessMm: 25.4 },
    { id: 3010, scheduleDesignation: "Sch 140", wallThicknessMm: 28.58 },
    { id: 3011, scheduleDesignation: "Sch 160", wallThicknessMm: 33.32 },
  ],
  350: [
    { id: 3501, scheduleDesignation: "Sch 10", wallThicknessMm: 6.35 },
    { id: 3502, scheduleDesignation: "Sch 20", wallThicknessMm: 7.92 },
    { id: 3503, scheduleDesignation: "Sch 30/STD", wallThicknessMm: 9.52 },
    { id: 3504, scheduleDesignation: "Sch 40", wallThicknessMm: 11.13 },
    { id: 3505, scheduleDesignation: "XS", wallThicknessMm: 12.7 },
    { id: 3506, scheduleDesignation: "Sch 60", wallThicknessMm: 15.09 },
    { id: 3507, scheduleDesignation: "Sch 80", wallThicknessMm: 19.05 },
    { id: 3508, scheduleDesignation: "Sch 100", wallThicknessMm: 23.82 },
    { id: 3509, scheduleDesignation: "Sch 120", wallThicknessMm: 27.79 },
    { id: 3510, scheduleDesignation: "Sch 140", wallThicknessMm: 31.75 },
    { id: 3511, scheduleDesignation: "Sch 160", wallThicknessMm: 35.71 },
  ],
  400: [
    { id: 4001, scheduleDesignation: "Sch 10", wallThicknessMm: 6.35 },
    { id: 4002, scheduleDesignation: "Sch 20", wallThicknessMm: 7.92 },
    { id: 4003, scheduleDesignation: "Sch 30/STD", wallThicknessMm: 9.52 },
    { id: 4004, scheduleDesignation: "Sch 40/XS", wallThicknessMm: 12.7 },
    { id: 4005, scheduleDesignation: "Sch 60", wallThicknessMm: 16.66 },
    { id: 4006, scheduleDesignation: "Sch 80", wallThicknessMm: 21.44 },
    { id: 4007, scheduleDesignation: "Sch 100", wallThicknessMm: 26.19 },
    { id: 4008, scheduleDesignation: "Sch 120", wallThicknessMm: 30.96 },
    { id: 4009, scheduleDesignation: "Sch 140", wallThicknessMm: 36.52 },
    { id: 4010, scheduleDesignation: "Sch 160", wallThicknessMm: 40.49 },
  ],
  450: [
    { id: 4501, scheduleDesignation: "Sch 10", wallThicknessMm: 6.35 },
    { id: 4502, scheduleDesignation: "Sch 20", wallThicknessMm: 7.92 },
    { id: 4503, scheduleDesignation: "STD", wallThicknessMm: 9.52 },
    { id: 4504, scheduleDesignation: "Sch 30", wallThicknessMm: 11.13 },
    { id: 4505, scheduleDesignation: "XS", wallThicknessMm: 12.7 },
    { id: 4506, scheduleDesignation: "Sch 40", wallThicknessMm: 14.27 },
    { id: 4507, scheduleDesignation: "Sch 60", wallThicknessMm: 19.05 },
    { id: 4508, scheduleDesignation: "Sch 80", wallThicknessMm: 23.83 },
    { id: 4509, scheduleDesignation: "Sch 100", wallThicknessMm: 29.36 },
    { id: 4510, scheduleDesignation: "Sch 120", wallThicknessMm: 34.92 },
    { id: 4511, scheduleDesignation: "Sch 140", wallThicknessMm: 39.69 },
    { id: 4512, scheduleDesignation: "Sch 160", wallThicknessMm: 45.24 },
  ],
  500: [
    { id: 5001, scheduleDesignation: "Sch 10", wallThicknessMm: 6.35 },
    { id: 5002, scheduleDesignation: "Sch 20/STD", wallThicknessMm: 9.52 },
    { id: 5003, scheduleDesignation: "Sch 30/XS", wallThicknessMm: 12.7 },
    { id: 5004, scheduleDesignation: "Sch 40", wallThicknessMm: 15.09 },
    { id: 5005, scheduleDesignation: "Sch 60", wallThicknessMm: 20.63 },
    { id: 5006, scheduleDesignation: "Sch 80", wallThicknessMm: 26.19 },
    { id: 5007, scheduleDesignation: "Sch 100", wallThicknessMm: 32.54 },
    { id: 5008, scheduleDesignation: "Sch 120", wallThicknessMm: 38.1 },
    { id: 5009, scheduleDesignation: "Sch 140", wallThicknessMm: 44.45 },
    { id: 5010, scheduleDesignation: "Sch 160", wallThicknessMm: 50.01 },
  ],
  600: [
    { id: 6001, scheduleDesignation: "Sch 10", wallThicknessMm: 6.35 },
    { id: 6002, scheduleDesignation: "Sch 20/STD", wallThicknessMm: 9.52 },
    { id: 6003, scheduleDesignation: "XS", wallThicknessMm: 12.7 },
    { id: 6004, scheduleDesignation: "Sch 30", wallThicknessMm: 14.27 },
    { id: 6005, scheduleDesignation: "Sch 40", wallThicknessMm: 17.48 },
    { id: 6006, scheduleDesignation: "Sch 60", wallThicknessMm: 24.61 },
    { id: 6007, scheduleDesignation: "Sch 80", wallThicknessMm: 30.96 },
    { id: 6008, scheduleDesignation: "Sch 100", wallThicknessMm: 38.89 },
    { id: 6009, scheduleDesignation: "Sch 120", wallThicknessMm: 46.02 },
    { id: 6010, scheduleDesignation: "Sch 140", wallThicknessMm: 52.39 },
    { id: 6011, scheduleDesignation: "Sch 160", wallThicknessMm: 59.34 },
  ],
  700: [
    { id: 7001, scheduleDesignation: "Sch 10", wallThicknessMm: 7.92 },
    { id: 7002, scheduleDesignation: "STD", wallThicknessMm: 9.52 },
    { id: 7003, scheduleDesignation: "XS", wallThicknessMm: 12.7 },
    { id: 7004, scheduleDesignation: "Sch 20", wallThicknessMm: 12.7 },
    { id: 7005, scheduleDesignation: "Sch 30", wallThicknessMm: 15.88 },
    { id: 7006, scheduleDesignation: "Sch 40", wallThicknessMm: 19.05 },
    { id: 7007, scheduleDesignation: "Sch 60", wallThicknessMm: 28.58 },
  ],
  750: [
    { id: 7501, scheduleDesignation: "Sch 10", wallThicknessMm: 7.92 },
    { id: 7502, scheduleDesignation: "STD", wallThicknessMm: 9.52 },
    { id: 7503, scheduleDesignation: "XS", wallThicknessMm: 12.7 },
    { id: 7504, scheduleDesignation: "Sch 20", wallThicknessMm: 12.7 },
    { id: 7505, scheduleDesignation: "Sch 30", wallThicknessMm: 15.88 },
    { id: 7506, scheduleDesignation: "Sch 40", wallThicknessMm: 20.62 },
    { id: 7507, scheduleDesignation: "Sch 60", wallThicknessMm: 31.75 },
  ],
  800: [
    { id: 8001, scheduleDesignation: "Sch 10", wallThicknessMm: 7.92 },
    { id: 8002, scheduleDesignation: "STD", wallThicknessMm: 9.52 },
    { id: 8003, scheduleDesignation: "XS", wallThicknessMm: 12.7 },
    { id: 8004, scheduleDesignation: "Sch 20", wallThicknessMm: 12.7 },
    { id: 8005, scheduleDesignation: "Sch 30", wallThicknessMm: 15.88 },
    { id: 8006, scheduleDesignation: "Sch 40", wallThicknessMm: 22.22 },
    { id: 8007, scheduleDesignation: "Sch 60", wallThicknessMm: 34.92 },
  ],
  900: [
    { id: 9001, scheduleDesignation: "Sch 10", wallThicknessMm: 9.52 },
    { id: 9002, scheduleDesignation: "STD", wallThicknessMm: 9.52 },
    { id: 9003, scheduleDesignation: "XS", wallThicknessMm: 12.7 },
    { id: 9004, scheduleDesignation: "Sch 20", wallThicknessMm: 12.7 },
    { id: 9005, scheduleDesignation: "Sch 30", wallThicknessMm: 15.88 },
    { id: 9006, scheduleDesignation: "Sch 40", wallThicknessMm: 25.4 },
    { id: 9007, scheduleDesignation: "Sch 60", wallThicknessMm: 38.1 },
  ],
  1000: [
    { id: 10001, scheduleDesignation: "Sch 10", wallThicknessMm: 9.52 },
    { id: 10002, scheduleDesignation: "STD", wallThicknessMm: 9.52 },
    { id: 10003, scheduleDesignation: "XS", wallThicknessMm: 12.7 },
    { id: 10004, scheduleDesignation: "Sch 20", wallThicknessMm: 12.7 },
    { id: 10005, scheduleDesignation: "Sch 30", wallThicknessMm: 16.66 },
    { id: 10006, scheduleDesignation: "Sch 40", wallThicknessMm: 26.19 },
    { id: 10007, scheduleDesignation: "Sch 60", wallThicknessMm: 40.49 },
  ],
  1050: [
    { id: 10501, scheduleDesignation: "Sch 10", wallThicknessMm: 9.52 },
    { id: 10502, scheduleDesignation: "STD", wallThicknessMm: 9.52 },
    { id: 10503, scheduleDesignation: "XS", wallThicknessMm: 12.7 },
    { id: 10504, scheduleDesignation: "Sch 20", wallThicknessMm: 12.7 },
    { id: 10505, scheduleDesignation: "Sch 30", wallThicknessMm: 16.66 },
    { id: 10506, scheduleDesignation: "Sch 40", wallThicknessMm: 27.79 },
  ],
  1200: [
    { id: 12001, scheduleDesignation: "Sch 10", wallThicknessMm: 9.52 },
    { id: 12002, scheduleDesignation: "STD", wallThicknessMm: 9.52 },
    { id: 12003, scheduleDesignation: "XS", wallThicknessMm: 12.7 },
    { id: 12004, scheduleDesignation: "Sch 20", wallThicknessMm: 14.27 },
    { id: 12005, scheduleDesignation: "Sch 30", wallThicknessMm: 17.48 },
    { id: 12006, scheduleDesignation: "Sch 40", wallThicknessMm: 31.75 },
  ],
};

// SABS 719 ERW wall thickness options for pipe dimensions (MODULE SCOPE)
// These use "WT" prefix format (Wall Thickness in mm)
export const SABS719_PIPE_SCHEDULES: Record<
  number,
  Array<{ id: number; scheduleDesignation: string; wallThicknessMm: number }>
> = {
  200: [
    { id: 72004, scheduleDesignation: "WT4.5", wallThicknessMm: 4.5 },
    { id: 72006, scheduleDesignation: "WT6", wallThicknessMm: 6 },
    { id: 72008, scheduleDesignation: "WT8", wallThicknessMm: 8 },
    { id: 72010, scheduleDesignation: "WT10", wallThicknessMm: 10 },
    { id: 72012, scheduleDesignation: "WT12", wallThicknessMm: 12 },
  ],
  250: [
    { id: 72504, scheduleDesignation: "WT4.5", wallThicknessMm: 4.5 },
    { id: 72506, scheduleDesignation: "WT6", wallThicknessMm: 6 },
    { id: 72508, scheduleDesignation: "WT8", wallThicknessMm: 8 },
    { id: 72510, scheduleDesignation: "WT10", wallThicknessMm: 10 },
    { id: 72512, scheduleDesignation: "WT12", wallThicknessMm: 12 },
    { id: 72514, scheduleDesignation: "WT14", wallThicknessMm: 14 },
  ],
  300: [
    { id: 73006, scheduleDesignation: "WT6", wallThicknessMm: 6 },
    { id: 73008, scheduleDesignation: "WT8", wallThicknessMm: 8 },
    { id: 73010, scheduleDesignation: "WT10", wallThicknessMm: 10 },
    { id: 73012, scheduleDesignation: "WT12", wallThicknessMm: 12 },
    { id: 73014, scheduleDesignation: "WT14", wallThicknessMm: 14 },
    { id: 73016, scheduleDesignation: "WT16", wallThicknessMm: 16 },
  ],
  350: [
    { id: 73506, scheduleDesignation: "WT6", wallThicknessMm: 6 },
    { id: 73508, scheduleDesignation: "WT8", wallThicknessMm: 8 },
    { id: 73510, scheduleDesignation: "WT10", wallThicknessMm: 10 },
    { id: 73512, scheduleDesignation: "WT12", wallThicknessMm: 12 },
    { id: 73514, scheduleDesignation: "WT14", wallThicknessMm: 14 },
    { id: 73516, scheduleDesignation: "WT16", wallThicknessMm: 16 },
  ],
  400: [
    { id: 74004, scheduleDesignation: "WT4.5", wallThicknessMm: 4.5 },
    { id: 74006, scheduleDesignation: "WT6", wallThicknessMm: 6 },
    { id: 74008, scheduleDesignation: "WT8", wallThicknessMm: 8 },
    { id: 74010, scheduleDesignation: "WT10", wallThicknessMm: 10 },
    { id: 74012, scheduleDesignation: "WT12", wallThicknessMm: 12 },
    { id: 74014, scheduleDesignation: "WT14", wallThicknessMm: 14 },
    { id: 74016, scheduleDesignation: "WT16", wallThicknessMm: 16 },
  ],
  450: [
    { id: 74504, scheduleDesignation: "WT4.5", wallThicknessMm: 4.5 },
    { id: 74506, scheduleDesignation: "WT6", wallThicknessMm: 6 },
    { id: 74508, scheduleDesignation: "WT8", wallThicknessMm: 8 },
    { id: 74510, scheduleDesignation: "WT10", wallThicknessMm: 10 },
    { id: 74512, scheduleDesignation: "WT12", wallThicknessMm: 12 },
    { id: 74514, scheduleDesignation: "WT14", wallThicknessMm: 14 },
    { id: 74516, scheduleDesignation: "WT16", wallThicknessMm: 16 },
    { id: 74520, scheduleDesignation: "WT20", wallThicknessMm: 20 },
  ],
  500: [
    { id: 75006, scheduleDesignation: "WT6", wallThicknessMm: 6 },
    { id: 75008, scheduleDesignation: "WT8", wallThicknessMm: 8 },
    { id: 75010, scheduleDesignation: "WT10", wallThicknessMm: 10 },
    { id: 75012, scheduleDesignation: "WT12", wallThicknessMm: 12 },
    { id: 75014, scheduleDesignation: "WT14", wallThicknessMm: 14 },
    { id: 75016, scheduleDesignation: "WT16", wallThicknessMm: 16 },
    { id: 75020, scheduleDesignation: "WT20", wallThicknessMm: 20 },
  ],
  550: [
    { id: 75506, scheduleDesignation: "WT6", wallThicknessMm: 6 },
    { id: 75508, scheduleDesignation: "WT8", wallThicknessMm: 8 },
    { id: 75510, scheduleDesignation: "WT10", wallThicknessMm: 10 },
    { id: 75512, scheduleDesignation: "WT12", wallThicknessMm: 12 },
    { id: 75514, scheduleDesignation: "WT14", wallThicknessMm: 14 },
    { id: 75516, scheduleDesignation: "WT16", wallThicknessMm: 16 },
    { id: 75520, scheduleDesignation: "WT20", wallThicknessMm: 20 },
    { id: 75522, scheduleDesignation: "WT22", wallThicknessMm: 22 },
  ],
  600: [
    { id: 76006, scheduleDesignation: "WT6", wallThicknessMm: 6 },
    { id: 76008, scheduleDesignation: "WT8", wallThicknessMm: 8 },
    { id: 76010, scheduleDesignation: "WT10", wallThicknessMm: 10 },
    { id: 76012, scheduleDesignation: "WT12", wallThicknessMm: 12 },
    { id: 76014, scheduleDesignation: "WT14", wallThicknessMm: 14 },
    { id: 76016, scheduleDesignation: "WT16", wallThicknessMm: 16 },
    { id: 76020, scheduleDesignation: "WT20", wallThicknessMm: 20 },
    { id: 76022, scheduleDesignation: "WT22", wallThicknessMm: 22 },
  ],
  650: [
    { id: 76506, scheduleDesignation: "WT6", wallThicknessMm: 6 },
    { id: 76508, scheduleDesignation: "WT8", wallThicknessMm: 8 },
    { id: 76510, scheduleDesignation: "WT10", wallThicknessMm: 10 },
    { id: 76512, scheduleDesignation: "WT12", wallThicknessMm: 12 },
    { id: 76514, scheduleDesignation: "WT14", wallThicknessMm: 14 },
    { id: 76516, scheduleDesignation: "WT16", wallThicknessMm: 16 },
    { id: 76520, scheduleDesignation: "WT20", wallThicknessMm: 20 },
    { id: 76522, scheduleDesignation: "WT22", wallThicknessMm: 22 },
  ],
  700: [
    { id: 77006, scheduleDesignation: "WT6", wallThicknessMm: 6 },
    { id: 77008, scheduleDesignation: "WT8", wallThicknessMm: 8 },
    { id: 77010, scheduleDesignation: "WT10", wallThicknessMm: 10 },
    { id: 77012, scheduleDesignation: "WT12", wallThicknessMm: 12 },
    { id: 77014, scheduleDesignation: "WT14", wallThicknessMm: 14 },
    { id: 77016, scheduleDesignation: "WT16", wallThicknessMm: 16 },
    { id: 77020, scheduleDesignation: "WT20", wallThicknessMm: 20 },
    { id: 77022, scheduleDesignation: "WT22", wallThicknessMm: 22 },
  ],
  750: [
    { id: 77506, scheduleDesignation: "WT6", wallThicknessMm: 6 },
    { id: 77508, scheduleDesignation: "WT8", wallThicknessMm: 8 },
    { id: 77510, scheduleDesignation: "WT10", wallThicknessMm: 10 },
    { id: 77512, scheduleDesignation: "WT12", wallThicknessMm: 12 },
    { id: 77514, scheduleDesignation: "WT14", wallThicknessMm: 14 },
    { id: 77516, scheduleDesignation: "WT16", wallThicknessMm: 16 },
    { id: 77520, scheduleDesignation: "WT20", wallThicknessMm: 20 },
    { id: 77522, scheduleDesignation: "WT22", wallThicknessMm: 22 },
  ],
  800: [
    { id: 78006, scheduleDesignation: "WT6", wallThicknessMm: 6 },
    { id: 78008, scheduleDesignation: "WT8", wallThicknessMm: 8 },
    { id: 78010, scheduleDesignation: "WT10", wallThicknessMm: 10 },
    { id: 78012, scheduleDesignation: "WT12", wallThicknessMm: 12 },
    { id: 78014, scheduleDesignation: "WT14", wallThicknessMm: 14 },
    { id: 78016, scheduleDesignation: "WT16", wallThicknessMm: 16 },
    { id: 78020, scheduleDesignation: "WT20", wallThicknessMm: 20 },
    { id: 78022, scheduleDesignation: "WT22", wallThicknessMm: 22 },
  ],
  850: [
    { id: 78506, scheduleDesignation: "WT6", wallThicknessMm: 6 },
    { id: 78508, scheduleDesignation: "WT8", wallThicknessMm: 8 },
    { id: 78510, scheduleDesignation: "WT10", wallThicknessMm: 10 },
    { id: 78512, scheduleDesignation: "WT12", wallThicknessMm: 12 },
    { id: 78514, scheduleDesignation: "WT14", wallThicknessMm: 14 },
    { id: 78516, scheduleDesignation: "WT16", wallThicknessMm: 16 },
    { id: 78520, scheduleDesignation: "WT20", wallThicknessMm: 20 },
    { id: 78522, scheduleDesignation: "WT22", wallThicknessMm: 22 },
  ],
  900: [
    { id: 79008, scheduleDesignation: "WT8", wallThicknessMm: 8 },
    { id: 79010, scheduleDesignation: "WT10", wallThicknessMm: 10 },
    { id: 79012, scheduleDesignation: "WT12", wallThicknessMm: 12 },
    { id: 79014, scheduleDesignation: "WT14", wallThicknessMm: 14 },
    { id: 79016, scheduleDesignation: "WT16", wallThicknessMm: 16 },
    { id: 79020, scheduleDesignation: "WT20", wallThicknessMm: 20 },
    { id: 79022, scheduleDesignation: "WT22", wallThicknessMm: 22 },
  ],
};

// SABS 62 ERW pipe schedules (Medium and Heavy grades, 15-150NB only)
export const SABS62_MEDIUM_SCHEDULES: Record<
  number,
  Array<{ id: number; scheduleDesignation: string; wallThicknessMm: number }>
> = {
  15: [{ id: 62151, scheduleDesignation: "MEDIUM", wallThicknessMm: 2.3 }],
  20: [{ id: 62201, scheduleDesignation: "MEDIUM", wallThicknessMm: 2.3 }],
  25: [{ id: 62251, scheduleDesignation: "MEDIUM", wallThicknessMm: 2.8 }],
  32: [{ id: 62321, scheduleDesignation: "MEDIUM", wallThicknessMm: 2.8 }],
  40: [{ id: 62401, scheduleDesignation: "MEDIUM", wallThicknessMm: 2.8 }],
  50: [{ id: 62501, scheduleDesignation: "MEDIUM", wallThicknessMm: 3.2 }],
  65: [{ id: 62651, scheduleDesignation: "MEDIUM", wallThicknessMm: 3.2 }],
  80: [{ id: 62801, scheduleDesignation: "MEDIUM", wallThicknessMm: 3.5 }],
  100: [{ id: 621001, scheduleDesignation: "MEDIUM", wallThicknessMm: 3.9 }],
  125: [{ id: 621251, scheduleDesignation: "MEDIUM", wallThicknessMm: 4.2 }],
  150: [{ id: 621501, scheduleDesignation: "MEDIUM", wallThicknessMm: 4.2 }],
};

export const SABS62_HEAVY_SCHEDULES: Record<
  number,
  Array<{ id: number; scheduleDesignation: string; wallThicknessMm: number }>
> = {
  15: [{ id: 62152, scheduleDesignation: "HEAVY", wallThicknessMm: 2.8 }],
  20: [{ id: 62202, scheduleDesignation: "HEAVY", wallThicknessMm: 2.8 }],
  25: [{ id: 62252, scheduleDesignation: "HEAVY", wallThicknessMm: 3.5 }],
  32: [{ id: 62322, scheduleDesignation: "HEAVY", wallThicknessMm: 3.5 }],
  40: [{ id: 62402, scheduleDesignation: "HEAVY", wallThicknessMm: 3.5 }],
  50: [{ id: 62502, scheduleDesignation: "HEAVY", wallThicknessMm: 3.9 }],
  65: [{ id: 62652, scheduleDesignation: "HEAVY", wallThicknessMm: 3.9 }],
  80: [{ id: 62802, scheduleDesignation: "HEAVY", wallThicknessMm: 4.2 }],
  100: [{ id: 621002, scheduleDesignation: "HEAVY", wallThicknessMm: 4.7 }],
  125: [{ id: 621252, scheduleDesignation: "HEAVY", wallThicknessMm: 4.7 }],
  150: [{ id: 621502, scheduleDesignation: "HEAVY", wallThicknessMm: 4.7 }],
};

// Fitting nominal bore sizes by standard
export const SABS62_FITTING_SIZES = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150] as const;
export const SABS719_FITTING_SIZES = [
  200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900,
] as const;
export const ALL_FITTING_SIZES = [
  ...SABS62_FITTING_SIZES,
  ...SABS719_FITTING_SIZES,
  1000,
  1050,
  1200,
] as const;

// Fitting class wall thickness (mm) by NB - used for weld thickness calculations
// For ASTM/ASME specs, uses fitting class (STD/XH/XXH) wall thickness
// STD = Standard, XH = Extra Heavy (Schedule 80), XXH = Double Extra Heavy
export const FITTING_CLASS_WALL_THICKNESS: Record<"STD" | "XH" | "XXH", Record<number, number>> = {
  STD: {
    15: 2.77,
    20: 2.87,
    25: 3.38,
    32: 3.56,
    40: 3.68,
    50: 3.91,
    65: 5.16,
    80: 5.49,
    90: 5.74,
    100: 6.02,
    125: 6.55,
    150: 7.11,
    200: 8.18,
    250: 9.27,
    300: 9.53,
    350: 9.53,
    400: 9.53,
    450: 9.53,
    500: 9.53,
    600: 9.53,
    750: 9.53,
    900: 9.53,
    1000: 9.53,
    1050: 9.53,
    1200: 9.53,
  },
  XH: {
    15: 3.73,
    20: 3.91,
    25: 4.55,
    32: 4.85,
    40: 5.08,
    50: 5.54,
    65: 7.01,
    80: 7.62,
    100: 8.56,
    125: 9.53,
    150: 10.97,
    200: 12.7,
    250: 12.7,
    300: 12.7,
    350: 12.7,
    400: 12.7,
    450: 12.7,
    500: 12.7,
    600: 12.7,
    750: 12.7,
    900: 12.7,
    1000: 12.7,
    1050: 12.7,
    1200: 12.7,
  },
  XXH: {
    15: 7.47,
    20: 7.82,
    25: 9.09,
    32: 9.7,
    40: 10.16,
    50: 11.07,
    65: 14.02,
    80: 15.24,
    100: 17.12,
    125: 19.05,
    150: 22.23,
    200: 22.23,
    250: 25.4,
    300: 25.4,
    350: 25.4,
    400: 25.4,
    450: 25.4,
    500: 25.4,
    600: 25.4,
  },
};

// Standard closure length options (mm) for bent pipe closures
export const CLOSURE_LENGTH_OPTIONS = [100, 150, 200, 250] as const;

// ASME B31.3 pressure calculation parameters
export const PRESSURE_CALC_JOINT_EFFICIENCY = 1.0;
export const PRESSURE_CALC_CORROSION_ALLOWANCE = 0;
export const PRESSURE_CALC_SAFETY_FACTOR = 1.2;

// Bend angle limits (degrees)
export const MIN_BEND_DEGREES = 0;
export const MAX_BEND_DEGREES = 180;

// Helper to get fitting class wall thickness with fallback
export const fittingClassWallThickness = (
  fittingClass: "STD" | "XH" | "XXH" | string | null,
  nb: number,
): number | null => {
  const classKey =
    fittingClass === "STD" || fittingClass === "XH" || fittingClass === "XXH" ? fittingClass : null;
  if (!classKey) return null;
  return FITTING_CLASS_WALL_THICKNESS[classKey][nb] || null;
};

// Valid NB ranges for each steel spec type
export const STEEL_SPEC_NB_RANGES: Record<string, number[]> = {
  "SABS 62 ERW Medium": [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
  "SABS 62 ERW Heavy": [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
  "SABS 719 ERW": [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900],
  "ASTM A53 Grade B": [
    15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 750,
    800, 900, 1000, 1050, 1200,
  ],
  "ASTM A106 Grade B": [
    15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 750,
    800, 900, 1000, 1050, 1200,
  ],
};

// Get valid NBs for a given steel spec (by name or ID)
export const getValidNBsForSpec = (steelSpecName?: string, steelSpecId?: number): number[] => {
  if (steelSpecName) {
    return STEEL_SPEC_NB_RANGES[steelSpecName] || Object.keys(FALLBACK_PIPE_SCHEDULES).map(Number);
  }
  if (steelSpecId === 8) {
    return STEEL_SPEC_NB_RANGES["SABS 719 ERW"];
  }
  return Object.keys(FALLBACK_PIPE_SCHEDULES).map(Number);
};

// Helper to detect if a steel spec is SABS/SANS 62
export const isSabs62Spec = (steelSpecName?: string, steelSpecId?: number): boolean => {
  if (steelSpecName) {
    return steelSpecName.includes("SABS 62") || steelSpecName.includes("SANS 62");
  }
  return steelSpecId === 7;
};

// Helper to detect if a steel spec is SABS/SANS 719
export const isSabs719Spec = (steelSpecName?: string, steelSpecId?: number): boolean => {
  if (steelSpecName) {
    return steelSpecName.includes("SABS 719") || steelSpecName.includes("SANS 719");
  }
  return steelSpecId === 8;
};

// Helper to detect if SABS62 is Heavy grade
export const isSabs62Heavy = (steelSpecName?: string): boolean => {
  return steelSpecName?.includes("Heavy") ?? false;
};

// Helper function to get appropriate schedule list based on steel spec (MODULE SCOPE)
export const getScheduleListForSpec = (
  nominalDiameter: number,
  steelSpecId: number | undefined,
  steelSpecName?: string,
): Array<{ id: number; scheduleDesignation: string; wallThicknessMm: number }> => {
  // Check for SABS 62 (Medium/Heavy)
  if (isSabs62Spec(steelSpecName, steelSpecId)) {
    if (isSabs62Heavy(steelSpecName)) {
      return SABS62_HEAVY_SCHEDULES[nominalDiameter] || [];
    }
    // Default to Medium for SABS 62 when not specified
    return SABS62_MEDIUM_SCHEDULES[nominalDiameter] || [];
  }

  // Check for SABS 719
  if (isSabs719Spec(steelSpecName, steelSpecId)) {
    return SABS719_PIPE_SCHEDULES[nominalDiameter] || [];
  }

  // Default to ASTM schedules
  return FALLBACK_PIPE_SCHEDULES[nominalDiameter] || [];
};

export const STEEL_SPEC_NB_FALLBACK: Record<string, number[]> = {
  "SABS 62": [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
  "SANS 62": [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
  "SABS 719": [200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
  "SANS 719": [200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
  "ASTM A106": [
    15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
  ],
  "ASTM A53": [
    15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
  ],
  "API 5L": [
    15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 750,
    800, 900, 1000, 1050, 1200,
  ],
  "ASTM A333": [
    15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
  ],
  "ASTM A179": [15, 20, 25, 32, 40, 50, 65, 80],
  "ASTM A192": [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
  "ASTM A209": [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300],
  "ASTM A210": [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
  "ASTM A213": [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150],
  "ASTM A312": [
    15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
  ],
  "ASTM A335": [
    15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
  ],
  "ASTM A358": [200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200],
  "ASTM A790": [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400],
  "EN 10216": [
    15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600,
  ],
  "EN 10217": [
    15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800,
    900, 1000,
  ],
};

export interface WallThicknessDisplayInfo {
  hasScheduleSelector: boolean;
  displayText: string;
  wallThicknessMm: number | null;
  scheduleDesignation: string | null;
  standardLabel: string;
}

export const wallThicknessDisplayInfo = (
  nominalDiameter: number,
  steelSpecId: number | undefined,
  steelSpecName: string | undefined,
  selectedSchedule?: string,
): WallThicknessDisplayInfo => {
  const schedules = getScheduleListForSpec(nominalDiameter, steelSpecId, steelSpecName);
  const isHeavy = isSabs62Heavy(steelSpecName);

  // SABS 62: No schedule selector - wall thickness is fixed by spec grade (Medium/Heavy)
  if (isSabs62Spec(steelSpecName, steelSpecId)) {
    const schedule = schedules[0];
    if (schedule) {
      return {
        hasScheduleSelector: false,
        displayText: `${schedule.scheduleDesignation} (${schedule.wallThicknessMm}mm)`,
        wallThicknessMm: schedule.wallThicknessMm,
        scheduleDesignation: schedule.scheduleDesignation,
        standardLabel: isHeavy ? "SABS62 Heavy" : "SABS62 Medium",
      };
    }
    return {
      hasScheduleSelector: false,
      displayText: "N/A",
      wallThicknessMm: null,
      scheduleDesignation: null,
      standardLabel: "SABS62",
    };
  }

  // SABS 719: Schedule selector with WT options
  if (isSabs719Spec(steelSpecName, steelSpecId)) {
    if (selectedSchedule) {
      const schedule = schedules.find((s) => s.scheduleDesignation === selectedSchedule);
      if (schedule) {
        return {
          hasScheduleSelector: true,
          displayText: `${schedule.scheduleDesignation} (${schedule.wallThicknessMm}mm)`,
          wallThicknessMm: schedule.wallThicknessMm,
          scheduleDesignation: schedule.scheduleDesignation,
          standardLabel: "SABS719",
        };
      }
    }
    return {
      hasScheduleSelector: true,
      displayText: schedules.length > 0 ? "Select schedule" : "N/A",
      wallThicknessMm: null,
      scheduleDesignation: null,
      standardLabel: "SABS719",
    };
  }

  // ASTM and other standards: Schedule selector with Sch options
  if (selectedSchedule) {
    const schedule = schedules.find(
      (s) =>
        s.scheduleDesignation === selectedSchedule ||
        s.scheduleDesignation.includes(selectedSchedule),
    );
    if (schedule) {
      return {
        hasScheduleSelector: true,
        displayText: `${schedule.scheduleDesignation} (${schedule.wallThicknessMm}mm)`,
        wallThicknessMm: schedule.wallThicknessMm,
        scheduleDesignation: schedule.scheduleDesignation,
        standardLabel: "ASTM",
      };
    }
  }
  return {
    hasScheduleSelector: true,
    displayText: schedules.length > 0 ? "Select schedule" : "N/A",
    wallThicknessMm: null,
    scheduleDesignation: null,
    standardLabel: "ASTM",
  };
};
