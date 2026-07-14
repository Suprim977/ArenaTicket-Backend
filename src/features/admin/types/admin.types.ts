export interface IAdminStats {
  totalUsers: number;
  totalTournaments: number;
  totalTickets: number;
  totalRevenue?: number;
}

export interface IAdminDashboardResponse {
  stats: IAdminStats;
  recentUsers: any[];
  recentTournaments: any[];
}