export class AppointmentInterval {
  private constructor(
    private readonly startMs: number,
    private readonly endMs: number,
  ) { Object.freeze(this); }

  static fromDuration(start: string | Date, durationMinutes: number): AppointmentInterval {
    const startMs = new Date(start).getTime();
    const endMs = startMs + durationMinutes * 60_000;
    if (!Number.isFinite(startMs) || !Number.isInteger(durationMinutes) || durationMinutes <= 0
      || !Number.isFinite(new Date(endMs).getTime())) {
      throw new RangeError("Intervalo do agendamento invalido.");
    }
    return new AppointmentInterval(startMs, endMs);
  }

  get startsAt(): Date { return new Date(this.startMs); }
  get endsAt(): Date { return new Date(this.endMs); }
  get durationMinutes(): number { return (this.endMs - this.startMs) / 60_000; }
  equals(other: AppointmentInterval): boolean {
    return this.startMs === other.startMs && this.endMs === other.endMs;
  }
  overlaps(other: AppointmentInterval): boolean {
    return this.startMs < other.endMs && other.startMs < this.endMs;
  }
}
