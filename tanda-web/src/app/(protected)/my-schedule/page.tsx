'use client';

import { ShiftListCard } from '@/components/my-schedule/ShiftListCard';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { useEmployeeShifts } from '@/hooks/useEmployeeShifts';

export default function MySchedulePage() {
  const { user, loading: authLoading } = useAuthRole();
  const { employee, loading: employeeLoading, error: employeeError } =
    useCurrentEmployee(user?.email);

  const employeeCode = employee?.employeeId ?? '';

  const {
    futureShifts,
    loading: shiftsLoading,
    error: shiftsError,
  } = useEmployeeShifts({ employeeCode });

  const loading = authLoading || employeeLoading || shiftsLoading;

  return (
    <div className="min-h-full space-y-5 bg-[#121212] p-4 md:p-6">
      <h1 className="text-sm font-bold tracking-wide text-white uppercase md:text-base">
        Mi horario
      </h1>

      {employeeError && !employeeLoading && (
        <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {employeeError}
        </p>
      )}

      {shiftsError && employee && !shiftsLoading && (
        <p className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          {shiftsError}
        </p>
      )}

      {loading && (
        <p className="text-sm text-zinc-500">Cargando turnos...</p>
      )}

      {!loading && employee && futureShifts.length === 0 && (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-8 text-center text-sm text-zinc-400">
          No tienes turnos próximos programados.
        </p>
      )}

      {employee && !loading && futureShifts.length > 0 && (
        <div className="flex flex-col gap-4">
          {futureShifts.map((shift) => (
            <ShiftListCard key={shift.id} shift={shift} />
          ))}
        </div>
      )}
    </div>
  );
}
