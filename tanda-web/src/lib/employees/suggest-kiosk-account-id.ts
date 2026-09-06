import { suggestAccountEmployeeId } from '@/lib/employees/suggest-account-employee-id';

/** Internal staff code for kiosk login accounts — not used as an employee PIN at the terminal. */
export function suggestKioskAccountEmployeeId(usedIds: Iterable<string>): string {
  return suggestAccountEmployeeId('KIOSK', usedIds);
}
