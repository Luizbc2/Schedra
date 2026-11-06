export class ServicePrice {
  private constructor(readonly cents: number) { Object.freeze(this); }

  static fromAmount(amount: number): ServicePrice {
    const cents = Math.round(amount * 100);
    if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(cents)
      || Math.abs(amount * 100 - cents) > 0.000001) {
      throw new RangeError("Preco do atendimento invalido.");
    }
    return new ServicePrice(cents);
  }

  toAmount(): number { return this.cents / 100; }
  equals(other: ServicePrice): boolean { return this.cents === other.cents; }
}
