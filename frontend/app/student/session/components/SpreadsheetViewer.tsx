'use client';

import { useState, useMemo, useCallback, useRef, useEffect, CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, FunctionSquare, Hash, Palette, X, GripVertical } from 'lucide-react';

// Cell style from backend
interface CellStyle {
  bg?: string;   // Background color (hex)
  fc?: string;   // Font color (hex)
  b?: boolean;   // Bold
  i?: boolean;   // Italic
  u?: boolean;   // Underline
  ha?: string;   // Horizontal alignment (left, center, right)
  nf?: string;   // Number format (pct, cur, date)
}

interface SheetData {
  headers: string[];
  rows: (string | number | null)[][];
  formulas?: (string | null)[][];
  styles?: (CellStyle | null)[][];  // NEW: styles array
  colWidths?: number[];             // NEW: column widths
  mergedCells?: { start: [number, number]; end: [number, number] }[];
  rowCount: number;
}

interface SpreadsheetViewerProps {
  sheets: string[];
  data: Record<string, SheetData>;
}

// Selected cell info
interface SelectedCell {
  row: number;      // 1-indexed row number
  col: number;      // 0-indexed column
  colLetter: string;
  value: string | number | null;
  formula: string | null;
}

/**
 * Spreadsheet Viewer - Displays uploaded Excel data with original formatting
 * Supports colors, fonts, alignment, merged cells, and cell-level formula viewing.
 */
export default function SpreadsheetViewer({ sheets, data }: SpreadsheetViewerProps) {
  const [activeTab, setActiveTab] = useState<string>(sheets[0] || '');
  const [page, setPage] = useState(0);
  const [showFormulas, setShowFormulas] = useState(false);
  const [showStyles, setShowStyles] = useState(true);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [customColWidths, setCustomColWidths] = useState<Record<string, Record<number, number>>>({});
  const [resizing, setResizing] = useState<{ col: number; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const rowsPerPage = 25;

  const currentSheet = data[activeTab];
  const allRows = currentSheet?.rows || [];
  const allFormulas = currentSheet?.formulas || [];
  const allStyles = currentSheet?.styles || [];
  const colWidths = currentSheet?.colWidths || [];
  const mergedCells = currentSheet?.mergedCells || [];

  const hasFormulas = allFormulas.some(row => row.some(cell => cell && cell !== ''));
  const hasStyles = allStyles.some(row => row.some(cell => cell !== null && cell !== undefined));

  const totalRows = allRows.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const pageStartRow = page * rowsPerPage;
  const displayRows = allRows.slice(pageStartRow, pageStartRow + rowsPerPage);
  const displayFormulas = allFormulas.slice(pageStartRow, pageStartRow + rowsPerPage);
  const displayStyles = allStyles.slice(pageStartRow, pageStartRow + rowsPerPage);

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

  // Build merged cell lookup for current page
  const mergedCellMap = useMemo(() => {
    const map: Record<string, { isStart: boolean; rowSpan: number; colSpan: number }> = {};
    for (const mc of mergedCells) {
      const [startRow, startCol] = mc.start;
      const [endRow, endCol] = mc.end;

      // Only process if visible on current page
      if (endRow <= pageStartRow || startRow > pageStartRow + rowsPerPage) continue;

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const key = `${r}-${c}`;
          if (r === startRow && c === startCol) {
            map[key] = {
              isStart: true,
              rowSpan: Math.min(endRow, pageStartRow + rowsPerPage) - Math.max(startRow, pageStartRow + 1) + 1,
              colSpan: endCol - startCol + 1
            };
          } else {
            map[key] = { isStart: false, rowSpan: 0, colSpan: 0 };
          }
        }
      }
    }
    return map;
  }, [mergedCells, pageStartRow, rowsPerPage]);

  // Convert cell style to CSS
  const getCellCss = (style: CellStyle | null | undefined, isFormula: boolean): CSSProperties => {
    if (!showStyles || !style || isFormula) return {};

    const css: CSSProperties = {};

    if (style.bg) css.backgroundColor = style.bg;
    if (style.fc) css.color = style.fc;
    if (style.b) css.fontWeight = 'bold';
    if (style.i) css.fontStyle = 'italic';
    if (style.u) css.textDecoration = 'underline';
    if (style.ha) {
      css.textAlign = style.ha as 'left' | 'center' | 'right';
    }

    return css;
  };

  // Format value based on number format
  const formatValue = (value: string | number | null, style: CellStyle | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '';

    if (typeof value === 'number' && style?.nf) {
      if (style.nf === 'pct') {
        return `${(value * 100).toFixed(1)}%`;
      } else if (style.nf === 'cur') {
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      }
    }

    return String(value);
  };

  // Get effective column width (custom > backend > default)
  const getColWidth = (colIdx: number): number => {
    const customWidth = customColWidths[activeTab]?.[colIdx];
    if (customWidth) return customWidth;
    if (colWidths[colIdx]) return colWidths[colIdx];
    return 100; // Default width increased from 80 to 100
  };

  // Handle column resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, colIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startWidth = getColWidth(colIdx);
    setResizing({ col: colIdx, startX: e.clientX, startWidth });
  }, [activeTab, customColWidths, colWidths]);

  // Handle column resize move
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing) return;
    const delta = e.clientX - resizing.startX;
    const newWidth = Math.max(50, resizing.startWidth + delta); // Minimum 50px

    setCustomColWidths(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [resizing.col]: newWidth,
      }
    }));
  }, [resizing, activeTab]);

  // Handle column resize end
  const handleResizeEnd = useCallback(() => {
    setResizing(null);
  }, []);

  // Attach/detach mouse events for resizing
  useEffect(() => {
    if (resizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizing, handleResizeMove, handleResizeEnd]);

  if (sheets.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
        No spreadsheet data available.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white h-full flex flex-col">
      {/* Header with Formula Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 font-sans">Spreadsheet Viewer</span>

          {/* Style Toggle */}
          {hasStyles && (
            <button
              onClick={() => setShowStyles(!showStyles)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${showStyles
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                }`}
              title={showStyles ? 'Hide Formatting' : 'Show Formatting'}
            >
              <Palette size={12} />
              {showStyles ? 'Styled' : 'Plain'}
            </button>
          )}

          {/* Formula Toggle (show all formulas) */}
          {hasFormulas && (
            <button
              onClick={() => setShowFormulas(!showFormulas)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${showFormulas
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                }`}
              title={showFormulas ? 'Show Values' : 'Show All Formulas'}
            >
              {showFormulas ? <Hash size={12} /> : <FunctionSquare size={12} />}
              {showFormulas ? 'Values' : 'Formulas'}
            </button>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {totalRows} rows • Click cell for formula • Drag column edges to resize
        </span>
      </div>

      {/* Formula Bar - Shows selected cell info */}
      {selectedCell && (
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-2 bg-gray-50 shrink-0">
          {/* Cell reference */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center justify-center h-7 min-w-[50px] px-2 rounded bg-maroon-100 text-maroon-700 text-sm font-mono font-semibold">
              {selectedCell.colLetter}{selectedCell.row}
            </span>
          </div>

          {/* Formula/Value display */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {selectedCell.formula ? (
              <>
                <FunctionSquare size={14} className="text-blue-600 shrink-0" />
                <code className="text-sm text-blue-700 font-mono bg-blue-50 px-2 py-1 rounded truncate">
                  {selectedCell.formula}
                </code>
                <span className="text-gray-400 mx-1">=</span>
                <span className="text-sm text-gray-700 truncate">
                  {formatValue(selectedCell.value, null)}
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-700 truncate">
                {formatValue(selectedCell.value, null) || '(empty)'}
              </span>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={() => setSelectedCell(null)}
            className="p-1 hover:bg-gray-200 rounded transition-colors shrink-0"
          >
            <X size={14} className="text-gray-400" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className={`overflow-x-auto flex-1 overflow-y-auto ${resizing ? 'select-none cursor-col-resize' : ''}`}>
        <table ref={tableRef} className="w-full text-sm font-sans border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '40px' }} /> {/* Row number column */}
            {colLetters.map((_, i) => (
              <col key={i} style={{ width: `${getColWidth(i)}px` }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 bg-white z-10">
            {/* Column letters row with resize handles */}
            <tr className="border-b border-gray-300 bg-gray-100">
              <th className="px-1 py-1.5 text-center text-xs font-medium text-gray-500 border-r border-gray-300 bg-gray-100 sticky left-0 z-20">
                {/* Row number column */}
              </th>
              {colLetters.map((letter, i) => (
                <th
                  key={i}
                  className="relative px-1 py-1.5 text-center text-xs font-medium text-gray-500 border-r border-gray-200 group"
                >
                  {letter}
                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, i)}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-maroon-300 group-hover:bg-maroon-200/50 transition-colors"
                    title="Drag to resize column"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIdx) => {
              const actualRowNum = pageStartRow + rowIdx + 1;
              const formulaRow = displayFormulas[rowIdx] || [];
              const styleRow = displayStyles[rowIdx] || [];

              return (
                <tr key={rowIdx} className="border-b border-gray-100">
                  {/* Row number */}
                  <td className="px-1 py-0.5 text-xs text-gray-500 text-center border-r border-gray-300 bg-gray-50 sticky left-0 font-medium z-10">
                    {actualRowNum}
                  </td>
                  {/* Cells */}
                  {colLetters.map((_, colIdx) => {
                    const mergeKey = `${actualRowNum}-${colIdx + 1}`;
                    const mergeInfo = mergedCellMap[mergeKey];

                    // Skip cells that are part of a merge but not the start
                    if (mergeInfo && !mergeInfo.isStart) {
                      return null;
                    }

                    const cell = row[colIdx];
                    const formula = formulaRow[colIdx];
                    const style = styleRow[colIdx];
                    const colLetter = colLetters[colIdx];

                    // Check if this cell is selected
                    const isSelected = selectedCell?.row === actualRowNum && selectedCell?.col === colIdx;

                    // Show formula if in formula mode AND formula exists, otherwise show value
                    const isFormulaDisplay = showFormulas && formula;
                    const displayValue = isFormulaDisplay
                      ? formula
                      : formatValue(cell, style);

                    const isNumber = !isFormulaDisplay && typeof cell === 'number';
                    const cellStyle = getCellCss(style, !!isFormulaDisplay);

                    // Default alignment if not specified
                    if (!cellStyle.textAlign) {
                      if (isFormulaDisplay) {
                        cellStyle.textAlign = 'left';
                      } else if (isNumber) {
                        cellStyle.textAlign = 'right';
                      }
                    }

                    // Handle cell click
                    const handleCellClick = () => {
                      setSelectedCell({
                        row: actualRowNum,
                        col: colIdx,
                        colLetter: colLetter,
                        value: cell,
                        formula: formula || null,
                      });
                    };

                    return (
                      <td
                        key={colIdx}
                        rowSpan={mergeInfo?.rowSpan}
                        colSpan={mergeInfo?.colSpan}
                        onClick={handleCellClick}
                        className={`px-1.5 py-0.5 text-xs border-r border-gray-100 overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors ${isFormulaDisplay
                          ? 'text-blue-600 font-mono bg-blue-50/30'
                          : ''
                          } ${isSelected
                            ? 'ring-2 ring-maroon-500 ring-inset bg-maroon-50'
                            : ''
                          } ${formula && !showFormulas
                            ? 'border-b-2 border-b-blue-300'
                            : ''
                          }`}
                        style={cellStyle}
                        title={formula ? `Click to see formula: ${formula}` : displayValue}
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
