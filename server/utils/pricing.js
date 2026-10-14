// Centralized ParkWise pricing + overstay rules so booking, receipts, expenses,
// and overstay detection all agree on the numbers.

const DEFAULT_RATE_PER_HOUR = 20;
const OVERSTAY_GRACE_MINUTES = 15; // free buffer after the reserved end time
const OVERSTAY_PENALTY_MULTIPLIER = 1.5; // overstay is billed at 1.5x the hourly rate
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

function billableHours(startTime, endTime) {
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
  return Math.max(1, Math.ceil(ms / MS_PER_HOUR));
}

function estimateCost(pricePerHour, startTime, endTime) {
  const rate = Number.isFinite(pricePerHour) ? pricePerHour : DEFAULT_RATE_PER_HOUR;
  return Math.round(rate * billableHours(startTime, endTime));
}

// Minutes a vehicle has stayed past its reserved end time, beyond the grace buffer.
function overstayMinutes(endTime, atTime = Date.now()) {
  const overBy = new Date(atTime).getTime() - new Date(endTime).getTime();
  const beyondGrace = overBy - OVERSTAY_GRACE_MINUTES * MS_PER_MINUTE;
  if (beyondGrace <= 0) return 0;
  return Math.ceil(beyondGrace / MS_PER_MINUTE);
}

function overstayFee(pricePerHour, minutes) {
  if (!minutes || minutes <= 0) return 0;
  const rate = Number.isFinite(pricePerHour) ? pricePerHour : DEFAULT_RATE_PER_HOUR;
  const hours = Math.ceil(minutes / 60);
  return Math.round(rate * OVERSTAY_PENALTY_MULTIPLIER * hours);
}

// Live overstay snapshot for an active/checked-in reservation.
function overstayStatus(reservation, atTime = Date.now()) {
  const live = reservation.status === 'ACTIVE' || reservation.status === 'CHECKED_IN';
  if (!live) return { isOverstaying: false, minutes: 0, fee: 0, graceMinutes: OVERSTAY_GRACE_MINUTES };
  const minutes = overstayMinutes(reservation.endTime, atTime);
  return {
    isOverstaying: minutes > 0,
    minutes,
    fee: overstayFee(reservation.pricePerHour, minutes),
    graceMinutes: OVERSTAY_GRACE_MINUTES,
  };
}

// --- Cancellation & refund policy -------------------------------------------
// Simulated refunds for this academic demo (no real money moves).
const FULL_REFUND_CUTOFF_MINUTES = 120; // full refund if cancelled >2h before start
const PARTIAL_REFUND_PERCENT = 50; // within 2h but before start

const REFUND_POLICY_TEXT =
  'Free cancellation up to 2 hours before start (full refund). ' +
  'Within 2 hours of start: 50% refund. After the start time: no refund. ' +
  'If an operator cancels, you receive a full refund. Refunds are simulated for this demo.';

// Decide the refund outcome for a cancellation.
// `byStaff` = cancelled by an operator/admin (always full refund).
function refundQuote(reservation, { atTime = Date.now(), byStaff = false } = {}) {
  const base = reservation.estimatedCost || 0;
  if (base <= 0) {
    return { refundStatus: 'NOT_APPLICABLE', refundAmount: 0, refundReason: 'No payment was due for this booking.' };
  }
  if (byStaff) {
    return { refundStatus: 'PROCESSED', refundAmount: base, refundReason: 'Operator cancelled the reservation — full refund (simulated).' };
  }
  const start = new Date(reservation.startTime).getTime();
  const minutesToStart = (start - atTime) / 60000;
  if (minutesToStart >= FULL_REFUND_CUTOFF_MINUTES) {
    return { refundStatus: 'PROCESSED', refundAmount: base, refundReason: 'Cancelled more than 2 hours before start — full refund (simulated).' };
  }
  if (minutesToStart > 0) {
    const amount = Math.round((base * PARTIAL_REFUND_PERCENT) / 100);
    return { refundStatus: 'PROCESSED', refundAmount: amount, refundReason: `Cancelled within 2 hours of start — ${PARTIAL_REFUND_PERCENT}% refund (simulated).` };
  }
  return { refundStatus: 'NOT_APPLICABLE', refundAmount: 0, refundReason: 'Cancelled after the start time — no refund per policy.' };
}

module.exports = {
  DEFAULT_RATE_PER_HOUR,
  OVERSTAY_GRACE_MINUTES,
  OVERSTAY_PENALTY_MULTIPLIER,
  REFUND_POLICY_TEXT,
  FULL_REFUND_CUTOFF_MINUTES,
  billableHours,
  estimateCost,
  overstayMinutes,
  overstayFee,
  overstayStatus,
  refundQuote,
};
