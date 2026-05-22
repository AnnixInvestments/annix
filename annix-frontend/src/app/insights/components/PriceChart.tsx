"use client";

import {
  type CandlestickData,
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
} from "lightweight-charts";
import { useEffect, useRef } from "react";
import { useTheme } from "@/app/components/ThemeProvider";
import type { PriceBar } from "@/app/lib/api/insightsApi";

interface PriceChartProps {
  data: PriceBar[];
  height?: number;
}

// lightweight-charts colours are JS config, not CSS classes, so the chart
// can't pick up Tailwind's dark: variants — it has to be told the theme
// explicitly. Candle up/down colours stay the same in both modes (green/red
// read fine on either background); only the chrome (background, text, grid,
// axis borders) swaps.
const CHART_PALETTE = {
  light: {
    background: "#ffffff",
    text: "#475569",
    grid: "#e2e8f0",
    border: "#cbd5e1",
  },
  dark: {
    background: "#111827",
    text: "#9CA3AF",
    grid: "#1f2937",
    border: "#374151",
  },
} as const;

export function PriceChart(props: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { resolvedTheme } = useTheme();

  const propsHeight = props.height;
  const height = propsHeight ?? 360;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const palette = CHART_PALETTE[resolvedTheme];
    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: palette.background },
        textColor: palette.text,
      },
      grid: {
        vertLines: { color: palette.grid },
        horzLines: { color: palette.grid },
      },
      rightPriceScale: { borderColor: palette.border },
      timeScale: {
        borderColor: palette.border,
        timeVisible: false,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: "#FF8A00", style: 3 },
        horzLine: { color: "#FF8A00", style: 3 },
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
  }, [props.data, height, resolvedTheme]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
