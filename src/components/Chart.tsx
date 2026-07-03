"use client";

import { calculateWpm } from "@/utils/calculateWPM";
import React, { useEffect, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Label,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { useMutableData } from "@/context/mutableDataProvider";

interface DataPoint {
  index: number;
  wpm: number;
  rawWPM: number;
  errorCount: number | null;
}

const CustomCircle = (props: {
  cx?: number;
  cy?: number;
  fill?: string;
}) => {
  const { cx, cy, fill } = props;
  if (!cx || !cy) return null;
  return (
    <svg
      x={cx - 4}
      y={cy - 4}
      xmlns="http://www.w3.org/2000/svg"
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      stroke={fill || "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.172 2.172l3.656 3.656m0-3.656l-3.656 3.656" />
    </svg>
  );
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background-transparent p-2 rounded-lg shadow-[inset_0_0_0_1px] shadow-border">
        <p className="text-xs">{`${label}`}</p>
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3" style={{ backgroundColor: payload[0].color }} />
          <p className="text-xs">{`${payload[0].name}: ${payload[0].value}`}</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3" style={{ backgroundColor: payload[1].color }} />
          <p className="text-xs">{`${payload[1].name}: ${payload[1].value}`}</p>
        </div>
        {payload.length > 2 && (
          <div className="flex gap-2 items-center">
            <div className="w-3 h-3 bg-destructive" />
            <p className="text-xs">{`${payload[2].name}: ${payload[2].value}`}</p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const Chart = () => {
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const { testProp } = useMutableData();

  useEffect(() => {
    const rawData = testProp.current.secondsCharTyped.map((data, index) => ({
      index: index + 1,
      wpm: calculateWpm(data.correctCharTypedCount / 5, 1000),
      rawWPM: calculateWpm(data.charTypedCount / 5, 1000),
      errorCount: data.errorCharTypedCount > 0 ? data.errorCharTypedCount : null,
    }));

    const alpha = 0.2;
    const smoothedData = rawData.reduce<DataPoint[]>((acc, item, index) => {
      if (index === 0) {
        acc.push(item);
      } else {
        const prev = acc[index - 1];
        acc.push({
          ...item,
          wpm: Math.round(alpha * item.wpm + (1 - alpha) * prev.wpm),
          rawWPM: Math.round(alpha * item.rawWPM + (1 - alpha) * prev.rawWPM),
        });
      }
      return acc;
    }, []);

    setChartData(smoothedData);
  }, [testProp]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        height={250}
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
        <XAxis dataKey="index" />
        <YAxis yAxisId="left-axis">
          <Label value="Words per Minute" angle={-90} dx={-25} />
        </YAxis>
        <YAxis
          yAxisId="right-axis"
          orientation="right"
          domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2)]}
        >
          <Label value="Error" angle={90} dx={25} />
        </YAxis>
        <Tooltip content={<CustomTooltip />} animationDuration={150} />
        <Line
          type="monotone"
          yAxisId="left-axis"
          dataKey="wpm"
          stroke="var(--foreground)"
          name="WPM"
          strokeWidth={2}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          yAxisId="left-axis"
          dataKey="rawWPM"
          stroke="var(--foreground-light)"
          name="Raw WPM"
          strokeWidth={2}
          isAnimationActive={false}
        />
        <Scatter
          yAxisId="right-axis"
          dataKey="errorCount"
          fill="var(--destructive)"
          name="Error Count"
          shape={<CustomCircle />}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default Chart;
