# AutoPrint — PageKite Ingress Integration

**Document ID**: 04-25  
**Category**: Integration  

---

## 1. Public Kiosk Exposure via Reverse Tunneling

AutoPrint enables walk-in customers to access the Customer Kiosk from their mobile phones without requiring complex router port forwarding, DDNS, or static public IPs.

This is achieved via an integrated **PageKite reverse-proxy tunnel**:
* The merchant registers a free or commercial Kite name at `pagekite.net` (e.g. `myshop.pagekite.me`).
* AutoPrint securely runs the PageKite Python connector (`tools/pagekite/pagekite.py`) as a supervised child process.
* The connector establishes an outbound encrypted tunnel connecting `myshop.pagekite.me` directly to the local customer kiosk port `7000`.

---

## 2. Dynamic Shop QR Code Generation

During setup and on the Merchant Dashboard:
1. AutoPrint checks if PageKite is enabled:
   * If **Enabled**: Generates Shop QR pointing to `https://<kite-name>.pagekite.me`.
   * If **Disabled (Local Wi-Fi Mode)**: Dynamically discovers the shop's local IPv4 address via `os.networkInterfaces()` and generates Shop QR pointing to `http://<LAN_IP>:7000`.
2. The merchant prints the counter standee QR code with one click.
3. Customers scan the QR code to open the kiosk immediately on their mobile browser.

---

## 3. Reconnect & Resilience Strategy

1. **Keepalive Heartbeats**: The PageKite connector monitors socket health every 25 seconds.
2. **Exponential Backoff Reconnection**: If the shop's broadband drops, AutoPrint attempts automatic reconnects at intervals of 5s, 10s, 30s, and 60s.
3. **Graceful Degradation**: If external internet is down, AutoPrint automatically falls back to local Wi-Fi ingress (`http://<LAN_IP>:7000`), ensuring customer printing continues uninterrupted.
