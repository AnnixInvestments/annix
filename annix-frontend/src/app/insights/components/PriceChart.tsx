"use client";

import {
  type CandlestickData,
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { PriceBar } from "@/app/lib/api/insightsApi";

interface PriceChartProps {
  data: PriceBar[];
  height?: number;
}

export function PriceChart(props: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const propsHeight = props.height;
  const height = propsHeight ?? 360;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#111827" },
        textColor: "#9CA3AF",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      rightPriceScale: { borderColor: "#374151" },
      timeScale: {
        borderColor: "#374151",
        timeVisible: false,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: "#D4AF37", style: 3 },
        horzLine: { color: "#D4AF37", style: 3 },
      },
    });
    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#16a34a",
      borderDownColor: "#dc2626",
      wickUpColor: "#16a34a",
      wickDownColor: "#dc2626",
    });

    const formatted: CandlestickData[] = props.data.map((bar) => ({
      time: bar.date,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    }));
    series.setData(formatted);
    chart.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      if (chartRef.current && container.clientWidth > 0) {
        chartRef.current.applyOptions({ width: container.clientWidth });
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [props.data, height]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
