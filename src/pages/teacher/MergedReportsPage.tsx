import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileText, Download } from 'lucide-react';
import { downloadTablePdf } from '@/lib/pdf';
import { RiskBadge } from '@/components/app/RiskBadge';
import { StatCard } from '@/components/app/StatCard';

interface ClassInfo {
  id: string;
  name: string;
  semester: number;
  totalStudents: number;
}

interface SingleDayReport {
  class: { id: string; name: string };
  date: string;
  totalStudents: number;
  totalSubjects: number;
  totalPresent: number;
  totalAbsent: number;
  avgAttendancePct: number;
  subjects: { id: string; name: string }[];
  subjectBreakdown: {
    subjectId: string;
    subjectName: string;
    present: number;
    absent: number;
    percentage: number;
  }[];
  matrixRows: {
    studentId: string;
    rollNumber: string;
    studentName: string;
    statuses: string[];
  }[];
}

interface RangeStudentRow {
  studentId: string;
  rollNumber: string;
  studentName: string;
  total: number;
  present: number;
  pct: number;
  risk: 'safe' | 'moderate' | 'high';
  status: 'Defaulter' | 'Not Defaulter' | 'No Data';
}

interface RangeStats {
  class: { id: string; name: string };
  range: { startDate: string | null; endDate: string | null };
  totals: {
    assessed: number;
    safe: number;
    defaulters: number;
    nonDefaulters: number;
  };
  studentRows: RangeStudentRow[];
}

export default function MergedReportsPage() {
  const { user } = useAuth();
  if (!user) return null;

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [reportDateOptions, setReportDateOptions] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [singleDayReport, setSingleDayReport] = useState<SingleDayReport | null>(null);
  const [rangeStats, setRangeStats] = useState<RangeStats | null>(null);
  const [reportMode, setReportMode] = useState<'single' | 'range' | null>(null);
  const [selectedCard, setSelectedCard] = useState<'assessed' | 'safe' | 'defaulters'>('assessed');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const [cls, dates] = await Promise.all([
          apiRequest<ClassInfo>('/api/reports/my-class'),
          apiRequest<string[]>('/api/reports/my-class/report-dates'),
        ]);
        setClassInfo(cls);
        setReportDateOptions(dates);
        if (dates.length > 0) {
          setSelectedDate(dates[dates.length - 1]);
          setStartDate(dates[0]);
          setEndDate(dates[dates.length - 1]);
        }
      } catch {
        setError('You are not assigned as class teacher for any class.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasInvalidRange = Boolean(startDate && endDate && startDate > endDate);

  const viewSingleDayReport = async () => {
    if (!selectedDate) return;
    try {
      const report = await apiRequest<SingleDayReport>(
        `/api/reports/my-class/single-day?date=${encodeURIComponent(selectedDate)}`,
      );
      setSingleDayReport(report);
      setRangeStats(null);
      setReportMode('single');
    } catch {
      setSingleDayReport(null);
      setReportMode('single');
    }
  };

  const viewRangeReport = async () => {
    try {
      const query = new URLSearchParams();
      if (startDate) query.set('startDate', startDate);
      if (endDate) query.set('endDate', endDate);
      const stats = await apiRequest<RangeStats>(`/api/reports/my-class/range-stats?${query.toString()}`);
      setRangeStats(stats);
      setSingleDayReport(null);
      setReportMode('range');
    } catch {
      setRangeStats(null);
      setReportMode('range');
    }
  };

  const downloadSingleDayPdf = () => {
    if (!singleDayReport || !classInfo) return;
    downloadTablePdf({
      filename: `your-class-report-${classInfo.name.replace(/\s+/g, '-')}-${singleDayReport.date}.pdf`,
      title: "Your Class's Attendance Report",
      subtitleLines: [
        `Class: ${classInfo.name}`,
        `Date: ${singleDayReport.date}`,
        `Students: ${singleDayReport.totalStudents} | Subjects: ${singleDayReport.totalSubjects} | Avg Attendance: ${singleDayReport.avgAttendancePct}%`,
        'Legend: P = Present, A = Absent',
      ],
      headers: ['Student Name', ...singleDayReport.subjects.map(subject => subject.name)],
      rows: singleDayReport.matrixRows.map(row => [row.studentName, ...row.statuses]),
    });
  };

  const downloadDefaulterPdf = () => {
    if (!rangeStats || !classInfo) return;
    const rows = rangeStats.studentRows.filter(row => row.status === 'Defaulter');
    downloadTablePdf({
      filename: `defaulters-${classInfo.name.replace(/\s+/g, '-')}-${startDate || 'start'}-${endDate || 'end'}.pdf`,
      title: 'Defaulter List',
      subtitleLines: [
        `Class: ${classInfo.name}`,
        `Date Range: ${startDate || '-'} to ${endDate || '-'}`,
        `Category: Defaulter (<75%)`,
      ],
      headers: ['Roll No', 'Student Name', 'Attendance %', 'Risk'],
      rows: rows.map(row => [row.rollNumber, row.studentName, `${row.pct}%`, row.risk.toUpperCase()]),
    });
  };

  const downloadNonDefaulterPdf = () => {
    if (!rangeStats || !classInfo) return;
    const rows = rangeStats.studentRows.filter(row => row.status === 'Not Defaulter');
    downloadTablePdf({
      filename: `non-defaulters-${classInfo.name.replace(/\s+/g, '-')}-${startDate || 'start'}-${endDate || 'end'}.pdf`,
      title: 'Not Defaulter List',
      subtitleLines: [
        `Class: ${classInfo.name}`,
        `Date Range: ${startDate || '-'} to ${endDate || '-'}`,
        `Category: Not Defaulter (>=75%)`,
      ],
      headers: ['Roll No', 'Student Name', 'Attendance %', 'Risk'],
      rows: rows.map(row => [row.rollNumber, row.studentName, `${row.pct}%`, row.risk.toUpperCase()]),
    });
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading class report...</p>;

  if (error || !classInfo) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Your Class's Report</h1>
          <p className="page-subtitle">{error || 'No class assignment found.'}</p>
        </div>
      </div>
    );
  }

  const studentRows = rangeStats?.studentRows ?? [];
  const defaulters = studentRows.filter(row => row.status === 'Defaulter');

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Your Class's Report</h1>
        <p className="page-subtitle">Merged reports, class analytics, and defaulters for {classInfo.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label>Class</Label>
          <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-muted/20">{classInfo.name}</div>
        </div>
        <div className="space-y-2">
          <Label>Select Date (Single-day report)</Label>
          <div className="flex gap-2">
            <Select value={selectedDate} onValueChange={setSelectedDate} disabled={reportDateOptions.length === 0}>
              <SelectTrigger><SelectValue placeholder="Select date" /></SelectTrigger>
              <SelectContent>
                {reportDateOptions.map(date => (
                  <SelectItem key={date} value={date}>{date}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" className="bg-blue-600 text-white hover:bg-blue-700" onClick={viewSingleDayReport}>
              View Report
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label>Start Date (For Range Analytics)</Label>
          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>End Date (For Range Analytics)</Label>
          <div className="flex gap-2">
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={viewRangeReport}
              disabled={hasInvalidRange}
            >
              View Report
            </Button>
          </div>
        </div>
      </div>

      {hasInvalidRange && (
        <p className="text-sm text-danger mb-4">Invalid date range. Start date must be less than or equal to end date.</p>
      )}

      {reportMode === null && (
        <p className="text-muted-foreground mb-6">Select Single-day or Date-range and click View Report.</p>
      )}

      {reportMode === 'single' && singleDayReport && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {classInfo.name} - {singleDayReport.date}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={downloadSingleDayPdf} className="gap-2">
                <Download className="h-3 w-3" /> Download PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 text-sm mb-4">
              <span>Students: <strong>{singleDayReport.totalStudents}</strong></span>
              <span>Subjects: <strong>{singleDayReport.totalSubjects}</strong></span>
              <span>Avg Attendance: <strong>{singleDayReport.avgAttendancePct}%</strong></span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="p-2 text-left font-medium text-muted-foreground">Subject</th>
                    <th className="p-2 text-left font-medium text-muted-foreground">Present</th>
                    <th className="p-2 text-left font-medium text-muted-foreground">Absent</th>
                    <th className="p-2 text-left font-medium text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {singleDayReport.subjectBreakdown.map(subject => (
                    <tr key={subject.subjectId} className="border-b last:border-0">
                      <td className="p-2">{subject.subjectName}</td>
                      <td className="p-2 text-success">{subject.present}</td>
                      <td className="p-2 text-danger">{subject.absent}</td>
                      <td className="p-2 font-semibold">{subject.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {reportMode === 'range' && rangeStats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="Assessed Students"
              value={rangeStats.totals.assessed}
              icon={FileText}
              onClick={() => setSelectedCard('assessed')}
              active={selectedCard === 'assessed'}
            />
            <StatCard
              title="Safe Students"
              value={rangeStats.totals.safe}
              icon={FileText}
              variant="success"
              onClick={() => setSelectedCard('safe')}
              active={selectedCard === 'safe'}
            />
            <StatCard
              title="Defaulters (<75%)"
              value={rangeStats.totals.defaulters}
              icon={FileText}
              variant="danger"
              onClick={() => setSelectedCard('defaulters')}
              active={selectedCard === 'defaulters'}
            />
          </div>

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Class Analytics ({startDate || '-'} to {endDate || '-'})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="p-3 text-left font-medium text-muted-foreground">Roll No</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Name</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Attendance %</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Risk</th>
                      <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...studentRows].sort((a, b) => a.pct - b.pct).map(row => (
                      <tr key={row.studentId} className="border-b last:border-0">
                        <td className="p-3 font-mono text-xs">{row.rollNumber}</td>
                        <td className="p-3 font-medium">{row.studentName}</td>
                        <td className="p-3 font-semibold">{row.total === 0 ? '-' : `${row.pct}%`}</td>
                        <td className="p-3">
                          {row.total === 0 ? <span className="text-muted-foreground text-xs">No Data</span> : <RiskBadge level={row.risk} />}
                        </td>
                        <td className={`p-3 font-semibold ${row.status === 'Defaulter' ? 'text-danger' : row.status === 'Not Defaulter' ? 'text-success' : 'text-muted-foreground'}`}>
                          {row.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Defaulter Students of Your Class</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="px-4 pt-4 pb-2 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={downloadDefaulterPdf}>
                  <Download className="h-3.5 w-3.5" /> Download Defaulters PDF
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={downloadNonDefaulterPdf}>
                  <Download className="h-3.5 w-3.5" /> Download Non-Defaulters PDF
                </Button>
              </div>
              {defaulters.length === 0 ? (
                <p className="text-muted-foreground p-4">No defaulters in your class for the selected range.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="p-3 text-left font-medium text-muted-foreground">Roll No</th>
                        <th className="p-3 text-left font-medium text-muted-foreground">Name</th>
                        <th className="p-3 text-left font-medium text-muted-foreground">Attendance %</th>
                        <th className="p-3 text-left font-medium text-muted-foreground">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {defaulters.map(row => (
                        <tr key={row.studentId} className="border-b last:border-0">
                          <td className="p-3 font-mono text-xs">{row.rollNumber}</td>
                          <td className="p-3 font-medium">{row.studentName}</td>
                          <td className="p-3 text-danger font-semibold">{row.pct}%</td>
                          <td className="p-3"><RiskBadge level={row.risk} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

