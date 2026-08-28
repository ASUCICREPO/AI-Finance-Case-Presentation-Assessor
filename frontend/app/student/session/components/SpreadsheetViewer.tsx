'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SheetData {
  headers: string[];
  rows: (string | number | null)[][];
  rowCount: number;
}

interface SpreadsheetViewerProps {
  sheets: string[];
  data: Record<string, SheetData>;
}

/**
 * Spreadsheet Viewer - Displays uploaded Excel data in a tabular format
 * with tabs for different sheets.
 */
export default function SpreadsheetViewer({ sheets, data }: SpreadsheetViewerProps) {
  const [activeTab, setActiveTab] = useState<string>(sheets[0] || '');
  const [page, setPage] = useState(0);
  const rowsPerPage = 15;

  const currentSheet = data[activeTab];
  const headers = currentSheet?.headers || [];
  const allRows = currentSheet?.rows || [];
  const totalRows = allRows.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const displayRows = allRows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  // Column letters (A, B, C, ...)
  const colLetters = headers.map((_, i) => String.fromCharCode(65 + i));

  if (sheets.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
        No spreadsheet data available.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <span className="text-sm text-gray-500 font-sans">Spreadsheet Viewer</span>
        <span className="text-xs text-gray-400">
          {totalRows} rows total
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm font-sans">
          <thead className="sticky top-0 bg-white z-10">
            {/* Column letters row */}
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-10"></th>
              {colLetters.map((letter, i) => (
                <th key={i} className="px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[100px]">
                  {letter}
                </th>
              ))}
            </tr>
            {/* Headers row */}
            <tr className="border-b border-gray-200 bg-gray-100">
              <td className="px-3 py-2 text-xs text-gray-400">1</td>
              {headers.map((header, i) => (
                <td key={i} className="px-3 py-2 text-xs font-semibold text-gray-700 truncate max-w-[200px]" title={String(header)}>
                  {header}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-xs text-gray-400">
                  {page * rowsPerPage + rowIdx + 2}
                </td>
                {row.map((cell, colIdx) => (
                  <td
                    key={colIdx}
                    className="px-3 py-2 text-xs text-gray-900 truncate max-w-[200px]"
                    title={cell !== null ? String(cell) : ''}
                  >
                    {cell !== null ? String(cell) : ''}
                  </td>
                ))}
                {/* Fill empty cells if row is shorter than headers */}
                {row.length < headers.length &&
                  Array(headers.length - row.length)
                    .fill(null)
                    .map((_, i) => <td key={`empty-${i}`} className="px-3 py-2"></td>)}
              </tr>
            ))}
            {displayRows.length === 0 && (
              <tr>
                <td colSpan={headers.length + 1} className="px-3 py-8 text-center text-gray-400">
                  No data in this sheet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tabs & Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
        <div className="flex gap-1 flex-wrap">
          {sheets.map((sheet) => (
            <button
              key={sheet}
              onClick={() => {
                setActiveTab(sheet);
                setPage(0);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === sheet
                  ? 'bg-maroon-600 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
            >
              {sheet}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Page {page + 1} of {totalPages || 1}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-full border border-gray-200 p-1 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft size={14} className="text-gray-600" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-full border border-gray-200 p-1 hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronRight size={14} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
