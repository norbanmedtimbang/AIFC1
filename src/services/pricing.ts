import { DiscountType, ShopSettings } from '../types';

export interface DiscountInput {
  type: DiscountType | 'none';
  customPercent?: number;
}

export interface PricingResult {
  subtotalCents: number;      // gross cart total as priced on the menu
  discountCents: number;      // total reduction from subtotal (includes VAT removed for Senior/PWD)
  vatRemovedCents: number;    // Senior/PWD only: VAT stripped before the 20% discount
  totalCents: number;         // amount due
  taxCents: number;           // VAT contained in the amount due (0 when VAT-exempt)
  isVatExempt: boolean;
  label: string;
}

/**
 * Single source of truth for cart totals, used by the POS preview and by checkout
 * so the figure the cashier sees is the figure that is stored and printed.
 *
 * Senior Citizen / PWD (RA 9994, RA 10754): the sale is VAT-exempt and the 20%
 * discount is computed on the VAT-exclusive price. Other discounts are a plain
 * percentage of the subtotal and keep VAT in the amount due.
 */
export function computePricing(
  subtotalCents: number,
  settings: Pick<ShopSettings, 'taxRatePercent' | 'isTaxIncluded'>,
  discount: DiscountInput
): PricingResult {
  const rate = settings.taxRatePercent / 100;

  if (subtotalCents <= 0 || discount.type === 'none') {
    return finish(subtotalCents, 0, 0, false, '', settings);
  }

  if (discount.type === 'senior' || discount.type === 'pwd') {
    // Prices already include VAT -> remove it. Prices exclude VAT -> nothing to remove.
    const netCents = settings.isTaxIncluded ? Math.round(subtotalCents / (1 + rate)) : subtotalCents;
    const vatRemovedCents = subtotalCents - netCents;
    const scPwdDiscountCents = Math.round(netCents * 0.2);
    const totalCents = netCents - scPwdDiscountCents;
    const label = discount.type === 'senior' ? 'Senior Citizen (20%, VAT-exempt)' : 'PWD (20%, VAT-exempt)';
    return {
      subtotalCents,
      discountCents: subtotalCents - totalCents,
      vatRemovedCents,
      totalCents,
      taxCents: 0,
      isVatExempt: true,
      label
    };
  }

  const pct =
    discount.type === 'staff' ? 10 : Math.min(100, Math.max(0, discount.customPercent ?? 0));
  const cents = Math.min(subtotalCents, Math.round((subtotalCents * pct) / 100));
  const label = discount.type === 'staff' ? 'Staff (10%)' : `Discount (${pct}%)`;
  return finish(subtotalCents, cents, 0, false, label, settings);
}

function finish(
  subtotalCents: number,
  discountCents: number,
  vatRemovedCents: number,
  isVatExempt: boolean,
  label: string,
  settings?: Pick<ShopSettings, 'taxRatePercent' | 'isTaxIncluded'>
): PricingResult {
  const totalCents = Math.max(0, subtotalCents - discountCents);
  const rate = (settings?.taxRatePercent ?? 0) / 100;
  const taxCents = settings
    ? settings.isTaxIncluded
      ? Math.round((totalCents * rate) / (1 + rate))
      : Math.round(totalCents * rate)
    : 0;
  return { subtotalCents, discountCents, vatRemovedCents, totalCents, taxCents, isVatExempt, label };
}
