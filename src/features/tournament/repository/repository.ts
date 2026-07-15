import { Tournament, ITournament } from '../model/tournament.model';
import { ITournamentListResponse, ITournamentQueryParams } from '../types/tournament.types';

export class TournamentRepository {
  async createTournament(data: Partial<ITournament>): Promise<ITournament> {
    const tournament = new Tournament(data);
    return await tournament.save();
  }

  async getAllTournaments(): Promise<ITournament[]> {
    return await Tournament.find().populate('createdBy', 'name email');
  }

  async searchTournaments(query: ITournamentQueryParams): Promise<ITournamentListResponse> {
    const mongoQuery: Record<string, unknown> = {};

    if (query.search) {
      mongoQuery.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    if (query.location) {
      mongoQuery.location = { $regex: query.location, $options: 'i' };
    }

    if (query.date) {
      const selectedDate = new Date(query.date);
      const nextDate = new Date(selectedDate);
      nextDate.setDate(nextDate.getDate() + 1);
      mongoQuery.date = { $gte: selectedDate, $lt: nextDate };
    }

    if (query.minPrize !== undefined || query.maxPrize !== undefined) {
      const prizeFilter: Record<string, number> = {};

      if (query.minPrize !== undefined) {
        prizeFilter.$gte = query.minPrize;
      }

      if (query.maxPrize !== undefined) {
        prizeFilter.$lte = query.maxPrize;
      }

      mongoQuery.prizePool = prizeFilter;
    }

    const hasFilters = Boolean(
      query.search ||
        query.date ||
        query.location ||
        query.minPrize !== undefined ||
        query.maxPrize !== undefined ||
        query.page !== undefined ||
        query.limit !== undefined ||
        query.sortBy ||
        query.sortOrder
    );

    const sortBy = query.sortBy || 'date';
    const sortOrder = query.sortOrder === 'desc' ? -1 : 1;
    const page = query.page && query.page > 0 ? Math.floor(query.page) : 1;

    if (!hasFilters) {
      const data = await Tournament.find(mongoQuery)
        .populate('createdBy', 'name email')
        .sort({ [sortBy]: sortOrder });

      return {
        data,
        pagination: {
          page: 1,
          limit: data.length || 1,
          total: data.length,
          pages: 1,
        },
      };
    }

    const limit = query.limit && query.limit > 0 ? Math.floor(query.limit) : 10;
    const skip = (page - 1) * limit;

    const total = await Tournament.countDocuments(mongoQuery);
    const data = await Tournament.find(mongoQuery)
      .populate('createdBy', 'name email')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getTournamentById(id: string): Promise<ITournament | null> {
    return await Tournament.findById(id).populate('createdBy', 'name email');
  }
}