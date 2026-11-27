import Decimal from 'decimal.js';
import type { OptionDeal, TradingPair } from '../types/trading';
import { INSTRUMENTS } from './instruments';

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
});

export const INITIAL_CASH_BALANCE = '100000.00';
export const INITIAL_LIVE_BALANCE = '0.00';
export const DEFAULT_USD_KES_RATE = '129.00';

export function D(value: Decimal.Value): Decimal {
  if (value === '' || value === null || value === undefined) {
    return new Decimal(0);
  }
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}

export function isValidPositiveInput(value: string): boolean {
  if (!value || value.trim() === '') return false;
  try {
    const d = new Decimal(value);
    return d.isFinite() && d.gt(0);
  } catch {
    return false;
  }
}

export function formatUsd(value: Decimal.Value, showSign = false): string {
  const d = D(value);
  const abs = d.abs();
  const formatted = abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (d.isNegative() && !d.isZero()) {
    return `-$${formatted}`;
  }
  if (showSign && d.gt(0)) {
    return `+$${formatted}`;
  }
  return `$${formatted}`;
}

export function formatKes(value: Decimal.Value): string {
  const d = D(value).abs();
  const formatted = d.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `KES ${formatted}`;
}

export function normalizeMpesaPhone(input: string): string | null {
  const cleaned = input.replace(/[\s\-()+]/g, '');
  if (/^0[17]\d{8}$/.test(cleaned)) {
    return `254${cleaned.slice(1)}`;
  }
  if (/^254[17]\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^[17]\d{8}$/.test(cleaned)) {
    return `254${cleaned}`;
  }
  return null;
}

export function formatPrice(value: Decimal.Value, symbol: TradingPair): string {
  const decimals = INSTRUMENTS[symbol].priceDecimals;
  const d = D(value);
  const fixed = d.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

export function formatPercent(value: Decimal.Value, showSign = true): string {
  const d = D(value);
  const fixed = d.toFixed(2);
  if (showSign && d.gt(0)) {
    return `+${fixed}%`;
  }
  return `${fixed}%`;
}

export function formatCountdown(msRemaining: number): string {
  const totalSec = Math.max(0, Math.ceil(msRemaining / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Applies a house bid/ask execution spread against the trader's direction
 * so price must move meaningfully in their favor just to reach break-even.
 */
export function calculateHandicappedStrike(
  livePrice: Decimal.Value,
  symbol: TradingPair,
  direction: 'CALL' | 'PUT'
): Decimal {
  const cfg = INSTRUMENTS[symbol];
  const price = D(livePrice);
  const spreadRate =
    cfg.category === 'FOREX' ? new Decimal('0.00048') : new Decimal('0.0024');
  const multiplier =
    direction === 'CALL'
      ? new Decimal(1).plus(spreadRate)
      : new Decimal(1).minus(spreadRate);
  return price.mul(multiplier).toDecimalPlaces(cfg.priceDecimals, Decimal.ROUND_HALF_UP);
}

/**
 * Computes ExpertOption-style payout on expiration.
 */
export function calculateOptionPayout(stakeUsd: Decimal.Value, payoutPercent: number): Decimal {
  const stake = D(stakeUsd);
  const multiplier = new Decimal(1).plus(new Decimal(payoutPercent).div(100));
  return stake.mul(multiplier).toDecimalPlaces(2, Decimal.ROUND_DOWN);
}

/**
 * Computes dynamic early Cash Out value with strong company margin retention.
 */
export function calculateEarlyCashOut(
  deal: OptionDeal,
  currentPrice: Decimal.Value,
  nowMs: number
): Decimal {
  const stake = D(deal.stake);
  const payout = D(deal.payoutAmount);
  const mark = D(currentPrice);
  const strike = D(deal.strikePrice);

  const totalMs = Math.max(1000, deal.expiresAt - deal.openedAt);
  const elapsedRatio = Math.min(1, Math.max(0, (nowMs - deal.openedAt) / totalMs));
  const remainingRatio = 1 - elapsedRatio;

  const isInProfit =
    deal.direction === 'CALL' ? mark.gt(strike) : mark.lt(strike);
  const isTie = mark.eq(strike);

  if (isTie) {
    return stake.mul(new Decimal('0.90')).toDecimalPlaces(2, Decimal.ROUND_DOWN);
  }

  if (isInProfit) {
    const maxProfit = payout.minus(stake);
    const earnedFactor = new Decimal('0.06').plus(new Decimal(elapsedRatio).mul('0.42'));
    return stake.plus(maxProfit.mul(earnedFactor)).toDecimalPlaces(2, Decimal.ROUND_DOWN);
  }

  // Out of the money: low salvage value (26% down to 4% near expiration)
  const salvageFactor = new Decimal('0.04').plus(new Decimal(remainingRatio).mul('0.22'));
  return stake.mul(salvageFactor).toDecimalPlaces(2, Decimal.ROUND_DOWN);
}
