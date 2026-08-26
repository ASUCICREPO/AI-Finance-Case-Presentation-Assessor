'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type SheetTab = 'Summary' | 'Properties' | 'Financial Model' | 'Assumptions';

interface PropertyRow {
  id: number;
  property: string;
  location: string;
  priceM: number;
  capRate: string;
  noiK: string;
  occupancy: string;
}

const SAMPLE_DATA: PropertyRow[] = [
  { id: 2, property: 'Wilshire Office Plaza', location: 'Los Angeles, CA', priceM: 86.5, capRate: '5.45%', noiK: '4,668', occupancy: '92.4%' },
  { id: 3, property: 'Biltmore Retail Center', location: 'Phoenix, AZ', priceM: 42.8, capRate: '6.18%', noiK: '2,562', occupancy: '88.1%' },
  { id: 4, property: 'Silicon Valley Tech Hub', location: 'San Jose, CA', priceM: 148.2, capRate: '4.85%', noiK: '7,187', occupancy: '96.5%' },
  { id: 5, property: 'Austin Logistics Park', location: 'Austin, TX', priceM: 64.8, capRate: '5.75%', noiK: '3,726', occupancy: '100.0%' },
  { id: 6, property: 'Denver Multi-Family Com...', location: 'Denver, CO', priceM: 112.8, capRate: '4.25%', noiK: '4,768', occupancy: '94.8%' },
  { id: 7, property: 'Miami Beach Hotel & Spa', location: 'Miami, FL', priceM: 195.8, capRate: '6.58%', noiK: '12,676', occupancy: '82.3%' },
  { id: 8, property: 'Atlanta Commerce Depot', location: 'Atlanta, GA', priceM: 28.4, capRate: '6.80%', noiK: '1,931', occupancy: '91.8%' },
  { id: 9, property: 'Seattle Creative Lofts', location: 'Seattle, WA', priceM: 53.2, capRate: '5.15%', noiK: '2,748', occupancy: '95.1%' },
  { id: 10, property: 'Boston Life Sciences Lab', location: 'Boston, MA', priceM: 135.8, capRate: '4.96%', noiK: '6,682', occupancy: '98.2%' },
];

const TOTALS = {
  id: 11,
  property: 'Total Portfolio Average',
  location: '9 Assets',
  priceM: 863.6,
  capRate: '5.60%',
  noiK: '51,623',
  occupancy: '93.1%',
};

/**
 * Spreadsheet Viewer - Displays uploaded Excel/Google Sheet data in a tabular format
 * with tabs for different sheets (Summary, Properties, Financial Model, Assumptions).
 * Based on Figma: Spreadsheet sandbox viewer with property data table.
 */
export default function SpreadsheetViewer() {
  const [activeTab, setActiveTab] = useState<SheetTab>('Properties');

  const tabs: SheetTab[] = ['Summary', 'Properties', 'Financial Model', 'Assumptions'];

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <span className="text-sm text-gray-500 font-sans">Spreadsheet Sandbox Viewer</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-8"></th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">A</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">B</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">C</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">D</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">E</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">F</th>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="px-3 py-2 text-xs text-gray-400">1</td>
              <td className="px-3 py-2 text-xs font-medium text-gray-700">Property</td>
              <td className="px-3 py-2 text-xs font-medium text-gray-700">Location</td>
              <td className="px-3 py-2 text-xs font-medium text-gray-700">Price ($M)</td>
              <td className="px-3 py-2 text-xs font-medium text-gray-700">Cap Rate</td>
              <td className="px-3 py-2 text-xs font-medium text-gray-700">NOI ($K)</td>
              <td className="px-3 py-2 text-xs font-medium text-gray-700">Occupancy</td>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_DATA.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-xs text-gray-400">{row.id}</td>
                <td className="px-3 py-2 text-xs text-gray-900">{row.property}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{row.location}</td>
                <td className="px-3 py-2 text-xs text-gray-900">{row.priceM}</td>
                <td className="px-3 py-2 text-xs text-gray-900">{row.capRate}</td>
                <td className="px-3 py-2 text-xs text-gray-900">{row.noiK}</td>
                <td className="px-3 py-2 text-xs text-gray-900">{row.occupancy}</td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="border-t-2 border-gray-300 bg-gray-50 font-medium">
              <td className="px-3 py-2 text-xs text-gray-400">{TOTALS.id}</td>
              <td className="px-3 py-2 text-xs text-gray-900">{TOTALS.property}</td>
              <td className="px-3 py-2 text-xs text-gray-600">{TOTALS.location}</td>
              <td className="px-3 py-2 text-xs text-gray-900">{TOTALS.priceM}</td>
              <td className="px-3 py-2 text-xs text-gray-900">{TOTALS.capRate}</td>
              <td className="px-3 py-2 text-xs text-gray-900">{TOTALS.noiK}</td>
              <td className="px-3 py-2 text-xs text-gray-900">{TOTALS.occupancy}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tabs & Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-maroon-600 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-full border border-gray-200 p-1 hover:bg-gray-50">
            <ChevronLeft size={14} className="text-gray-600" />
          </button>
          <button className="rounded-full border border-gray-200 p-1 hover:bg-gray-50">
            <ChevronRight size={14} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
