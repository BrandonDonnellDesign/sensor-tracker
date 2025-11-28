'use client';

import { Check, X } from 'lucide-react';

interface ComparisonColumn {
    title: string;
    subtitle?: string;
    highlight?: boolean;
}

interface ComparisonRow {
    feature: string;
    values: (boolean | string)[];
}

interface ComparisonTableProps {
    columns: ComparisonColumn[];
    rows: ComparisonRow[];
}

export function ComparisonTable({ columns, rows }: ComparisonTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className="text-left p-4 bg-slate-800 border-b-2 border-slate-700">
                            <span className="text-sm font-semibold text-slate-300">Feature</span>
                        </th>
                        {columns.map((column, index) => (
                            <th
                                key={index}
                                className={`p-4 border-b-2 text-center ${column.highlight
                                        ? 'bg-gradient-to-b from-blue-900/20 to-indigo-900/20 border-blue-700'
                                        : 'bg-slate-800 border-slate-700'
                                    }`}
                            >
                                <div className="text-sm font-bold text-white">{column.title}</div>
                                {column.subtitle && (
                                    <div className="text-xs text-slate-400 mt-1">{column.subtitle}</div>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr
                            key={rowIndex}
                            className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors"
                        >
                            <td className="p-4 text-sm font-medium text-slate-300">
                                {row.feature}
                            </td>
                            {row.values.map((value, colIndex) => (
                                <td
                                    key={colIndex}
                                    className={`p-4 text-center ${columns[colIndex].highlight
                                            ? 'bg-blue-900/10'
                                            : ''
                                        }`}
                                >
                                    {typeof value === 'boolean' ? (
                                        value ? (
                                            <Check className="w-5 h-5 text-green-400 mx-auto" />
                                        ) : (
                                            <X className="w-5 h-5 text-slate-600 mx-auto" />
                                        )
                                    ) : (
                                        <span className="text-sm text-slate-300">{value}</span>
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
