import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface PublicConfig {
  customerUrl: string;
  qrCodeUrl: string;
  qrCodeDataUrl: string | null;
  pagekite: {
    status: 'DISABLED' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
    publicUrl: string | null;
    subdomain: string;
    domain: string;
    error: string | null;
  };
  ports: {
    backend: number;
    merchant: number;
    customer: number;
  };
}

export const CustomerAccessBanner: React.FC = () => {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [subdomainInput, setSubdomainInput] = useState('');
  const [enableTunnel, setEnableTunnel] = useState(true);

  const fetchConfig = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/config/public');
      if (res.ok) {
        const json = await res.json();
        setConfig(json.data);
        if (json.data?.pagekite?.subdomain) {
          setSubdomainInput(json.data.pagekite.subdomain);
        }
      }
    } catch (e) {
      console.warn('[CONFIG] Failed to fetch public config:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    const interval = setInterval(fetchConfig, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyUrl = () => {
    if (config?.customerUrl) {
      navigator.clipboard.writeText(config.customerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrintStandee = () => {
    if (!config?.customerUrl) return;
    const printWin = window.open('', '_blank', 'width=650,height=800');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AutoPrint Kiosk Standee</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; text-align: center; padding: 40px; color: #002b49; }
            .card { border: 3px solid #002b49; border-radius: 24px; padding: 40px; max-width: 480px; margin: 0 auto; }
            h1 { font-size: 32px; margin: 0 0 8px 0; color: #002b49; }
            p { font-size: 16px; color: #555; margin-bottom: 24px; }
            .qr-wrap { background: #f4f8fa; padding: 24px; border-radius: 16px; display: inline-block; }
            .url { font-family: monospace; font-size: 16px; font-weight: bold; margin-top: 20px; color: #0066cc; word-break: break-all; }
            .footer { margin-top: 30px; font-size: 13px; color: #888; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>AutoPrint Self-Service Kiosk</h1>
            <p>Scan to upload your document, choose print specs, and get your 8-digit verification code</p>
            <div class="qr-wrap">
              <img src="http://localhost:5000/api/config/qr-code" width="280" height="280" alt="Customer QR Code" />
            </div>
            <div class="url">${config.customerUrl}</div>
            <div class="footer">Works with Mobile Data (4G/5G) or Any Wi-Fi &bull; Instant Verification</div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleSaveTunnel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/config/pagekite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: subdomainInput.trim(),
          enabled: enableTunnel,
        }),
      });
      if (res.ok) {
        setShowConfigModal(false);
        fetchConfig();
      }
    } catch (err) {
      console.error('Failed to update PageKite config:', err);
    }
  };

  const customerUrl = config?.customerUrl || 'http://localhost:7000';
  const isTunnelActive = config?.pagekite?.status === 'CONNECTED';
  const isTunnelConnecting = config?.pagekite?.status === 'CONNECTING';

  return (
    <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-sky-800/60 rounded-2xl p-5 mb-6 text-white shadow-xl">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* QR Code Preview */}
        <div className="flex items-center gap-5">
          <div className="bg-white p-3 rounded-xl shadow-md border-2 border-sky-400/40 flex-shrink-0">
            <QRCodeSVG
              value={customerUrl}
              size={100}
              level="H"
              fgColor="#002B49"
              bgColor="#FFFFFF"
            />
          </div>

          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-xs uppercase tracking-wider font-bold text-sky-400 bg-sky-950/80 px-2.5 py-0.5 rounded-full border border-sky-700">
                Customer Mobile Portal
              </span>
              {isTunnelActive ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-600 px-2.5 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  PageKite Online
                </span>
              ) : isTunnelConnecting ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 bg-amber-950/80 border border-amber-600 px-2.5 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  Connecting Tunnel
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-600 px-2.5 py-0.5 rounded-full">
                  LAN / Local Only
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight">
              Live Customer QR Standee & Access Ingress
            </h3>
            <p className="text-xs text-sky-200/80 mt-0.5 max-w-md">
              Customers scan this QR from their phones (using mobile data or any Wi-Fi) to upload documents and generate verification codes.
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              <code className="text-xs font-mono bg-black/40 border border-sky-900 text-sky-300 px-2.5 py-1 rounded-md selection:bg-sky-600 select-all">
                {customerUrl}
              </code>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap lg:flex-col sm:flex-row items-stretch gap-2.5 w-full lg:w-auto">
          <button
            onClick={handleCopyUrl}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
              copied
                ? 'bg-emerald-600 text-white shadow-emerald-900/50'
                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/50'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Copied to Clipboard!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                Copy Customer Link
              </>
            )}
          </button>

          <button
            onClick={handlePrintStandee}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-sky-200 border border-sky-500/30 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            Print Counter Standee
          </button>

          <button
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            Tunnel Settings
          </button>
        </div>
      </div>

      {/* PageKite Tunnel Settings Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-sky-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <span className="text-sky-400">⚡</span> PageKite Tunnel Configuration
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Configure your public PageKite domain so customers can access the kiosk remotely without router configuration.
            </p>

            <form onSubmit={handleSaveTunnel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  PageKite Subdomain Name
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={subdomainInput}
                    onChange={(e) => setSubdomainInput(e.target.value)}
                    placeholder="e.g. quickprint-delhi"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-l-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                    required
                  />
                  <span className="bg-slate-800 border border-l-0 border-slate-700 rounded-r-xl px-3 py-2 text-xs text-slate-400 font-mono">
                    .pagekite.me
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  id="enableTunnelCheck"
                  checked={enableTunnel}
                  onChange={(e) => setEnableTunnel(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded bg-slate-900 border-slate-700 focus:ring-sky-500"
                />
                <label htmlFor="enableTunnelCheck" className="text-xs text-slate-300 font-medium">
                  Enable Public PageKite Ingress for Customer Web
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-900/40"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
