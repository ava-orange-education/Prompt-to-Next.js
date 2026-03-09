export interface AnalyticsRecord {
  id: string
  category: string
  metric: number
  collectedAt: Date
}

export interface ChartDataPoint {
  time: string
  value: number
  rawDate: Date
}
