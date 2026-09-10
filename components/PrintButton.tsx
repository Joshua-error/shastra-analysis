'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors no-print"
    >
      🖨 Print Report
    </button>
  );
}
