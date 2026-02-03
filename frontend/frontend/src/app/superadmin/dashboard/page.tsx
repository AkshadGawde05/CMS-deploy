'use client';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, Users, DollarSign } from 'lucide-react';
import {
  getAllStudents,
  getAllCourses,
  getAllLectures,
  getEnquiries,
  getExams,
  getAllBatches,
  getAllPayments,
  getPaymentStats,
  getStudentPayments,
} from '@/lib/api';

interface DashboardData {
  students: number;
  fees: number;
  syllabus: number;
  enquiries: Array<{ month: string; count: number }>;
  lectures: Array<{ month: string; conducted: number; cancelled: number }>;
  tests: Array<{ month: string; conducted: number }>;
  courseWiseStudents: Array<{ name: string; students: number }>;
  courseWiseFees: Array<{ name: string; amount: number }>;
  upcomingBatches: Array<{ id: number; name: string; startDate: string; instructor: string; students: number }>;
  upcomingFees: Array<{ id: number; student: string; amount: number; dueDate: string; course?: string; installmentNo?: number }>;
  upcomingExams: Array<{ id: number; name: string; date: string; time: string; examType?: string; duration?: string }>;
  batchProgress: Array<{ name: string; progress: number }>;
  totalEnquiries: number;
  totalLectures: { conducted: number; cancelled: number; total: number };
  totalTests: number;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  // --- Dropdown/menu state & helpers ---
  const [menuState, setMenuState] = useState({
    enquiries: { isOpen: false, position: { top: 0, left: 0 } },
    lectures: { isOpen: false, position: { top: 0, left: 0 } },
    tests: { isOpen: false, position: { top: 0, left: 0 } },
  });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const toggleMenu = (chartType: 'enquiries' | 'lectures' | 'tests', event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 200;
    const top = rect.bottom + window.scrollY + 8;
    const leftRaw = rect.left + window.scrollX;
    const left = Math.min(Math.max(leftRaw, 8), Math.max(window.innerWidth - menuWidth - 8, 8));

    setMenuState(prev => ({
      enquiries: {
        isOpen: chartType === 'enquiries' ? !prev.enquiries.isOpen : false,
        position: chartType === 'enquiries' ? { top, left } : prev.enquiries.position
      },
      lectures: {
        isOpen: chartType === 'lectures' ? !prev.lectures.isOpen : false,
        position: chartType === 'lectures' ? { top, left } : prev.lectures.position
      },
      tests: {
        isOpen: chartType === 'tests' ? !prev.tests.isOpen : false,
        position: chartType === 'tests' ? { top, left } : prev.tests.position
      }
    }));
  };

  const closeAllMenus = () => {
    setMenuState({
      enquiries: { isOpen: false, position: { top: 0, left: 0 } },
      lectures: { isOpen: false, position: { top: 0, left: 0 } },
      tests: { isOpen: false, position: { top: 0, left: 0 } },
    });
  };

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (!(t instanceof Element)) { closeAllMenus(); return; }
      if (!t.closest('.three-line-button') && !t.closest('.dropdown-menu')) closeAllMenus();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function DropdownMenu({
    isOpen,
    position,
    onClose,
    onViewFullScreen,
    onPrintChart,
    onDownloadPNG,
    onDownloadJPEG,
    onDownloadSVG
  }: {
    isOpen: boolean;
    position: { top: number; left: number };
    onClose: () => void;
    onViewFullScreen: () => void;
    onPrintChart: () => void;
    onDownloadPNG: () => void;
    onDownloadJPEG: () => void;
    onDownloadSVG: () => void;
  }) {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      if (isOpen) document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const menu = (
      <div
        ref={ref}
        className="dropdown-menu absolute z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
        style={{ top: position.top, left: position.left }}
      >
        <button
          onClick={() => { onViewFullScreen(); onClose(); }}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          View in full screen
        </button>

        <button
          onClick={() => { onPrintChart(); onClose(); }}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Print chart
        </button>

        <div className="border-t border-gray-200 my-1" />

        <button
          onClick={() => { onDownloadPNG(); onClose(); }}
          className="flex justify-start items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
        >
          Download PNG image
        </button>

        <button
          onClick={() => { onDownloadJPEG(); onClose(); }}
          className="flex justify-start items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
        >
          Download JPEG image
        </button>

        <button
          onClick={() => { onDownloadSVG(); onClose(); }}
          className="flex justify-start items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
        >
          Download SVG vector image
        </button>
      </div>
    );

    return typeof document !== 'undefined' ? createPortal(menu, document.body) : null;
  }
  // --- end dropdown helpers ---

  // --- Chart export / fullscreen / print helpers ---
  const getChartNode = (chartType: 'enquiries' | 'lectures' | 'tests'): HTMLElement | null => {
    if (typeof document === 'undefined') return null;
    switch (chartType) {
      case 'enquiries': return document.getElementById('chart-enquiries');
      case 'lectures': return document.getElementById('chart-lectures');
      case 'tests': return document.getElementById('chart-tests');
      default: return null;
    }
  };

  const svgStringToCanvas = (svgString: string, width: number, height: number): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas context')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas);
      };
      img.onerror = (e) => reject(e);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    });
  };

  const elementToSVGString = (el: HTMLElement, width: number, height: number) => {
    const cloned = el.cloneNode(true) as HTMLElement;
    const serialized = new XMLSerializer().serializeToString(cloned);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%" xmlns="http://www.w3.org/1999/xhtml">${serialized}</foreignObject></svg>`;
  };

  const exportChartAsImage = async (chartType: 'enquiries' | 'lectures' | 'tests', mime: 'image/png' | 'image/jpeg', filenameBase?: string) => {
    const node = getChartNode(chartType);
    if (!node) { alert('Chart not found'); return; }

    const svgEl = node.querySelector('svg');
    try {
      if (svgEl) {
        // Export SVG directly
        const svgString = new XMLSerializer().serializeToString(svgEl as SVGElement);
        const svgGraphics = svgEl as unknown as SVGGraphicsElement;
        const bbox = svgGraphics.getBBox ? svgGraphics.getBBox() : { width: 500, height: 500 };
        const width = Math.ceil((svgEl as SVGElement).clientWidth || bbox.width || 600);
        const height = Math.ceil((svgEl as SVGElement).clientHeight || bbox.height || 600);
        const canvas = await svgStringToCanvas(svgString, width, height);
        const dataUrl = canvas.toDataURL(mime);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${filenameBase || chartType}.${mime === 'image/png' ? 'png' : 'jpg'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        // For HTML charts: create SVG with foreignObject
        const rect = node.getBoundingClientRect();
        const width = Math.max(200, Math.ceil(rect.width));
        const height = Math.max(200, Math.ceil(rect.height));
        const svgString = elementToSVGString(node as HTMLElement, width, height);
        const canvas = await svgStringToCanvas(svgString, width, height);
        const dataUrl = canvas.toDataURL(mime);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${filenameBase || chartType}.${mime === 'image/png' ? 'png' : 'jpg'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error('Export error', err);
      alert('Failed to export chart. See console for details.');
    }
  };

  const exportChartAsSVG = (chartType: 'enquiries' | 'lectures' | 'tests', filenameBase?: string) => {
    const node = getChartNode(chartType);
    if (!node) { alert('Chart not found'); return; }

    const svgEl = node.querySelector('svg');
    let svgString = '';
    if (svgEl) {
      svgString = new XMLSerializer().serializeToString(svgEl as SVGElement);
    } else {
      // wrap HTML into foreignObject svg
      const rect = node.getBoundingClientRect();
      const width = Math.max(200, Math.ceil(rect.width));
      const height = Math.max(200, Math.ceil(rect.height));
      svgString = elementToSVGString(node as HTMLElement, width, height);
    }

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenameBase || chartType}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Fullscreen modal
  const overlayId = 'chart-fullscreen-overlay';
  const showFullScreen = (chartType: 'enquiries' | 'lectures' | 'tests') => {
    const node = getChartNode(chartType);
    if (!node) { alert('Chart not found'); return; }

    // If overlay exists remove
    const existing = document.getElementById(overlayId);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.addEventListener('click', () => overlay.remove());

    const contentWrap = document.createElement('div');
    contentWrap.style.maxWidth = '95%';
    contentWrap.style.maxHeight = '95%';
    contentWrap.style.overflow = 'auto';
    contentWrap.style.background = 'white';
    contentWrap.style.borderRadius = '8px';
    contentWrap.style.padding = '12px';
    contentWrap.addEventListener('click', (e) => e.stopPropagation());

    // clone chart node
    const clone = node.cloneNode(true) as HTMLElement;
    clone.style.width = '100%';
    clone.style.height = '100%';
    contentWrap.appendChild(clone);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '16px';
    closeBtn.style.right = '20px';
    closeBtn.style.padding = '8px 12px';
    closeBtn.style.background = '#111827';
    closeBtn.style.color = 'white';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '6px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => overlay.remove());

    overlay.appendChild(contentWrap);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
  };

  const printChart = (chartType: 'enquiries' | 'lectures' | 'tests') => {
    const node = getChartNode(chartType);
    if (!node) { alert('Chart not found'); return; }
    const w = window.open('', '_blank');
    if (!w) { alert('Unable to open print window'); return; }
    const styles = Array.from(document.styleSheets)
      .map((s) => {
        try {
          return s.cssRules ? Array.from(s.cssRules).map(r => r.cssText).join('') : '';
        } catch {
          return '';
        }
      })
      .join('\n');
    const html = `
      <html>
        <head>
          <title>Print chart</title>
          <style> ${styles} body{ margin:16px; } </style>
        </head>
        <body>
          <div>${node.outerHTML}</div>
          <script>
            setTimeout(()=>{ window.print(); setTimeout(()=>window.close(), 100); }, 300);
          </script>
        </body>
      </html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  // Wire dropdown actions to these helpers
  const handleViewFullScreen = (chartType: 'enquiries' | 'lectures' | 'tests') => showFullScreen(chartType);
  const handlePrintChart = (chartType: 'enquiries' | 'lectures' | 'tests') => printChart(chartType);
  const handleDownloadPNG = (chartType: 'enquiries' | 'lectures' | 'tests') => exportChartAsImage(chartType, 'image/png');
  const handleDownloadJPEG = (chartType: 'enquiries' | 'lectures' | 'tests') => exportChartAsImage(chartType, 'image/jpeg');
  const handleDownloadSVG = (chartType: 'enquiries' | 'lectures' | 'tests') => exportChartAsSVG(chartType);

  // --- end chart helpers ---

  useEffect(() => {
    const formatMonth = (d: Date) => d.toLocaleString(undefined, { month: 'short' });
    const getMonthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
    const lastNMonths = (n = 6) => {
      const res: { key: string; label: string }[] = [];
      const now = new Date();
      for (let i = n - 1; i >= 0; i--) {
        const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
        res.push({ key: getMonthKey(dt), label: formatMonth(dt) });
      }
      return res;
    };

    const fetchData = async () => {
      const promises = [
        getAllStudents(),
        getAllCourses(),
        getAllLectures(),
        getEnquiries({ page: 1, limit: 1000 }),
        getExams(1, 1000),
        getAllBatches(),
        getAllPayments(),
        getPaymentStats(),
        getStudentPayments(), // Fee payments for students
      ];
      const keys = ['studentsRes','coursesRes','lecturesRes','enquiriesRes','examsRes','batchesRes','paymentsRes','paymentStatsRes','studentPaymentsRes'];
      const settled = await Promise.allSettled(promises);
      const results: Record<string, unknown> = {};
      settled.forEach((r, i) => {
        if (r.status === 'fulfilled') results[keys[i]] = r.value;
        else results[keys[i]] = null;
      });

      try {
        const studentsRes = results['studentsRes'];
        const coursesRes = results['coursesRes'];
        const lecturesRes = results['lecturesRes'];
        const enquiriesRes = results['enquiriesRes'];
        const examsRes = results['examsRes'];
        const batchesRes = results['batchesRes'];
        const paymentsRes = results['paymentsRes'];
        const paymentStatsRes = results['paymentStatsRes'];
        const studentPaymentsRes = results['studentPaymentsRes'];

        console.log('Dashboard Data Debug:', {
          paymentsCount: Array.isArray(paymentsRes) ? paymentsRes.length : (paymentsRes as Record<string, unknown>)?.payments ? ((paymentsRes as Record<string, unknown>).payments as unknown[]).length : (paymentsRes as Record<string, unknown>)?.data ? ((paymentsRes as Record<string, unknown>).data as unknown[]).length : 0,
          paymentStats: paymentStatsRes,
          paymentStatsUpcomingFees: (paymentStatsRes as Record<string, unknown>)?.upcomingFees,
          studentPaymentsCount: (studentPaymentsRes as Record<string, unknown>)?.paymentRecords ? ((studentPaymentsRes as Record<string, unknown>).paymentRecords as unknown[]).length : 0,
          studentPaymentsSample: (studentPaymentsRes as Record<string, unknown>)?.paymentRecords ? ((studentPaymentsRes as Record<string, unknown>).paymentRecords as unknown[])[0] : undefined,
          samplePayment: Array.isArray(paymentsRes) ? paymentsRes[0] : (paymentsRes as Record<string, unknown>)?.payments ? ((paymentsRes as Record<string, unknown>).payments as unknown[])[0] : (paymentsRes as Record<string, unknown>)?.data ? ((paymentsRes as Record<string, unknown>).data as unknown[])[0] : undefined
        });

        // Normalize responses
        const studentsArray = (Array.isArray(studentsRes) ? studentsRes : (studentsRes as Record<string, unknown>)?.data || (studentsRes as Record<string, unknown>)?.students || []) as Record<string, unknown>[];
        const coursesArray = (Array.isArray(coursesRes) ? coursesRes : (coursesRes as Record<string, unknown>)?.courses || (coursesRes as Record<string, unknown>)?.data || []) as Record<string, unknown>[];
        const lecturesArray = ((lecturesRes as Record<string, unknown>)?.lectures || (lecturesRes as Record<string, unknown>)?.data || []) as Record<string, unknown>[];
        const enquiriesArray = ((enquiriesRes as Record<string, unknown>)?.data || (enquiriesRes as Record<string, unknown>)?.enquiries || enquiriesRes || []) as Record<string, unknown>[];
        const examsArray = ((examsRes as Record<string, unknown>)?.exams || (examsRes as Record<string, unknown>)?.data || []) as Record<string, unknown>[];
        const batchesArray = (Array.isArray(batchesRes) ? batchesRes : (batchesRes as Record<string, unknown>)?.batches || (batchesRes as Record<string, unknown>)?.data || []) as Record<string, unknown>[];
        const paymentsArray = (Array.isArray(paymentsRes) ? paymentsRes : (paymentsRes as Record<string, unknown>)?.payments || (paymentsRes as Record<string, unknown>)?.data || []) as Record<string, unknown>[];
        const feePaymentsArray = ((studentPaymentsRes as Record<string, unknown>)?.paymentRecords || []) as Record<string, unknown>[];

        // Students
        const students = studentsArray.length || 0;

        // Fees: Calculate from actual fee payments (FeePayment model)
        let fees = 0;
        const courseWiseFeeCollected: Record<string, number> = {};
        
        // Use student fee payments (FeePayment model) - this is the actual fee collection data
        if (Array.isArray(feePaymentsArray) && feePaymentsArray.length > 0) {
          console.log('Processing fee payments:', feePaymentsArray.length);
          console.log('Sample payment structure:', JSON.stringify(feePaymentsArray[0], null, 2));
          
          feePaymentsArray.forEach((payment: Record<string, unknown>, index: number) => {
            const paidAmount = Number(payment.paid_amount || payment.amount_paid || payment.amount || 0);
            fees += paidAmount;
            
            // Determine course name by following relationships:
            // FeePayment → student_id → course_id OR
            // FeePayment → student_id.fee_plan → batch → course
            let courseName = 'Other';
            
            try {
              let studentData: Record<string, unknown> | string | undefined = (payment.student_id || payment.student) as Record<string, unknown> | string | undefined;
              
              // If student_id is just a string ID, look up the student in studentsArray
              if (typeof studentData === 'string') {
                const foundStudent = studentsArray.find((s: Record<string, unknown>) => 
                  s._id === studentData || s.id === studentData
                );
                if (foundStudent) {
                  studentData = foundStudent;
                  if (index === 0) console.log('Found student by ID lookup:', studentData);
                }
              }
              
              if (studentData && typeof studentData === 'object') {
                const studentObj = studentData as Record<string, unknown>;
                // First try: Direct course from student
                const courseData = studentObj.course_id || studentObj.course;
                
                if (courseData && typeof courseData === 'object' && (courseData as Record<string, unknown>).name) {
                  courseName = String((courseData as Record<string, unknown>).name);
                  if (index === 0) console.log('Course found via student.course_id (object):', courseName);
                } else if (typeof courseData === 'string') {
                  // Find course by ID in coursesArray
                  const course = coursesArray.find((c: Record<string, unknown>) => c._id === courseData || c.id === courseData);
                  if (course?.name) {
                    courseName = String(course.name);
                    if (index === 0) console.log('Course found via student.course_id (string lookup):', courseName);
                  }
                } else {
                  // Second try: Get course through fee_plan → batch → course
                  const feePlanData = studentObj.fee_plan;
                  if (feePlanData && typeof feePlanData === 'object') {
                    const feePlan = feePlanData as Record<string, unknown>;
                    const batchData = feePlan.batch_id || feePlan.batch;
                    
                    if (batchData && typeof batchData === 'object') {
                      const batchObj = batchData as Record<string, unknown>;
                      const batchCourseData = batchObj.course_id || batchObj.course;
                      
                      if (batchCourseData && typeof batchCourseData === 'object' && (batchCourseData as Record<string, unknown>).name) {
                        courseName = String((batchCourseData as Record<string, unknown>).name);
                        if (index === 0) console.log('Course found via fee_plan.batch_id.course_id (object):', courseName);
                      } else if (typeof batchCourseData === 'string') {
                        const course = coursesArray.find((c: Record<string, unknown>) => c._id === batchCourseData || c.id === batchCourseData);
                        if (course?.name) {
                          courseName = String(course.name);
                          if (index === 0) console.log('Course found via fee_plan.batch_id.course_id (string lookup):', courseName);
                        }
                      }
                    } else if (typeof batchData === 'string') {
                      // Find batch by ID and get course from it
                      const batch = batchesArray.find((b: Record<string, unknown>) => b._id === batchData || b.id === batchData);
                      if (batch) {
                        const batchCourse = batch.course_id || batch.course;
                        if (batchCourse && typeof batchCourse === 'object' && (batchCourse as Record<string, unknown>).name) {
                          courseName = String((batchCourse as Record<string, unknown>).name);
                          if (index === 0) console.log('Course found via fee_plan.batch_id (string lookup) → batch.course_id (object):', courseName);
                        } else if (typeof batchCourse === 'string') {
                          const course = coursesArray.find((c: Record<string, unknown>) => c._id === batchCourse || c.id === batchCourse);
                          if (course?.name) {
                            courseName = String(course.name);
                            if (index === 0) console.log('Course found via fee_plan.batch_id (string lookup) → batch.course_id (string lookup):', courseName);
                          }
                        }
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error determining course for payment:', error, payment);
            }
            
            if (index < 3) console.log(`Payment ${index + 1}: Amount=${paidAmount}, Course=${courseName}`);
            courseWiseFeeCollected[courseName] = (courseWiseFeeCollected[courseName] || 0) + paidAmount;
          });
          
          console.log('=== Fee Calculation Complete ===');
          console.log('Total fees:', fees);
          console.log('Course-wise breakdown:', courseWiseFeeCollected);
          console.log('Number of courses with fees:', Object.keys(courseWiseFeeCollected).length);
        }
        
        // Fallback: Try payment stats if available
        if (fees === 0 && paymentStatsRes && typeof paymentStatsRes === 'object') {
          const paymentStats = paymentStatsRes as Record<string, unknown>;
          const statsData = (paymentStats.stats || paymentStats) as Record<string, unknown>;
          const statsTotal = statsData?.collectedAmount || statsData?.total_collected || statsData?.totalCollected || statsData?.paid || 0;
          if (statsTotal && typeof statsTotal === 'number' && statsTotal > 0) {
            fees = Number(statsTotal);
          }
        }
        
        // Last fallback: generic payments
        if (fees === 0 && Array.isArray(paymentsArray) && paymentsArray.length > 0) {
          paymentsArray.forEach((p: Record<string, unknown>) => {
            const paidAmount = Number(p.paid_amount || p.amount_paid || p.amount || 0);
            fees += paidAmount;
          });
        }

        console.log('Total fees calculated:', fees, 'Course-wise breakdown:', courseWiseFeeCollected);

        // Debug lectures data
        console.log('=== Lectures Data ===');
        console.log('Total lectures:', lecturesArray.length);
        console.log('Sample lecture:', lecturesArray[0]);
        console.log('Lecture statuses:', lecturesArray.map((l: Record<string, unknown>) => l.status));
        
        // Syllabus progress: Will be calculated after batch progress as average of all batches
        const totalLectures = lecturesArray.length || 0;
        const completedLectures = (lecturesArray || []).filter((l: Record<string, unknown>) => l.status === 'completed').length || 0;
        let syllabus = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;

        // Last N months buckets
        const months = lastNMonths(6);
        const enquiriesByMonth = months.map((m) => ({ month: m.label, count: 0 }));
        const lecturesByMonth = months.map((m) => ({ month: m.label, conducted: 0, cancelled: 0 }));
        const testsByMonth = months.map((m) => ({ month: m.label, conducted: 0 }));
        const monthIndexMap: Record<string, number> = {};
        months.forEach((m, i) => (monthIndexMap[m.key] = i));

        // Enquiries grouping
        (enquiriesArray || []).forEach((e: Record<string, unknown>) => {
          const dateValue = e.created_at || e.createdAt || e.date || e.createdDate;
          if (!dateValue) return;
          const d = new Date(dateValue as string | number | Date);
          if (isNaN(d.getTime())) return;
          const key = getMonthKey(d);
          const idx = monthIndexMap[key];
          if (typeof idx === 'number') enquiriesByMonth[idx].count++;
        });

        // Lectures grouping
        (lecturesArray || []).forEach((l: Record<string, unknown>) => {
          const dateValue = l.date || l.lecture_start || l.created_at || l.createdAt;
          if (!dateValue) return;
          const d = new Date(dateValue as string | number | Date);
          if (isNaN(d.getTime())) return;
          const key = getMonthKey(d);
          const idx = monthIndexMap[key];
          if (typeof idx !== 'number') return;
          if (l.status === 'cancelled') lecturesByMonth[idx].cancelled++;
          else lecturesByMonth[idx].conducted++;
        });

        // Tests (exams) grouping
        (examsArray || []).forEach((ex: Record<string, unknown>) => {
          const dateValue = ex.date || ex.created_at || ex.createdAt;
          if (!dateValue) return;
          const d = new Date(dateValue as string | number | Date);
          if (isNaN(d.getTime())) return;
          const key = getMonthKey(d);
          const idx = monthIndexMap[key];
          if (typeof idx === 'number') testsByMonth[idx].conducted++;
        });

        // Course wise students & fees
        const courseWiseStudents = (coursesArray || []).map((c: Record<string, unknown>) => ({ 
          name: (c.name as string) || 'Unknown', 
          students: Number(c.students_count || c.studentCount) || 0 
        }));
        
        // Course wise fees - use ONLY actual collected fees from payments
        // Map courses and use collected amount or 0 if no payments for that course
        const courseWiseFees = (coursesArray || []).map((c: Record<string, unknown>) => {
          const courseName = (c.name as string) || 'Unknown';
          // Use actual collected fees from payment records, default to 0 if none
          const collectedAmount = courseWiseFeeCollected[courseName] || 0;
          
          console.log(`Mapping course "${courseName}": collected=${collectedAmount}, in courseWiseFeeCollected=${courseName in courseWiseFeeCollected}`);
          
          return { 
            name: courseName, 
            amount: collectedAmount
          };
        });
        
        console.log('=== Final courseWiseFees array ===', courseWiseFees);
        
        // Ensure total fees matches sum of course-wise fees
        const sumOfCourseWiseFees = courseWiseFees.reduce((sum, course) => sum + course.amount, 0);
        if (Math.abs(sumOfCourseWiseFees - fees) > 0.01 && sumOfCourseWiseFees > 0) {
          console.warn('Fee mismatch: Total fees:', fees, 'vs Sum of course-wise:', sumOfCourseWiseFees);
          // Use the sum of course-wise fees as the authoritative total
          fees = sumOfCourseWiseFees;
        }

        // Calculate batch progress from lectures for ALL batches (not just first 3)
        const allBatchProgress = (batchesArray || []).map((b: Record<string, unknown>) => {
          // Get lectures for this batch (if lecture data includes batch_id)
          const batchLectures = lecturesArray.filter((l: Record<string, unknown>) => 
            l.batch_id === b._id || 
            l.batch === b._id || 
            (l.batch_id as Record<string, unknown>)?._id === b._id ||
            l.batch_id === (b._id as string) ||
            l.batch === (b._id as string)
          );
          const completedBatchLectures = batchLectures.filter((l: Record<string, unknown>) => l.status === 'completed').length;
          const progress = batchLectures.length > 0 
            ? Math.round((completedBatchLectures / batchLectures.length) * 100)
            : 0;
          
          console.log(`Batch "${b.name}": ${completedBatchLectures}/${batchLectures.length} lectures completed = ${progress}%`);
          
          return {
            name: (b.name as string) || 'Unnamed Batch',
            progress,
            totalLectures: batchLectures.length,
            completedLectures: completedBatchLectures
          };
        });
        
        // Display only first 3 batches in the UI
        const batchProgress = allBatchProgress.slice(0, 3);
        
        // Calculate overall progress as average of all batch progress values
        // This gives equal weight to each batch regardless of lecture count
        if (allBatchProgress.length > 0) {
          const totalBatchProgress = allBatchProgress.reduce((sum, batch) => sum + batch.progress, 0);
          syllabus = Math.round(totalBatchProgress / allBatchProgress.length);
          console.log(`Overall Progress: Average of ${allBatchProgress.length} batches = ${syllabus}%`);
        } else {
          // Fallback: Use global lecture completion percentage
          console.log(`Overall Progress: Global calculation (${completedLectures}/${totalLectures}) = ${syllabus}%`);
        }

        // Calculate totals for charts
        const totalEnquiries = enquiriesByMonth.reduce((sum, month) => sum + month.count, 0);
        const totalConductedLectures = lecturesByMonth.reduce((sum, month) => sum + month.conducted, 0);
        const totalCancelledLectures = lecturesByMonth.reduce((sum, month) => sum + month.cancelled, 0);
        const totalTests = testsByMonth.reduce((sum, month) => sum + month.conducted, 0);

        // Upcoming batches
        const upcomingBatches = (batchesArray || []).slice(0, 5).map((b: Record<string, unknown>, idx: number) => {
          let startDate = 'TBD';
          try {
            const s = typeof b.schedule === 'string' ? JSON.parse(b.schedule) : b.schedule;
            if (s) {
              const scheduleObj = s as Record<string, unknown>;
              const dateVal = scheduleObj.startDate || scheduleObj.start_date || scheduleObj.startsAt;
              if (dateVal && typeof dateVal === 'string') startDate = dateVal;
            }
          } catch {
            // Ignore parse errors
          }
          return { 
            id: Number(b._id || b.id || idx), 
            name: (b.name as string) || 'Unnamed', 
            startDate, 
            instructor: 'TBD',
            students: Number(b.students_count || b.number_of_students) || 0 
          };
        });

        // Upcoming fees: Get from payment stats which now includes upcoming installments
        const upcomingFeesData = ((paymentStatsRes as Record<string, unknown>)?.upcomingFees || []) as Record<string, unknown>[];
        console.log('Upcoming fees from API:', upcomingFeesData);
        
        const upcomingFees = upcomingFeesData.map((fee: Record<string, unknown>, idx: number) => ({
          id: Number(fee.student_id) || idx,
          student: String(fee.student_name || 'Unknown Student'),
          amount: Number(fee.remaining_amount || 0),
          dueDate: fee.due_date ? new Date(fee.due_date as string | number | Date).toLocaleDateString() : 'TBD',
          course: fee.course_name ? String(fee.course_name) : undefined,
          installmentNo: fee.installment_no ? Number(fee.installment_no) : undefined
        }));

        // Upcoming exams: future exams sorted
        const now = new Date();
        const upcomingExams = (examsArray || [])
          .filter((ex: Record<string, unknown>) => {
            const dateValue = ex.date || ex.created_at || ex.createdAt;
            if (!dateValue) return false;
            const d = new Date(dateValue as string | number | Date);
            return !isNaN(d.getTime()) && d >= now;
          })
          .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
            const aDate = new Date((a.date as string) || 0).getTime();
            const bDate = new Date((b.date as string) || 0).getTime();
            return aDate - bDate;
          })
          .slice(0, 5)
          .map((ex: Record<string, unknown>, idx: number) => {
            // Format exam type for display
            const examType = ex.exam_type as string || '';
            const formattedType = examType 
              ? examType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              : undefined;
            
            return {
              id: Number(ex._id) || idx, 
              name: String(ex.topic || ex.subject || ex.name || 'Exam'),  
              date: ex.date ? new Date(ex.date as string).toLocaleDateString() : 'TBD', 
              time: ex.time ? String(ex.time) : 'TBD',
              examType: formattedType,
              duration: ex.duration ? String(ex.duration) : undefined
            };
          });

        setData({
          students,
          fees,
          syllabus,
          enquiries: enquiriesByMonth,
          lectures: lecturesByMonth,
          tests: testsByMonth,
          courseWiseStudents,
          courseWiseFees,
          batchProgress,
          totalEnquiries,
          totalLectures: {
            conducted: totalConductedLectures,
            cancelled: totalCancelledLectures,
            total: totalConductedLectures + totalCancelledLectures
          },
          totalTests,
          upcomingBatches,
          upcomingFees,
          upcomingExams,
        });
      } catch (error) {
        console.error('Dashboard fetch error', error);
        // Set default data on error
        setData({
          students: 0,
          fees: 0,
          syllabus: 0,
          enquiries: [],
          lectures: [],
          tests: [],
          courseWiseStudents: [],
          courseWiseFees: [],
          batchProgress: [],
          totalEnquiries: 0,
          totalLectures: { conducted: 0, cancelled: 0, total: 0 },
          totalTests: 0,
          upcomingBatches: [],
          upcomingFees: [],
          upcomingExams: [],
        });
      }
    };

    fetchData();
  }, []);

  if (!data) return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="pt-20 pb-8 px-6 lg:px-8 mx-auto overflow-y-auto h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100" ref={containerRef}>
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome back! Here&apos;s what&apos;s happening with your institution today.</p>
      </div>

      {/* Top Row - Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Students Card */}
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 group">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Total Students</h3>
              <p className="text-xs text-gray-500 mt-1">Active enrollments</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg group-hover:bg-blue-100 transition-colors duration-300">
              <Users className="text-blue-600" size={28} />
            </div>
          </div>
          <div className="space-y-3 mb-5">
            {data.courseWiseStudents.length > 0 ? (
              data.courseWiseStudents.map((course: { name: string; students: number }) => (
                <div key={course.name} className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                  <span className="text-sm text-gray-700 font-medium">{course.name}</span>
                  <span className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full text-xs">{course.students}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No course data available</p>
            )}
          </div>
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Total Count</span>
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">{data.students}</span>
            </div>
          </div>
        </div>

        {/* Fees Collected Card */}
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 group">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Fees Collected</h3>
              <p className="text-xs text-gray-500 mt-1">Revenue overview</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg group-hover:bg-green-100 transition-colors duration-300">
              <DollarSign className="text-green-600" size={28} />
            </div>
          </div>
          <div className="space-y-3 mb-5">
            {data.courseWiseFees.length > 0 ? (
              data.courseWiseFees.map((course: { name: string; amount: number }) => (
                <div key={course.name} className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                  <span className="text-sm text-gray-700 font-medium">{course.name}</span>
                  <span className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full text-xs">₹{course.amount.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No fee data available</p>
            )}
          </div>
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Total Sum</span>
              <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">₹{data.fees.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Syllabus Progress Card */}
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 group">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Syllabus Progress</h3>
              <p className="text-xs text-gray-500 mt-1">Course completion status</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg group-hover:bg-purple-100 transition-colors duration-300">
              <TrendingUp className="text-purple-600" size={28} />
            </div>
          </div>
          <div className="space-y-4">
            {data.batchProgress.length > 0 ? (
              data.batchProgress.map((item, index) => (
                <div key={index} className="group/item relative">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-700 font-medium">{item.name}</span>
                    <span className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full">{item.progress}%</span>
                  </div>
                  <div 
                    className="w-full bg-gray-200 rounded-full h-3 cursor-pointer relative overflow-hidden"
                    onMouseEnter={(e) => {
                      const tooltip = e.currentTarget.querySelector('.tooltip');
                      if (tooltip) tooltip.classList.remove('opacity-0');
                    }}
                    onMouseLeave={(e) => {
                      const tooltip = e.currentTarget.querySelector('.tooltip');
                      if (tooltip) tooltip.classList.add('opacity-0');
                    }}
                  >
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ease-out ${
                        item.progress >= 80
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                          : item.progress >= 60
                          ? 'bg-gradient-to-r from-green-500 to-green-600'
                          : 'bg-gradient-to-r from-purple-500 to-purple-600'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    >
                      {/* Tooltip */}
                      <div className="tooltip absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 transition-opacity duration-300 bg-gray-900 text-white text-xs px-3 py-2 rounded-md whitespace-nowrap shadow-xl flex items-center gap-2 z-10">
                        <span className="w-2 h-2 bg-white rounded-full"></span>
                        <span>{item.name}: {item.progress}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No batch progress data</p>
            )}
            {/* Overall syllabus progress */}
            <div className="pt-3 border-t border-gray-200 group/item relative">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-gray-900">Overall Progress</span>
                <span className="text-sm font-bold text-gray-900 bg-purple-100 px-3 py-1 rounded-full">{data.syllabus}%</span>
              </div>
              <div 
                className="w-full bg-gray-200 rounded-full h-3 cursor-pointer relative overflow-hidden"
                onMouseEnter={(e) => {
                  const tooltip = e.currentTarget.querySelector('.tooltip');
                  if (tooltip) tooltip.classList.remove('opacity-0');
                }}
                onMouseLeave={(e) => {
                  const tooltip = e.currentTarget.querySelector('.tooltip');
                  if (tooltip) tooltip.classList.add('opacity-0');
                }}
              >
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                  style={{ width: `${data.syllabus}%` }}
                >
                  {/* Tooltip */}
                  <div className="tooltip absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 transition-opacity duration-300 bg-gray-900 text-white text-xs px-3 py-2 rounded-md whitespace-nowrap shadow-xl flex items-center gap-2 z-10">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span>Overall: {data.syllabus}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Monthly Enquiries Chart */}
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Monthly Enquiries</h3>
              <p className="text-xs text-gray-500 mt-1">Current month vs total</p>
            </div>
            <button
              onClick={(e) => toggleMenu('enquiries', e)}
              className="text-2xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-all duration-200 cursor-pointer focus:outline-none relative three-line-button"
            >
              ≡
            </button>

            <DropdownMenu
              isOpen={menuState.enquiries.isOpen}
              position={menuState.enquiries.position}
              onClose={closeAllMenus}
              onViewFullScreen={() => handleViewFullScreen('enquiries')}
              onPrintChart={() => handlePrintChart('enquiries')}
              onDownloadPNG={() => handleDownloadPNG('enquiries')}
              onDownloadJPEG={() => handleDownloadJPEG('enquiries')}
              onDownloadSVG={() => handleDownloadSVG('enquiries')}
            />
          </div>
          <div className="relative flex h-64">

            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pl-2 pt-2 pb-6 ">
              {[15, 10, 5, 0].map((_, i) => (
                <div
                  key={i}
                  className="border-t border-gray-200 w-full"
                ></div>
              ))}
            </div>

            {/* Y Axis */}
            <div className="relative z-10 flex flex-col justify-between items-end pr-4 text-sm text-gray-500 py-2">
              <span>15</span>
              <span>10</span>
              <span>5</span>
              <span className="mb-3">0</span>
            </div>

            {/* Y Axis Heading */}
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-medium text-gray-600">
              Enquiries
            </div>

            {/* Bars */}
            <div className="relative z-10 flex items-end justify-center h-full gap-8 flex-1">
              {(() => {
                const thisMonthCount =
                  data.enquiries[data.enquiries.length - 1]?.count || 0;
                const totalCount = data.totalEnquiries;

                const maxValue = Math.max(thisMonthCount, totalCount, 15);

                const thisMonthHeight = (thisMonthCount / maxValue) * 180;
                const totalHeight = (totalCount / maxValue) * 180;

                return (
                  <>
                    {/* This Month */}
                    <div className="relative flex flex-col items-center group">
                      <div
                        className="w-14 bg-gradient-to-t from-blue-600 to-blue-500 rounded-t transition-all duration-300 cursor-pointer hover:from-blue-700 hover:to-blue-600 shadow-lg"
                        style={{ height: `${thisMonthHeight}px` }}
                        onMouseEnter={(e) => {
                          const tooltip = e.currentTarget.querySelector('.tooltip');
                          if (tooltip) tooltip.classList.remove('opacity-0');
                        }}
                        onMouseLeave={(e) => {
                          const tooltip = e.currentTarget.querySelector('.tooltip');
                          if (tooltip) tooltip.classList.add('opacity-0');
                        }}
                      >
                        {/* Tooltip */}
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 
                                opacity-0 group-hover:opacity-100 
                                transition-opacity duration-300
                                bg-gray-900 text-white text-xs 
                                px-4 py-2 rounded-lg shadow-xl 
                                whitespace-nowrap z-10">
                          <p className="text-[10px] text-gray-300 mb-1">
                            This Month
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                            <span className="text-sm font-bold">
                              {thisMonthCount} Enquiries
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 font-medium mt-3">This Month</p>
                    </div>

                    {/* Total */}
                    <div className="relative flex flex-col items-center group">
                      <div
                        className="w-14 bg-gradient-to-t from-blue-600 to-blue-500 rounded-t transition-all duration-300 cursor-pointer hover:from-blue-700 hover:to-blue-600 shadow-lg"
                        style={{ height: `${totalHeight}px` }}
                        onMouseEnter={(e) => {
                          const tooltip = e.currentTarget.querySelector('.tooltip');
                          if (tooltip) tooltip.classList.remove('opacity-0');
                        }}
                        onMouseLeave={(e) => {
                          const tooltip = e.currentTarget.querySelector('.tooltip');
                          if (tooltip) tooltip.classList.add('opacity-0');
                        }}
                      >
                        {/* Tooltip */}
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 
                                opacity-0 group-hover:opacity-100 
                                transition-opacity duration-300
                                bg-gray-900 text-white text-xs 
                                px-4 py-2 rounded-lg shadow-xl 
                                whitespace-nowrap z-10">
                          <p className="text-[10px] text-gray-300 mb-1">
                            Total
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                            <span className="text-sm font-bold">
                              {totalCount} Enquiries
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 font-medium mt-3">Total</p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
          <div className="mt-6 flex justify-center">
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-700 font-semibold leading-none">
                Enquiries
              </span>
            </div>
          </div>
        </div>

        {/* Lectures Status Pie Chart */}
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Lectures Status</h3>
              <p className="text-xs text-gray-500 mt-1">Conducted vs cancelled</p>
            </div>
            <button
              onClick={(e) => toggleMenu('lectures', e)}
              className="text-2xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-all duration-200 cursor-pointer focus:outline-none relative three-line-button"
            >
              ≡
            </button>

            <DropdownMenu
              isOpen={menuState.lectures.isOpen}
              position={menuState.lectures.position}
              onClose={closeAllMenus}
              onViewFullScreen={() => handleViewFullScreen('lectures')}
              onPrintChart={() => handlePrintChart('lectures')}
              onDownloadPNG={() => handleDownloadPNG('lectures')}
              onDownloadJPEG={() => handleDownloadJPEG('lectures')}
              onDownloadSVG={() => handleDownloadSVG('lectures')}
            />
          </div>
          
          <div className="flex flex-col items-center justify-center h-64">
            <div id="chart-lectures" className="relative w-52 h-52 group">
              {/* Glow effect container */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="glow-effect w-60 h-60 rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-300 ease-out"
                  style={{
                    background: data.totalLectures.conducted === data.totalLectures.total 
                      ? 'radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, rgba(16, 185, 129, 0) 70%)'
                      : `radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(239, 68, 68, 0.3) 50%, rgba(16, 185, 129, 0) 70%)`
                  }}
                />
              </div>

              {/* Circle chart with hover lift effect */}
              <div className="relative transition-transform duration-300 ease-out group-hover:-translate-y-2 group-hover:scale-105">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 drop-shadow-lg">
                  <defs>
                    <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#EF4444" />
                      <stop offset="100%" stopColor="#DC2626" />
                    </linearGradient>
                  </defs>
                  
                  {data.totalLectures.total === 0 ? (
                    <>
                      <circle cx="50" cy="50" r="35" fill="none" stroke="#E5E7EB" strokeWidth="12" />
                    </>
                  ) : data.totalLectures.conducted === data.totalLectures.total ? (
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="35" 
                      fill="none"
                      stroke="url(#greenGradient)"
                      strokeWidth="12"
                      strokeDasharray="220 220"
                      className="transition-all duration-300"
                    />
                  ) : (
                    <>
                      {/* Background circle */}
                      <circle cx="50" cy="50" r="35" fill="none" stroke="#F3F4F6" strokeWidth="12" />
                      
                      {/* Conducted arc */}
                      <circle
                        cx="50"
                        cy="50"
                        r="35"
                        fill="none"
                        stroke="url(#greenGradient)"
                        strokeWidth="12"
                        strokeLinecap="round"
                        pathLength="100"
                        strokeDasharray={`${(data.totalLectures.conducted / data.totalLectures.total) * 100} 100`}
                        className="transition-all duration-500"
                      />
                      
                      {/* Cancelled arc */}
                      {data.totalLectures.cancelled > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="35"
                          fill="none"
                          stroke="url(#redGradient)"
                          strokeWidth="12"
                          strokeLinecap="round"
                          pathLength="100"
                          strokeDasharray={`${(data.totalLectures.cancelled / data.totalLectures.total) * 100} 100`}
                          strokeDashoffset={`-${(data.totalLectures.conducted / data.totalLectures.total) * 100}`}
                          className="transition-all duration-500"
                        />
                      )}
                    </>
                  )}
                </svg>
                
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-gray-900">{data.totalLectures.total}</div>
                  <div className="text-xs text-gray-500 font-medium">Total</div>
                </div>
              </div>

              {/* Conducted Tooltip */}
              <div className="conducted-tooltip absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gray-900 text-white text-xs px-4 py-2 rounded-lg shadow-xl whitespace-nowrap z-10">
                <p className="text-[10px] text-gray-300 mb-1">
                  Conducted
                </p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                  <span className="text-sm font-bold">
                    {data.totalLectures.conducted} Lectures
                  </span>
                </div>
              </div>
              
              {/* Cancelled Tooltip */}
              {data.totalLectures.cancelled > 0 && (
                <div className="cancelled-tooltip absolute -bottom-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gray-900 text-white text-xs px-4 py-2 rounded-lg shadow-xl whitespace-nowrap z-10">
                  <p className="text-[10px] text-gray-300 mb-1">
                    Cancelled
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
                    <span className="text-sm font-bold">
                      {data.totalLectures.cancelled} Lectures
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex justify-center gap-4">
            <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
              <div className="w-3 h-3 bg-gradient-to-br from-green-500 to-green-600 rounded-full"></div>
              <div className="text-sm">
                <span className="text-gray-600 font-medium">Conducted: </span>
                <span className="text-gray-900 font-bold">{data.totalLectures.conducted}</span>
              </div>
            </div>
            {data.totalLectures.cancelled > 0 && (
              <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-lg">
                <div className="w-3 h-3 bg-gradient-to-br from-red-500 to-red-600 rounded-full"></div>
                <div className="text-sm">
                  <span className="text-gray-600 font-medium">Cancelled: </span>
                  <span className="text-gray-900 font-bold">{data.totalLectures.cancelled}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tests Conducted Chart */}
        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Tests Conducted</h3>
              <p className="text-xs text-gray-500 mt-1">Total examinations</p>
            </div>
            <button
              onClick={(e) => toggleMenu('tests', e)}
              className="text-2xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-all duration-200 cursor-pointer focus:outline-none relative three-line-button"
            >
              ≡
            </button>

            <DropdownMenu
              isOpen={menuState.tests.isOpen}
              position={menuState.tests.position}
              onClose={closeAllMenus}
              onViewFullScreen={() => handleViewFullScreen('tests')}
              onPrintChart={() => handlePrintChart('tests')}
              onDownloadPNG={() => handleDownloadPNG('tests')}
              onDownloadJPEG={() => handleDownloadJPEG('tests')}
              onDownloadSVG={() => handleDownloadSVG('tests')}
            />
          </div>

          {/* Graph */}
          <div id="chart-tests" className="relative">
            {/* Main visual - Big number with circular progress */}
            <div className="flex flex-col items-center justify-center py-6 mb-6">
              <div className="relative w-40 h-40">
                {/* Background circle */}
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#F3F4F6"
                    strokeWidth="8"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="url(#purpleGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    pathLength="100"
                    strokeDasharray={`${Math.min((data.totalTests / 50) * 100, 100)} 100`}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#A855F7" />
                      <stop offset="100%" stopColor="#7C3AED" />
                    </linearGradient>
                  </defs>
                </svg>
                
                {/* Center number */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                    {data.totalTests}
                  </div>
                  <div className="text-xs text-gray-500 font-semibold mt-1">Tests</div>
                </div>
              </div>
            </div>

            {/* Bar visualization */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700 w-20">Conducted</span>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative group">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg transition-all duration-1000 ease-out relative overflow-hidden"
                    style={{
                      width: `${Math.min((data.totalTests / 50) * 100, 100)}%`,
                    }}
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                  </div>
                  {/* Tooltip on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-xs font-bold text-white drop-shadow-lg">{data.totalTests} Tests</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-purple-700 w-12 text-right">{data.totalTests}</span>
              </div>
              
              {/* Scale reference */}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs text-gray-400 w-20">Scale</span>
                <div className="flex-1 flex justify-between text-[10px] text-gray-400 font-medium px-1">
                  <span>0</span>
                  <span>10</span>
                  <span>20</span>
                  <span>30</span>
                  <span>40</span>
                  <span>50+</span>
                </div>
                <span className="w-12"></span>
              </div>
            </div>
          </div>

          {/* Footer stats */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 bg-purple-50 px-4 py-2 rounded-lg">
              <div className="w-3 h-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full"></div>
              <span className="text-sm text-gray-700 font-semibold">
                Total Examinations Conducted
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Cards with Scrolling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
        {/* Upcoming Batches */}
        {data.upcomingBatches.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Upcoming Batches</h3>
              <p className="text-xs text-gray-500 mt-1">Starting soon</p>
            </div>
            <div className="space-y-4">
              {data.upcomingBatches.map((batch) => (
                <div key={batch.id} className="p-4 rounded-lg bg-gray-50 hover:bg-blue-50 transition-all duration-200 border border-gray-200 hover:border-blue-200">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-sm mb-1">{batch.name}</h4>
                      <p className="text-xs text-gray-600">Starts: <span className="font-semibold text-gray-800">{batch.startDate}</span></p>
                    </div>
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
                      {batch.students} Students
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Upcoming Batches</h3>
              <p className="text-xs text-gray-500 mt-1">Starting soon</p>
            </div>
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Users className="text-gray-400" size={32} />
              </div>
              <p className="text-gray-500 text-sm font-medium">No upcoming batches</p>
            </div>
          </div>
        )}

        {/* Upcoming Fees */}
        {data.upcomingFees.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Upcoming Fees</h3>
              <p className="text-xs text-gray-500 mt-1">Installments due in next 10 days</p>
            </div>
            <div className="space-y-4">
              {data.upcomingFees.map((fee) => (
                <div key={fee.id} className="p-4 rounded-lg bg-gray-50 hover:bg-red-50 transition-all duration-200 border border-gray-200 hover:border-red-200">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm mb-1 truncate">{fee.student}</h4>
                      {fee.course && (
                        <p className="text-xs text-gray-500 mb-1 truncate">{fee.course}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="font-medium">Installment #{fee.installmentNo}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-lg font-bold text-red-600 whitespace-nowrap">₹{fee.amount.toLocaleString()}</span>
                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                        Due: {fee.dueDate}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Upcoming Fees</h3>
              <p className="text-xs text-gray-500 mt-1">Installments due in next 10 days</p>
            </div>
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <DollarSign className="text-gray-400" size={32} />
              </div>
              <p className="text-gray-500 text-sm font-medium">No upcoming fees</p>
            </div>
          </div>
        )}

        {/* Upcoming Exams */}
        {data.upcomingExams.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Upcoming Exams</h3>
              <p className="text-xs text-gray-500 mt-1">Scheduled tests</p>
            </div>
            <div className="space-y-4">
              {data.upcomingExams.map((exam) => (
                <div key={exam.id} className="p-4 rounded-lg bg-gray-50 hover:bg-orange-50 transition-all duration-200 border border-gray-200 hover:border-orange-200">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-sm mb-1">{exam.name}</h4>
                      <p className="text-xs text-gray-600">Date: <span className="font-semibold text-gray-800">{exam.date}</span></p>
                    </div>
                    <div className="flex gap-2">
                      <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
                        {exam.examType}
                      </span>
                      {exam.duration && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
                          {exam.duration}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Upcoming Exams</h3>
              <p className="text-xs text-gray-500 mt-1">Scheduled tests</p>
            </div>
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <TrendingUp className="text-gray-400" size={32} />
              </div>
              <p className="text-gray-500 text-sm font-medium">No upcoming exams</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}