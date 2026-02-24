import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceRecords, classes, getMergedReports, students, subjects } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileText, Download } from 'lucide-react';
import { downloadTablePdf } from '@/lib/pdf';
import { RiskBadge } from '@/components/RiskBadge';
import { StatCard } from '@/components/StatCard';

type StudentRangeRow = {
  student: (typeof students)[number];
  total: number;
  present: number;
  pct: number;
  risk: 'safe' | 'moderate' | 'high';
  status: 'Defaulter' | 'Not Defaulter' | 'No Data';
};

export default function MergedReportsPage() {
  const { user } = useAuth();
  if (!user) return null;

  const assignedClass = classes.find(c => c.class_teacher_id === user.id);
  const mergedReports = getMergedReports();

  if (!assignedClass) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Your Class's Report</h1>
          <p className="page-subtitle">You are not assigned as class teacher for any class.</p>
        </div>
      </div>
    );
  }

  const classReports = mergedReports.filter(r => r.class_id === assignedClass.id);
  const reportDateOptions = [...new Set(classReports.map(r => r.report_date))].sort();
  const [selectedDate, setSelectedDate] = useState<string>(reportDateOptions[reportDateOptions.length - 1] || '');
  const [selectedCard, setSelectedCard] = useState<'assessed' | 'safe' | 'defaulters'>('assessed');
  const [reportMode, setReportMode] = useState<'single' | 'range'>('range');
  const [showSingleDayReport, setShowSingleDayReport] = useState(false);
  const [hasViewedReport, setHasViewedReport] = useState(false);

  const classStudents = students.filter(s => s.class_id === assignedClass.id);
  const classAttendanceRecords = attendanceRecords
    .filter(r => r.class_id === assignedClass.id)
    .sort((a, b) => a.attendance_date.localeCompare(b.attendance_date));

  const allDates = [...new Set(classAttendanceRecords.map(r => r.attendance_date))];
  const defaultStart = allDates[0] || '';
  const defaultEnd = allDates[allDates.length - 1] || '';

  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);

  const hasInvalidRange = Boolean(startDate && endDate && startDate > endDate);

  const singleDayRecords = useMemo(
    () => classAttendanceRecords.filter(r => r.attendance_date === selectedDate),
    [classAttendanceRecords, selectedDate],
  );

  const rangeRecords = useMemo(() => {
    if (hasInvalidRange) return [];
    return classAttendanceRecords.filter(r => {
      if (startDate && r.attendance_date < startDate) return false;
      if (endDate && r.attendance_date > endDate) return false;
      return true;
    });
  }, [classAttendanceRecords, endDate, hasInvalidRange, startDate]);

  const studentRangeRows: StudentRangeRow[] = useMemo(
    () =>
      classStudents.map(student => {
        const sourceRecords = reportMode === 'single' ? singleDayRecords : rangeRecords;
        const recs = sourceRecords.filter(r => r.student_id === student.id);
        const total = recs.length;
        const present = recs.filter(r => r.status === 'present').length;
        const pct = total > 0 ? Math.round((present / total) * 100) : 0;
        const risk: 'safe' | 'moderate' | 'high' = pct >= 85 ? 'safe' : pct >= 75 ? 'moderate' : 'high';
        const status: 'Defaulter' | 'Not Defaulter' | 'No Data' = total === 0 ? 'No Data' : pct < 75 ? 'Defaulter' : 'Not Defaulter';
        return { student, total, present, pct, risk, status };
      }),
    [classStudents, rangeRecords, reportMode, singleDayRecords],
  );

  const assessedStudents = studentRangeRows.filter(r => r.status !== 'No Data');
  const classDefaulters = assessedStudents.filter(r => r.status === 'Defaulter');
  const classNonDefaulters = assessedStudents.filter(r => r.status === 'Not Defaulter');
  const safeStudents = assessedStudents.filter(r => r.pct >= 85);

  const selectedReport = classReports.find(r => r.report_date === selectedDate);

  const reportLabel = reportMode === 'single'
    ? (selectedDate || 'No date selected')
    : (startDate && endDate ? `${startDate} to ${endDate}` : 'All dates');

  const downloadSelectedReportPdf = () => {
    if (!selectedReport) return;

    const dayRecords = attendanceRecords.filter(
      r => r.class_id === assignedClass.id && r.attendance_date === selectedReport.report_date,
    );
    const subjectIds = Array.from(new Set(dayRecords.map(r => r.subject_id))).sort();
    const subjectNames = subjectIds.map(id => subjects.find(s => s.id === id)?.name || id);
    const classStudentsSorted = [...classStudents].sort((a, b) => a.roll_number.localeCompare(b.roll_number));

    const matrixRows = classStudentsSorted.map(student => {
      const rowValues = subjectIds.map(subjectId => {
        const rec = dayRecords.find(r => r.student_id === student.id && r.subject_id === subjectId);
        if (!rec) return '-';
        return rec.status === 'present' ? 'P' : 'A';
      });
      return [student.name, ...rowValues];
    });

    downloadTablePdf({
      filename: `your-class-report-${assignedClass.name.replace(/\s+/g, '-')}-${selectedReport.report_date}.pdf`,
      title: "Your Class's Attendance Report",
      subtitleLines: [
        `Class: ${assignedClass.name}`,
        `Date: ${selectedReport.report_date}`,
        `Students: ${selectedReport.total_students} | Subjects: ${selectedReport.total_subjects} | Avg Attendance: ${selectedReport.avg_attendance_pct}%`,
        'Legend: P = Present, A = Absent',
      ],
      headers: ['Student Name', ...subjectNames],
      rows: matrixRows,
    });
  };

  const downloadDefaulterPdf = () => {
    downloadTablePdf({
      filename: `defaulters-${assignedClass.name.replace(/\s+/g, '-')}-${reportMode === 'single' ? selectedDate : `${startDate || 'start'}-${endDate || 'end'}`}.pdf`,
      title: 'Defaulter List',
      subtitleLines: [
        `Class: ${assignedClass.name}`,
        `Report: ${reportMode === 'single' ? 'Single Day' : 'Date Range'}`,
        `Period: ${reportLabel}`,
        `Category: Defaulter (<75%)`,
        `Students: ${classDefaulters.length}`,
      ],
      headers: ['Roll No', 'Student Name', 'Attendance %', 'Risk'],
      rows: classDefaulters.map(r => [r.student.roll_number, r.student.name, `${r.pct}%`, r.risk.toUpperCase()]),
    });
  };

  const downloadNonDefaulterPdf = () => {
    downloadTablePdf({
      filename: `non-defaulters-${assignedClass.name.replace(/\s+/g, '-')}-${reportMode === 'single' ? selectedDate : `${startDate || 'start'}-${endDate || 'end'}`}.pdf`,
      title: 'Not Defaulter List',
      subtitleLines: [
        `Class: ${assignedClass.name}`,
        `Report: ${reportMode === 'single' ? 'Single Day' : 'Date Range'}`,
        `Period: ${reportLabel}`,
        `Category: Not Defaulter (>=75%)`,
        `Students: ${classNonDefaulters.length}`,
      ],
      headers: ['Roll No', 'Student Name', 'Attendance %', 'Risk'],
      rows: classNonDefaulters.map(r => [r.student.roll_number, r.student.name, `${r.pct}%`, r.risk.toUpperCase()]),
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Your Class's Report</h1>
        <p className="page-subtitle">Merged reports, class analytics, and defaulters for {assignedClass.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label>Class</Label>
          <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-muted/20">{assignedClass.name}</div>
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
            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => {
                setReportMode('single');
                setShowSingleDayReport(true);
                setHasViewedReport(true);
              }}
            >
              View Report
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label>Start Date (For Range Analytics)</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} max={endDate || undefined} />
        </div>
        <div className="space-y-2">
          <Label>End Date (For Range Analytics)</Label>
          <div className="flex gap-2">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} />
            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => {
                setReportMode('range');
                setShowSingleDayReport(false);
                setHasViewedReport(true);
              }}
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

      {!hasViewedReport ? (
        <p className="text-muted-foreground mb-6">Select Single-day or Date-range and click View Report.</p>
      ) : showSingleDayReport && selectedReport ? (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {assignedClass.name} - {selectedReport.report_date}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={downloadSelectedReportPdf} className="gap-2">
                <Download className="h-3 w-3" /> Download PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 text-sm mb-4">
              <span>Students: <strong>{selectedReport.total_students}</strong></span>
              <span>Subjects: <strong>{selectedReport.total_subjects}</strong></span>
              <span>Avg Attendance: <strong>{selectedReport.avg_attendance_pct}%</strong></span>
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
                  {selectedReport.subject_breakdown.map(sb => (
                    <tr key={sb.subject_id} className="border-b last:border-0">
                      <td className="p-2">{sb.subject_name}</td>
                      <td className="p-2 text-success">{sb.present}</td>
                      <td className="p-2 text-danger">{sb.absent}</td>
                      <td className="p-2 font-semibold">{sb.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-muted-foreground mb-6">
          {showSingleDayReport ? 'No merged report available for selected date.' : 'Click Single-day View Report to view subject-wise day report.'}
        </p>
      )}

      {hasViewedReport && (
      <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Assessed Students"
          value={assessedStudents.length}
          icon={FileText}
          onClick={() => {
            setSelectedCard('assessed');
            document.getElementById('class-analytics')?.scrollIntoView({ behavior: 'smooth' });
          }}
          active={selectedCard === 'assessed'}
        />
        <StatCard
          title="Safe Students"
          value={safeStudents.length}
          icon={FileText}
          variant="success"
          onClick={() => {
            setSelectedCard('safe');
            document.getElementById('class-analytics')?.scrollIntoView({ behavior: 'smooth' });
          }}
          active={selectedCard === 'safe'}
        />
        <StatCard
          title="Defaulters (<75%)"
          value={classDefaulters.length}
          icon={FileText}
          variant="danger"
          onClick={() => {
            setSelectedCard('defaulters');
            document.getElementById('class-defaulters')?.scrollIntoView({ behavior: 'smooth' });
          }}
          active={selectedCard === 'defaulters'}
        />
      </div>

      <Card id="class-analytics" className="mb-6">
        <CardHeader><CardTitle className="text-base">Class Analytics ({reportLabel})</CardTitle></CardHeader>
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
                {studentRangeRows
                  .sort((a, b) => a.pct - b.pct)
                  .map((r) => (
                    <tr key={r.student.id} className="border-b last:border-0">
                      <td className="p-3 font-mono text-xs">{r.student.roll_number}</td>
                      <td className="p-3 font-medium">{r.student.name}</td>
                      <td className="p-3 font-semibold">{r.total === 0 ? '-' : `${r.pct}%`}</td>
                      <td className="p-3">{r.total === 0 ? <span className="text-muted-foreground text-xs">No Data</span> : <RiskBadge level={r.risk} />}</td>
                      <td className={`p-3 font-semibold ${r.status === 'Defaulter' ? 'text-danger' : r.status === 'Not Defaulter' ? 'text-success' : 'text-muted-foreground'}`}>
                        {r.status}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card id="class-defaulters">
        <CardHeader><CardTitle className="text-base">Defaulter Students of Your Class ({reportLabel})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="px-4 pt-4 pb-2 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={downloadDefaulterPdf}>
              <Download className="h-3.5 w-3.5" /> Download Defaulters PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={downloadNonDefaulterPdf}>
              <Download className="h-3.5 w-3.5" /> Download Non-Defaulters PDF
            </Button>
          </div>
          <p className="text-xs text-muted-foreground px-4 pb-3">
            Defaulters are calculated from attendance records for {reportMode === 'single' ? 'the selected day' : 'the selected date range'} across all subjects of {assignedClass.name}.
          </p>
          {classDefaulters.length === 0 ? (
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
                  {classDefaulters.map((r) => (
                    <tr key={r.student.id} className="border-b last:border-0">
                      <td className="p-3 font-mono text-xs">{r.student.roll_number}</td>
                      <td className="p-3 font-medium">{r.student.name}</td>
                      <td className="p-3 text-danger font-semibold">{r.pct}%</td>
                      <td className="p-3"><RiskBadge level={r.risk} /></td>
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
