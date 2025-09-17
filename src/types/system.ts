export type HealthState = { state: string; message?: string };

export type SystemHealth = {
  runtimeMode: string;
  version: string;
  database: HealthState;
  searchEngine: HealthState;
  [key: string]: unknown;
};

export type SystemStatus = {
  state: string;          // e.g., "UP" | "DOWN"
  maintenanceMode?: boolean;
  uptime?: number;        // ms
  [key: string]: unknown;
};

export type SystemVersion = {
  version: string;        // e.g., "1.48.0"
  [key: string]: unknown;
};

export type SystemOverview = {
  health: SystemHealth;
  status: SystemStatus;
  version: SystemVersion;
};
