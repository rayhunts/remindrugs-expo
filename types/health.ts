export interface SleepData {
  date: string;
  durationHours: number;
  quality?: "poor" | "fair" | "good";
  stages?: {
    awake: number;
    light: number;
    deep: number;
    rem: number;
  };
}

export interface HeartRateData {
  date: string;
  averageBpm: number;
  restingBpm?: number;
  minBpm?: number;
  maxBpm?: number;
}

export interface HealthData {
  sleep: SleepData | null;
  heartRate: HeartRateData | null;
  steps?: number;
  lastUpdated: number;
}
