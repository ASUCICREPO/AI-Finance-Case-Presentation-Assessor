'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, FunctionSquare, Hash } from 'lucide-react';

interface SheetData {
  headers: string[];
  rows: (string | number | null)[][];
  formulas?: (string | null)[][]; // NEW: formulas array
  rowCount: number;
}

interface SpreadsheetViewerProps {
  sheets: string[];
  data: Record<string, SheetData>;
}

/**
 * Spreadsheet Viewer - Displays uploaded Excel data in a tabular format
 * with tabs for different sheets. Shows ALL rows including headers and footnotes.
 * Toggle between Values and Formulas view.
 */
export default function SpreadsheetViewer({ sheets, data }: SpreadsheetViewerProps) {
  const [activeTab, setActiveTab] = useState<string>(sheets[0] || '');
  const [page, setPage] = useState(0);
  const [showFormulas, setShowFormulas] = useState(false); // NEW: toggle state
  const rowsPerPage = 20;

  const currentSheet = data[activeTab];
  const allRows = currentSheet?.rows || [];
  const allFormulas = currentSheet?.formulas || [];
  const hasFormulas = allFormulas.some(row => row.some(cell => cell && cell !== ''));
  const totalRows = allRows.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const displayRows = allRows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const displayFormulas = allFormulas.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  // Determine max columns from all rows
  const maxCols = Math.max(...allRows.map(r => r.length), 1);

  // Generate column letters (A, B, C, ...)
  const getColLetter = (idx: number) => {
    let result = '';
    while (idx >= 0) {
      result = String.fromCharCode(65 + (idx % 26)) + result;
      idx = Math.floor(idx / 26) - 1;
    }
    return result;
  };
  const colLetters = Array.from({ length: maxCols }, (_, i) => getColLetter(i));

  if (sheets.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
        No spreadsheet data available.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 font-sans">Spreadsheet Viewer</span>
          {/* Formula Toggle */}
          {hasFormulas && (
            <button
              onClick={() => setShowFormulas(!showFormulas)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${showFormulas
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                }`}
              title={showFormulas ? 'Show Values' : 'Show Formulas'}
            >
              {showFormulas ? <Hash size={12} /> : <FunctionSquare size={12} />}
              {showFormulas ? 'Values' : 'Formulas'}
            </button>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {totalRows} rows total
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1 overflow-y-auto">
        <table className="w-full text-sm font-sans border-collapse">
          <thead className="sticky top-0 bg-white z-10">
            {/* Column letters row */}
            <tr className="border-b border-gray-200 bg-gray-100">
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 w-12 border-r border-gray-200 bg-gray-100 sticky left-0">
                {/* Row number column */}
              </th>
              {colLetters.map((letter, i) => (
                <th key={i} className="px-2 py-2 text-center text-xs font-medium text-gray-500 min-w-[80px] border-r border-gray-100">
                  {letter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIdx) => {
              const actualRowNum = page * rowsPerPage + rowIdx + 1;
              const formulaRow = displayFormulas[rowIdx] || [];
              return (
                <tr key={rowIdx} className="border-b border-gray-100 hover:bg-blue-50/50">
                  {/* Row number */}
                  <td className="px-2 py-1.5 text-xs text-gray-500 text-center border-r border-gray-200 bg-gray-50 sticky left-0 font-medium">
                    {actualRowNum}
                  </td>
                  {/* Cells */}
                  {colLetters.map((_, colIdx) => {
                    const cell = row[colIdx];
                    const formula = formulaRow[colIdx];

                    // Show formula if in formula mode AND formula exists, otherwise show value
                    const displayValue = showFormulas && formula
                      ? formula
                      : (cell !== null && cell !== undefined && cell !== '' ? String(cell) : '');

                    const isFormula = showFormulas && formula;
                    const isNumber = !isFormula && typeof cell === 'number';

                    return (
                      <td
                        key={colIdx}
                        className={`px-2 py-1.5 text-xs border-r border-gray-100 max-w-[200px] truncate ${isFormula
                            ? 'text-left text-blue-600 font-mono bg-blue-50/30'
                            : isNumber
                              ? 'text-right text-gray-900'
                              : 'text-left text-gray-800'
                          }`}
                        title={isFormula ? formula : displayValue}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {displayRows.length === 0 && (
              <tr>
                <td colSpan={colLetters.length + 1} className="px-3 py-8 text-center text-gray-400">
                  No data in this sheet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tabs & Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 shrink-0">
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
