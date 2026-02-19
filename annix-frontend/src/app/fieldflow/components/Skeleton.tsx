"use client";

import { type ReactNode } from "react";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded ${className}`}
      style={style}
    />
  );
}

export function SkeletonText({
  lines = 1,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <SkeletonText lines={2} />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-8 w-20 rounded" />
        <Skeleton className="h-8 w-20 rounded" />
      </div>
    </div>
  );
}

export function SkeletonStatCard({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 ${className}`}
    >
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = "",
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden ${className}`}
    >
      <div className="border-b border-gray-200 dark:border-slate-700 p-4">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-slate-700">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="flex gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-4 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 ${className}`}
    >
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="flex items-end gap-2 h-40">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${Math.random() * 80 + 20}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({
  items = 5,
  className = "",
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function ProspectListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} className="flex-1 min-w-[120px]" />
        ))}
      </div>
      <div className="flex gap-4 items-center">
        <Skeleton className="h-10 flex-1 max-w-md rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <SkeletonList items={5} />
    </div>
  );
}

export function MeetingListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center">
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-10 flex-1 max-w-md rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex gap-4 mt-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <SkeletonTable rows={5} columns={5} />
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="grid grid-cols-8 border-b border-gray-200 dark:border-slate-700">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="p-3 border-r border-gray-200 dark:border-slate-700 last:border-r-0"
            >
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-8 h-[500px]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="border-r border-gray-200 dark:border-slate-700 last:border-r-0 p-2"
            >
              {i > 0 &&
                Array.from({ length: Math.floor(Math.random() * 3) }).map((_, j) => (
                  <Skeleton key={j} className="h-16 w-full mb-2 rounded" />
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProspectDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-20 rounded-full ml-auto" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <Skeleton className="h-5 w-24 mb-4" />
            <SkeletonText lines={4} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <Skeleton className="h-5 w-28 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <SkeletonTable rows={8} columns={5} />
    </div>
  );
}

export function MeetingDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-24 rounded-full ml-auto" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <Skeleton className="h-5 w-24 mb-4" />
            <SkeletonText lines={3} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <Skeleton className="h-5 w-28 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LoadingStateProps {
  children: ReactNode;
  isLoading: boolean;
  skeleton?: ReactNode;
  className?: string;
}

export function LoadingState({ children, isLoading, skeleton, className = "" }: LoadingStateProps) {
  if (isLoading) {
    return <div className={className}>{skeleton ?? <SkeletonCard />}</div>;
  }
  return <>{children}</>;
}
