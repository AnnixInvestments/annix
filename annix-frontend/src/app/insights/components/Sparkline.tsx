"use client";

import {
  ColorType,
  createChart,
  type IChartApi,
  LineSeries,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import { nowMillis } from "@/app/lib/datetime";

interface SparklineProps {
  closes: number[];
  width?: number;
  height?: number;
}

export function Sparkline(props: SparklineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const propsWidth = props.width;
  const width = propsWidth ?? 96;
  const propsHeight = props.height;
  const height = propsHeight ?? 28;
  const closes = props.closes;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || closes.length < 2) return;
    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "transparent",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: false },
      handleScroll: false,
      handleScale: false,
      crosshair: {
        vertLine: { visible: false, labelVisible: false },
        horzLine: { visible: false, labelVisible: false },
      },
    });
    chartRef.current = chart;

    const first = closes[0];
    const last = closes[closes.length - 1];
    const color = last >= first ? "#22c55e" : "#ef4444";

    const series = chart.addSeries(LineSeries, {
      color,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const baseTimestamp = Math.floor(nowMillis() / 1000) - closes.length * 86400;
    const formatted = closes.map((value, idx) => ({
      time: (baseTimestamp + idx * 86400) as UTCTimestamp,
      value,
    }));
    series.setData(formatted);
    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [closes, width, height]);

  return <div ref={containerRef} style={{ width, height }} />;
}
