# AutoPrint — Workflows & State Machines

**Document ID**: 02-11  
**Category**: Design  

---

## 1. Job State Lifecycle Machine

AutoPrint uses five orthogonal lifecycle states to prevent ambiguity between financial authorization and physical printing:

```mermaid
stateDiagram-v2
    [*] --> UPLOADING: Customer submits files
    
    state PaymentDecision <<choice>>
    UPLOADING --> PaymentDecision: Confirmation
    PaymentDecision --> QUEUED: Online Paid (UPI/Card)
    PaymentDecision --> CASH_HELD: Cash Selected
    
    CASH_HELD --> QUEUED: Merchant clicks "CASH COLLECTED"
    CASH_HELD --> CANCELLED: Customer Abandons / Timeout
    
    state PrintEngine {
        QUEUED --> SPOOLING: Printer Online
        SPOOLING --> PRINTED: Spooler Reports Success
        SPOOLING --> FAILED: Paper Jam / Spooler Error
        FAILED --> QUEUED: Operator Confirms "NO PRINT RECEIVED" & Retries
    }
    
    PRINTED --> COLLECTED: Physical Handover Complete
    COLLECTED --> [*]: Original Upload Purged from Disk
```

---

## 2. Inactivity Lockout State Machine

The Merchant Dashboard protects sensitive sales figures and pricing controls with an automatic inactivity lock:

```mermaid
stateDiagram-v2
    [*] --> UNLOCKED: Merchant Logs In
    UNLOCKED --> UNLOCKED: Mouse / Keyboard Activity (Resets Timer)
    UNLOCKED --> LOCKED: 10 Minutes Inactivity
    
    state LOCKED {
        [*] --> BackgroundJobsProcessing
        note right of BackgroundJobsProcessing
            Background spooling, customer uploads,
            and online payments CONTINUE UNINTERRUPTED.
        end note
    }
    
    LOCKED --> UNLOCKED: Correct Password / PIN Entered
    LOCKED --> LOCKED: Incorrect Password
```

---

## 3. Modification Required Workflow

When a customer needs physical intervention or formatting help:

1. Customer checks **"MODIFICATION REQUIRED"** on upload.
2. Job is flagged with a blue badge in the merchant queue.
3. Automatic spooling is paused for this job.
4. Merchant clicks **"DOWNLOAD DOCUMENT"** to save the file locally.
5. Merchant edits the file in external software (Word/Excel/Photoshop).
6. Merchant prints using the system print dialog.
7. Merchant marks job as **"COLLECTED"** to finalize accounting.
