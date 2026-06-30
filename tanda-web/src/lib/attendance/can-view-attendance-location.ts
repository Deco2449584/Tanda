export function canViewAttendanceLocation(
  isMaster: boolean,
  canUpdateAttendance: boolean,
): boolean {
  return isMaster || canUpdateAttendance;
}
