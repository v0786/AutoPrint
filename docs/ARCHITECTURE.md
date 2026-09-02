# AutoPrint Architecture Specification

```mermaid
flowchart TD
    subgraph Public Internet (Customer Mobile Network)
        Phone["Customer Mobile Browser (4G / 5G / Foreign Wi-Fi)"]
    end

    subgraph PageKite Cloud Service
        PKCloud["PageKite Cloud Relay (https://autoprint.pagekite.me)"]
    end

    subgraph Merchant Windows Workstation
        subgraph Public Ingress (Port 7000)
            CustWeb["Customer Web Application (Port 7000)"]
            CustProxy["Vite / Express Internal Reverse Proxy (/api)"]
        end

        subgraph Private Localhost Services (Protected)
            Backend["AutoPrint Backend REST Engine (Port 5000)"]
            TunnelMgr["PageKite Tunnel Connector & Health Monitor"]
            QREngine["Dynamic QR Code Generator"]
            MerchDash["Merchant Dashboard (Port 6000 - Local Only)"]
            WinSpooler["Windows Print Spooler (winspool)"]
            SQLiteDB[("SQLite Database (autoprint.db WAL)")]
            DatastoreFS["Persistent Datastore Hierarchy (datastore/)"]
        end
    end

    Phone -->|1. Scans Dynamic QR & Opens URL| PKCloud
    PKCloud -->|2. Encrypted Tunnel Forwarding| CustWeb
    CustWeb -->|3. UI Interaction & Document Upload| CustProxy
    CustProxy -->|4. Internal Proxy to localhost:5000| Backend

    MerchDash -->|Local HTTP http://localhost:6000| Backend
    Backend --> SQLiteDB
    Backend --> DatastoreFS
    Backend --> QREngine
    Backend --> WinSpooler
    Backend --> TunnelMgr
    TunnelMgr -.->|Maintains Outbound Tunnel| PKCloud
```

---

## 1. Core Principles
* **Merchant PC is Central Station**: AutoPrint runs locally on the merchant's Windows PC.
* **Customer Mobile Access via PageKite**: Customers connect via `https://autoprint.pagekite.me` (or configured custom PageKite domain).
* **Zero Direct Backend Exposure**: Customer Web on port `7000` proxies `/api` calls internally to Backend on port `5000`. The merchant dashboard (`:6000`) and SQLite database are never exposed to the public internet.
* **Dynamic QR Generation**: QR codes dynamically encode the public customer URL and are displayed on the merchant dashboard with one-click counter standee printing.
* **Persistent SQLite Datastore**: Zero data loss across process termination or power outages.
