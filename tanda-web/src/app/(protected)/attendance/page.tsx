'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { CalendarRange, Download, Search } from 'lucide-react';
import { AttendanceTable } from '@/components/attendance/AttendanceTable';
import {
  formatAttendanceType,
  formatRecordDate,
  formatRecordTime,
} from '@/lib/attendance/format';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { mapEmployeeDoc } from '@/lib/employees/map-employee';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';

function getDefaultDateRangeLabel(): string {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  const formatter = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function exportRecordsToCsv(
  records: AttendanceRecord[],
  employeeCodes: Record<string, string>,
) {
  const headers = [
    'ID Empleado',
    'Empleado',
    'Fecha',
    'Tipo Registro',
    'Hora (Server)',
    'Fuente',
    'Foto URL',
  ];

  const rows = records.map((record) => [
    employeeCodes[record.employeeId] ?? '',
    record.employeeNameSnapshot,
    formatRecordDate(record.timestampServer),
    formatAttendanceType(record.type),
    formatRecordTime(record.timestampServer),
    record.source,
    record.photoUrl,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
    )
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `reporte-asistencia-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRangeLabel] = useState(getDefaultDateRangeLabel);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    let recordsReady = false;
    let employeesReady = false;

    function checkReady() {
      if (recordsReady && employeesReady) {
        setLoading(false);
      }
    }

    const attendanceQuery = query(
      collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
      orderBy('timestampServer', 'desc'),
      limit(50),
    );

    const unsubscribeRecords = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const mapped = snapshot.docs.map((document) =>
          mapAttendanceDoc(document.id, document.data()),
        );
        setRecords(mapped);
        recordsReady = true;
        checkReady();
      },
      () => {
        recordsReady = true;
        checkReady();
      },
    );

    const unsubscribeEmployees = onSnapshot(
      collection(db, COLLECTIONS.EMPLOYEES),
      (snapshot) => {
        const mapped = snapshot.docs.map((document) =>
          mapEmployeeDoc(document.id, document.data()),
        );
        setEmployees(mapped);
        employeesReady = true;
        checkReady();
      },
      () => {
        employeesReady = true;
        checkReady();
      },
    );

    return () => {
      unsubscribeRecords();
      unsubscribeEmployees();
    };
  }, []);

  const employeeCodes = useMemo(() => {
    const map: Record<string, string> = {};
    employees.forEach((employee) => {
      map[employee.id] = employee.employeeId || '—';
    });
    return map;
  }, [employees]);

  const filteredForExport = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    if (!queryText) return records;

    return records.filter((record) => {
      const code = (employeeCodes[record.employeeId] ?? '').toLowerCase();
      return (
        record.employeeNameSnapshot.toLowerCase().includes(queryText) ||
        code.includes(queryText)
      );
    });
  }, [records, searchQuery, employeeCodes]);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-base font-bold tracking-wide text-white uppercase">
        Control de tiempos y asistencia (Audit)
      </h1>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:border-zinc-600"
        >
          <CalendarRange className="h-4 w-4 text-emerald-500" />
          {dateRangeLabel}
        </button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:min-w-[280px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar Empleado..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-emerald-600/50 focus:ring-1 focus:ring-emerald-600/30"
            />
          </div>

          <button
            type="button"
            onClick={() => exportRecordsToCsv(filteredForExport, employeeCodes)}
            disabled={loading || filteredForExport.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            EXPORTAR REPORTE (CSV)
          </button>
        </div>
      </div>

      <AttendanceTable
        records={records}
        employeeCodes={employeeCodes}
        loading={loading}
        searchQuery={searchQuery}
      />
    </div>
  );
}
