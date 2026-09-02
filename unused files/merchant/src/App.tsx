import { useMemo, useState } from 'react';
import { advancePrintStatus, createPrintQueueItem, getPrintableQueue } from './lib/printing';
import { createPaymentEvent, summarizePaymentState, verifyCashPayment, verifyUpiPayment } from './lib/payments';
import { buildVerificationCode, isValidEmail, normalizePhone, type SetupSubmitData } from '../../shared/src';

type NavKey = 'jobs' | 'completed' | 'payments' | 'printers' | 'settings' | 'history';
type Job = {
  id: string;
  customer: string;
  pages: string;
  status: 'Queued' | 'Printing' | 'Verified';
  method: 'Cash' | 'UPI';
};

const sampleJobs: Job[] = [
  { id: 'QRT-1024', customer: 'Asha', pages: '12 pages', status: 'Queued', method: 'Cash' },
  { id: 'QRT-1025', customer: 'Rohan', pages: '7 pages', status: 'Printing', method: 'UPI' },
  { id: 'QRT-1026', customer: 'Nina', pages: '5 pages', status: 'Verified', method: 'Cash' }
];

const navItems: { key: NavKey; label: string }[] = [
  { key: 'jobs', label: 'Active Print Jobs' },
  { key: 'completed', label: 'Completed Orders' },
  { key: 'payments', label: 'Payment Verification Queue' },
  { key: 'printers', label: 'Printer Status & Management' },
  { key: 'settings', label: 'Store Settings' },
  { key: 'history', label: 'Order History' }
];

const printers = [
  { id: 'usb-01', name: 'Brother DCP-L2540DW', type: 'USB' },
  { id: 'net-01', name: 'HP LaserJet 4V', type: 'Network' },
  { id: 'bt-01', name: 'Canon SELPHY', type: 'Bluetooth' }
];

const emptyForm: SetupSubmitData = {
  storeName: '',
  ownerName: '',
  mobileNumber: '',
  emailId: '',
  printerId: printers[0].id
};

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState<NavKey>('jobs');
  const [setupComplete, setSetupComplete] = useState(false);
  const [form, setForm] = useState<SetupSubmitData>(emptyForm);
  const [authAccepted, setAuthAccepted] = useState(false);
  const [queue, setQueue] = useState(() => [
    createPrintQueueItem({
      storeId: 'store-01',
      fileName: 'quarterly-report.pdf',
      mimeType: 'application/pdf',
      colorMode: 'bw',
      copies: 2,
      pageRange: '1-10',
      paymentMethod: 'cash',
      customerName: 'Asha',
    }, 'Asha'),
    createPrintQueueItem({
      storeId: 'store-01',
      fileName: 'pitch-deck.pptx',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      colorMode: 'color',
      copies: 1,
      pageRange: '2-8',
      paymentMethod: 'upi',
      customerName: 'Rohan',
    }, 'Rohan')
  ]);
  const [payments, setPayments] = useState(() => [
    createPaymentEvent('QRT-1001', 120, 'cash', '9876543210'),
    createPaymentEvent('QRT-1002', 260, 'upi', '9123456780')
  ]);

  const summary = useMemo(() => ({
    queued: queue.filter(job => job.status === 'queued').length,
    printing: queue.filter(job => job.status === 'printing').length,
    verified: queue.filter(job => job.status === 'verified').length
  }), [queue]);

  const paymentSummary = useMemo(() => summarizePaymentState(payments), [payments]);

  const handleAdvanceQueue = () => {
    setQueue(previous => previous.map((job, index) => index === 0 ? { ...job, status: advancePrintStatus(job.status) } : job));
  };

  const handleCashVerify = () => {
    const result = verifyCashPayment('48273195');
    if (result.ok) {
      setPayments(prev => prev.map((payment, index) => index === 0 ? { ...payment, status: 'verified' } : payment));
    }
  };

  const handleUpiVerify = () => {
    const result = verifyUpiPayment('rzp_test_1234567890_sig');
    if (result.ok) {
      setPayments(prev => prev.map((payment, index) => index === 1 ? { ...payment, status: 'verified' } : payment));
    }
  };

  const canSubmitSetup =
    form.storeName.trim().length > 1 &&
    form.ownerName.trim().length > 1 &&
    normalizePhone(form.mobileNumber).length >= 10 &&
    isValidEmail(form.emailId) &&
    authAccepted;

  const handleSetupSubmit = () => {
    if (!canSubmitSetup) return;
    setSetupComplete(true);
  };

  if (!setupComplete) {
    return (
      <div className="setup-shell">
        <div className="setup-card">
          <div className="setup-header">
            <div className="brand-badge">Q</div>
            <div>
              <p className="eyebrow">Merchant onboarding</p>
              <h1>QRPrint local setup</h1>
            </div>
          </div>

          <div className="setup-step">
            <h2>1. Admin authentication</h2>
            <label className="auth-toggle">
              <input type="checkbox" checked={authAccepted} onChange={e => setAuthAccepted(e.target.checked)} />
              <span>I am the authorized administrator for this PC</span>
            </label>
          </div>

          <div className="setup-step">
            <h2>2. Who are you?</h2>
            <div className="field-grid">
              <label className="form-field">
                <span>Store name</span>
                <input value={form.storeName} onChange={e => setForm({ ...form, storeName: e.target.value })} />
              </label>

              <label className="form-field">
                <span>Owner name</span>
                <input value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} />
              </label>

              <label className="form-field">
                <span>Mobile number</span>
                <input value={form.mobileNumber} onChange={e => setForm({ ...form, mobileNumber: normalizePhone(e.target.value) })} />
              </label>

              <label className="form-field">
                <span>Email ID</span>
                <input type="email" value={form.emailId} onChange={e => setForm({ ...form, emailId: e.target.value })} />
              </label>

              <label className="form-field full-width">
                <span>Printer selection</span>
                <select value={form.printerId} onChange={e => setForm({ ...form, printerId: e.target.value })}>
                  {printers.map(printer => (
                    <option key={printer.id} value={printer.id}>{printer.name} ({printer.type})</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <button className="primary-button full" disabled={!canSubmitSetup} onClick={handleSetupSubmit}>
            Complete setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="merchant-shell">
      <aside className={collapsed ? 'merchant-sidebar collapsed' : 'merchant-sidebar'}>
        <div className="brand-row">
          <div className="brand-badge">Q</div>
          {!collapsed && <div>
            <p className="eyebrow">Merchant Console</p>
            <h1>QRPrint</h1>
          </div>}
        </div>

        <button className="collapse-toggle" onClick={() => setCollapsed(v => !v)}>
          {collapsed ? 'Open' : 'Collapse'}
        </button>

        <nav className="nav-list">
          {navItems.map(item => (
            <button
              key={item.key}
              className={activeNav === item.key ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveNav(item.key)}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="merchant-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2>{navItems.find(item => item.key === activeNav)?.label}</h2>
          </div>
          <div className="topbar-actions">
            <span className="chip success">Online</span>
            <button className="primary-button">+ New Order</button>
          </div>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <span>Queued</span>
            <strong>{summary.queued}</strong>
          </div>
          <div className="stat-card">
            <span>Printing</span>
            <strong>{summary.printing}</strong>
          </div>
          <div className="stat-card">
            <span>Verified</span>
            <strong>{summary.verified}</strong>
          </div>
        </section>

        <section className="table-card">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Pages</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {sampleJobs.map(job => (
                <tr key={job.id}>
                  <td>{job.id}</td>
                  <td>{job.customer}</td>
                  <td>{job.pages}</td>
                  <td><span className={`status ${job.status.toLowerCase()}`}>{job.status}</span></td>
                  <td>{job.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="payment-panel">
          <h3>Payment verification queue</h3>
          <div className="payment-grid">
            <div className="payment-card-box">
              <span>Pending</span>
              <strong>{paymentSummary.pending}</strong>
            </div>
            <div className="payment-card-box">
              <span>Verified</span>
              <strong>{paymentSummary.verified}</strong>
            </div>
            <div className="payment-card-box">
              <span>Failed</span>
              <strong>{paymentSummary.failed}</strong>
            </div>
          </div>

          <div className="verification-actions">
            <button className="primary-button small" onClick={handleCashVerify}>Verify cash code</button>
            <button className="primary-button small alt" onClick={handleUpiVerify}>Verify UPI payment</button>
          </div>
        </section>

        <section className="printer-panel">
          <h3>Detected printers</h3>
          <div className="printer-list">
            {printers.map(printer => (
              <div key={printer.id} className="printer-row">
                <span>{printer.name}</span>
                <span>{printer.type}</span>
                <span className="status online">Online</span>
              </div>
            ))}
          </div>
          <div className="verification-banner">
            <strong>Current verification code:</strong> {buildVerificationCode()}
          </div>

          <button className="primary-button small" onClick={handleAdvanceQueue}>Advance queued job</button>
        </section>

        <section className="queue-panel">
          <h3>Printing queue</h3>
          <div className="queue-list">
            {getPrintableQueue(queue).map(job => (
              <div key={job.id} className="queue-row">
                <div>
                  <strong>{job.customerName}</strong>
                  <small>{job.fileName}</small>
                </div>
                <span className={`status ${job.status}`}>{job.status}</span>
                <span>{job.verificationCode}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
