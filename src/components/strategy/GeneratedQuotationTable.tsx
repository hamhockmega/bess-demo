import React from 'react';
import { PanelCard } from '@/components/dashboard/PanelCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartInfoButton, CHART_INFO } from '@/components/charts/ChartInfoButton';
import type { QuotationSegment } from '@/data/strategyData';

interface Props {
  segments: QuotationSegment[];
}

export const GeneratedQuotationTable: React.FC<Props> = ({ segments }) => {
  return (
    <PanelCard title="分段报价曲线" headerRight={<ChartInfoButton info={CHART_INFO.quotation} />}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="text-xs font-medium">类型</TableHead>
            <TableHead className="text-xs font-medium">段号</TableHead>
            <TableHead className="text-xs font-medium">起始出力(MW)</TableHead>
            <TableHead className="text-xs font-medium">终止出力(MW)</TableHead>
            <TableHead className="text-xs font-medium">报价(元/MWh)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {segments.map((seg, idx) => (
            <TableRow key={idx}>
              <TableCell className="text-xs font-medium">
                <span
                  className={
                    seg.type === '充电'
                      ? 'text-blue-600'
                      : 'text-emerald-600'
                  }
                >
                  {seg.type}
                </span>
              </TableCell>
              <TableCell className="text-xs">{seg.segmentNo}</TableCell>
              <TableCell className="text-xs">{seg.startPower}</TableCell>
              <TableCell className="text-xs">{seg.endPower}</TableCell>
              <TableCell className="text-xs font-medium">{seg.offerPrice}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-[11px] text-muted-foreground mt-2 text-center">
        (负功率为充电，正功率为放电)
      </p>
    </PanelCard>
  );
};
