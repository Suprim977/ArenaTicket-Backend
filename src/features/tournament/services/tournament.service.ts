import mongoose from 'mongoose';
import { TournamentRepository } from '../repository/repository';
import { ITournament } from '../model/tournament.model';

export class TournamentService {
  private tournamentRepository: TournamentRepository;

  constructor() {
    this.tournamentRepository = new TournamentRepository();
  }

  async createTournament(
    title: string,
    description: string,
    date: Date,
    location: string,
    prizePool: number,
    maxTeams: number,
    createdBy: string
  ): Promise<ITournament> {
    return await this.tournamentRepository.createTournament({
      title,
      description,
      date,
      location,
      prizePool,
      maxTeams,
      createdBy: new mongoose.Types.ObjectId(createdBy),
    });
  }

  async getAllTournaments(): Promise<ITournament[]> {
    return await this.tournamentRepository.getAllTournaments();
  }
}