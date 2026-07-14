import { Tournament, ITournament } from './tournament.model';

export class TournamentRepository {
  async createTournament(data: Partial<ITournament>): Promise<ITournament> {
    const tournament = new Tournament(data);
    return await tournament.save();
  }

  async getAllTournaments(): Promise<ITournament[]> {
    return await Tournament.find().populate('createdBy', 'name email');
  }

  async getTournamentById(id: string): Promise<ITournament | null> {
    return await Tournament.findById(id).populate('createdBy', 'name email');
  }
}