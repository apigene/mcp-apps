/**
 * Vercel Deployments Data Parsing & Formatting
 */

export interface Deployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  readyState: string;
  readySubstate?: string;
  created: number;
  createdAt: number;
  buildingAt?: number;
  ready?: number;
  source: string;
  target: string | null;
  creator: {
    uid: string;
    email: string;
    username: string;
    githubLogin?: string;
  };
  inspectorUrl: string;
  meta?: {
    githubCommitMessage?: string;
    githubCommitAuthorName?: string;
    githubCommitSha?: string;
    githubCommitRef?: string;
    githubPrId?: string;
    [key: string]: any;
  };
  errorCode?: string;
  errorMessage?: string;
}

export interface DeploymentsResponse {
  deployments: Deployment[];
  pagination?: {
    count: number;
    next?: number;
    prev?: number;
  };
}

/**
 * Parse the Vercel deployments API response
 */
export function parseDeploymentsData(data: any): Deployment[] {
  // Handle error responses
  if (data.error || data.isError) {
    throw new Error(`API error: ${data.error?.message || "Unknown error"}`);
  }

  // Extract deployments array
  let deployments: Deployment[] = [];

  if (data.deployments && Array.isArray(data.deployments)) {
    deployments = data.deployments;
  } else if (Array.isArray(data)) {
    deployments = data;
  } else if (data.actions_result?.[0]?.response_content?.deployments) {
    deployments = data.actions_result[0].response_content.deployments;
  } else {
    throw new Error("No deployments found in response");
  }

  return deployments;
}

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

/**
 * Format timestamp to absolute time (e.g., "Dec 5, 2024 10:30 AM")
 */
export function formatAbsoluteTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format deployment duration (building time)
 */
export function formatDuration(start?: number, end?: number): string {
  if (!start || !end) return "-";
  const diff = end - start;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Get status badge info (color and label)
 */
export function getStatusInfo(deployment: Deployment): {
  color: string;
  label: string;
  icon: string;
} {
  if (deployment.state === "READY") {
    return {
      color: "#00e676",
      label: deployment.readySubstate || "Ready",
      icon: "✓",
    };
  }
  if (deployment.state === "ERROR") {
    return {
      color: "#f44336",
      label: "Error",
      icon: "✕",
    };
  }
  if (deployment.state === "BUILDING") {
    return {
      color: "#2196f3",
      label: "Building",
      icon: "⟳",
    };
  }
  if (deployment.state === "QUEUED") {
    return {
      color: "#ff9800",
      label: "Queued",
      icon: "⏱",
    };
  }
  return {
    color: "#9e9e9e",
    label: deployment.state,
    icon: "•",
  };
}

/**
 * Get environment badge (production, preview, etc.)
 */
export function getEnvironmentInfo(target: string | null): {
  color: string;
  label: string;
} {
  if (target === "production") {
    return {
      color: "#7c3aed",
      label: "Production",
    };
  }
  return {
    color: "#64748b",
    label: "Preview",
  };
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Extract first line of commit message
 */
export function getCommitTitle(message?: string): string {
  if (!message) return "-";
  return message.split("\n")[0];
}
